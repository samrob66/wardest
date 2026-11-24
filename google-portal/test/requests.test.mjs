import { describe, it, expect } from 'vitest';
import { loadPortal, LEADERS, MORE_BISHOPRIC, addLeader } from './harness.mjs';
import { formSubmitEvent } from './fakes.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const gp0 = loadPortal();

describe('requestReaders', () => {
  const moving = { Id: 'moving', 'Owning organizations': 'Elders Quorum, Relief Society', Coordinators: 'Helper.Coord@example.test, sister.example@example.test', Confidential: false };
  const christmas = { Id: 'christmas', 'Owning organizations': 'Bishopric', Coordinators: 'helper.coord@example.test', Confidential: true };
  it('Moving: Elders Quorum and Relief Society leaders plus coordinators', () => {
    expect(plain(gp0.requestReaders(moving, LEADERS)).sort()).toEqual(
      ['helper.coord@example.test', 'sister.example@example.test', 'brother.sample@example.test', 'sister.coordinator@example.test'].sort()
    );
  });
  it('Christmas: the whole bishopric (Bishopric ticked) and its coordinators, no other ward council member', () => {
    const readers = plain(gp0.requestReaders(christmas, [...LEADERS, ...MORE_BISHOPRIC])).sort();
    expect(readers).toEqual(
      [
        'bishop.example@example.test',
        'brother.counselor@example.test',
        'brother.second@example.test',
        'brother.clerk@example.test',
        'brother.recorder@example.test',
        'helper.coord@example.test',
      ].sort()
    );
    // The Elders Quorum and Relief Society presidents sit on the ward council but are not bishopric.
    expect(readers).not.toContain('brother.sample@example.test');
    expect(readers).not.toContain('sister.example@example.test');
  });
  it('Christmas: a coordinator who is also in the bishopric is listed once', () => {
    const c = { ...christmas, Coordinators: 'Bishop.Example@example.test, helper.coord@example.test' };
    expect(plain(gp0.requestReaders(c, LEADERS)).filter((e) => e === 'bishop.example@example.test')).toHaveLength(1);
  });
});

describe('bishopricEmails', () => {
  it('is every row with Bishopric ticked, normalized and de-duplicated; Calling text does not matter', () => {
    const leaders = [
      ...LEADERS,
      ...MORE_BISHOPRIC,
      // Calling says Bishop, but the box is not ticked.
      { Name: 'Not Ticked', Email: 'not.ticked@example.test', Calling: 'Bishop', Organization: 'Bishopric', 'Ward council': true },
      // A duplicate row for a bishopric member.
      { Name: 'Bishop Again', Email: ' BISHOP.example@example.test', Calling: 'Bishop', Bishopric: true },
      { Name: 'No Address', Email: 'not an email', Bishopric: true },
    ];
    expect(plain(gp0.bishopricEmails(leaders))).toEqual([
      'bishop.example@example.test',
      'brother.counselor@example.test',
      'brother.clerk@example.test',
      'brother.second@example.test',
      'brother.recorder@example.test',
    ]);
  });
});

describe('closing, purge and rotation rules', () => {
  const R = (over) => ({ 'Request id': 'r', Status: 'New', 'Closed on': '', ...over });
  it('stamps Done/Declined rows and clears reopened ones', () => {
    const rows = [R({ 'Request id': 'a', Status: 'Done' }), R({ 'Request id': 'b', Status: 'In progress', 'Closed on': '2026-11-20' }), R({ 'Request id': 'c', Status: 'Declined', 'Closed on': '2026-11-01' }), R({ 'Request id': 'd' })];
    const s = gp0.stampClosed(rows, '2026-12-01');
    expect(s.map((x) => [x.row['Request id'], x.closedOn])).toEqual([['a', '2026-12-01'], ['b', '']]);
  });
  it('purges 30 days after closing, not 29', () => {
    const rows = [R({ 'Request id': 'a', Status: 'Done', 'Closed on': '2026-11-01' }), R({ 'Request id': 'b', Status: 'Declined', 'Closed on': '2026-11-02' }), R({ 'Request id': 'c' })];
    expect(gp0.rowsToPurge(rows, '2026-12-01').map((r) => r['Request id'])).toEqual(['a']);
    expect(gp0.rowsToCarry(rows, '2026-12-01').map((r) => r['Request id'])).toEqual(['b', 'c']);
  });
  it('rotates when the month changes', () => {
    expect(gp0.needsRotation('2026-11', '2026-12-01 03:00')).toBe(true);
    expect(gp0.needsRotation('2026-12', '2026-12-31 03:00')).toBe(false);
    expect(gp0.needsRotation('', '2026-12-31')).toBe(false);
  });
  it('sharingDiff adds, changes, removes and never touches the owner', () => {
    const d = plain(
      gp0.sharingDiff(
        { 'owner@example.test': 'owner', 'a@example.test': 'reader', 'stale@example.test': 'reader', 'same@example.test': 'writer' },
        { 'A@example.test': 'writer', 'new@example.test': 'reader', 'same@example.test': 'writer', 'owner@example.test': 'reader' },
        'owner@example.test'
      )
    );
    expect(d).toEqual({ add: [{ email: 'new@example.test', role: 'reader' }], change: [{ email: 'a@example.test', role: 'writer' }], remove: ['stale@example.test'] });
  });
  it('administrators are the bishop and the executive secretary', () => {
    expect(plain(gp0.adminEmails(LEADERS))).toEqual(['bishop.example@example.test', 'brother.clerk@example.test']);
  });
});

function setupForms() {
  const gp = loadPortal({ seed: true });
  const portal = gp.DriveApp.createFolder('Service Portal');
  gp.fakes.props.set('PORTAL_FOLDER_ID', portal.getId());
  const cats = gp.serviceTab_('Categories');
  cats.update(cats.find('Id', 'moving'), { Coordinators: 'helper.coord@example.test' });
  gp.gpBegin_();
  gp.buildRequestForms_(gp.settings_(), gp.serviceTab_('Categories').rows());
  return { gp, portal };
}
// The System Sheet in use (Set up makes a new one when SYSTEM_ID is cleared).
const filesOf = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID')).rowsOf('Request files');

describe('buildRequestForms_', () => {
  it('makes one form, folder and month sheet per request category, once', () => {
    const { gp } = setupForms();
    expect(filesOf(gp).map((f) => f['Category id'])).toEqual(['moving', 'christmas', 'other']);
    gp.buildRequestForms_(gp.settings_(), gp.serviceTab_('Categories').rows());
    expect(filesOf(gp)).toHaveLength(3);
    expect(gp.fakes.forms.size).toBe(3);
    const f = filesOf(gp)[0];
    expect(f.Month).toBe('2026-12');
    expect(gp.fakes.drive.folders.get(f['Folder id']).name).toBe('Requests – Moving help');
    const ss = gp.fakes.spreadsheets.get(f['Sheet id']);
    expect(ss.getName()).toBe('Requests – Moving help – 2026-12');
    expect(ss.getSheetByName('Requests').raw()[0]).toEqual(gp.REQUEST_HEADERS);
    expect(gp.fakes.drive.files.get(f['Sheet id']).parents).toEqual([f['Folder id']]);
  });

  it('asks only the minimal questions and says who sees the answers', () => {
    const { gp } = setupForms();
    const [moving, christmas, other] = filesOf(gp).map((f) => gp.fakes.forms.get(f['Form id']));
    expect(moving.title).toBe('Moving help — Riverbend 1st Ward (example)');
    expect(moving.collectEmail).toBe(false);
    expect(moving.items.map((i) => i.title)).toEqual(['Name', 'Phone or email', 'Moving in or out', 'Date', 'Note']);
    expect(christmas.items.map((i) => i.title)).toEqual(['Name', 'Phone or email', 'For', 'Note']);
    expect(christmas.items[2].choices).toEqual(['My family', 'Another family']);
    expect(other.items.map((i) => i.title)).toEqual(['Name', 'Phone or email', 'Note']);
    expect(moving.items[0].required).toBe(true);
    expect(moving.items[4].required).toBe(false);
    expect(moving.description).toContain('Only the Elders Quorum and Relief Society leaders see this request.');
    expect(christmas.description).toContain('Only the bishopric and the people they name see this request.');
    expect(christmas.description).not.toContain('the bishop and the people he names');
    expect(moving.description).toContain('Nothing is emailed back to you; a leader will contact you.');
    expect(moving.description).toContain('This form is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.');
    expect(moving.description).toContain('Contact: help@riverbend.example');
    expect(moving.confirmation).toBe('Thank you. A leader will contact you.');
  });
});

describe('Set up refreshes request forms', () => {
  it('run twice on forms with the old wording: new descriptions and titles, no form duplicated', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    const forms = () => filesOf(gp).map((f) => gp.fakes.forms.get(f['Form id']));
    // As the phase 1 code left them.
    const old = ['Only the bishop and the people he names see this request.', 'Nothing is emailed back to you; a leader will contact you.'].join('\n');
    forms()[1].setDescription(old);
    forms()[2].setDescription(old);
    forms()[0].setTitle('Moving help — Old Ward Name');
    gp.gpMenuSetUp();
    gp.gpMenuSetUp();
    expect(gp.fakes.forms.size).toBe(3);
    expect(filesOf(gp)).toHaveLength(3);
    const [moving, christmas, other] = forms();
    for (const f of [christmas, other]) {
      expect(f.description).toContain('Only the bishopric and the people they name see this request.');
      expect(f.description).not.toContain('he names');
    }
    expect(moving.description).toContain('Only the Elders Quorum and Relief Society leaders see this request.');
    expect(moving.title).toBe('Moving help — Riverbend 1st Ward (example)');
  });
});

describe('gpOnRequestSubmit', () => {
  it('files the answer, deletes it from the form and sends detail-free notices', () => {
    const { gp } = setupForms();
    const f = filesOf(gp)[0];
    const form = gp.fakes.forms.get(f['Form id']);
    gp.fakes.mail.sent.length = 0;
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: '=1+1', 'Phone or email': '555-0100', 'Moving in or out': 'Moving in', Date: '2026-12-10', Note: 'Two bedrooms, piano' }, 'resp-9'));
    const rows = gp.fakes.spreadsheets.get(f['Sheet id']).rowsOf('Requests');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Kind: 'Moving help', Name: "'=1+1", 'Phone or email': '555-0100', Moving: 'Moving in', 'Moving date': '2026-12-10', Note: 'Two bedrooms, piano', Status: 'New', Received: '2026-12-01 10:00' });
    expect(form.deletedResponses).toEqual(['resp-9']);
    const to = gp.fakes.mail.sent.map((m) => m.to).sort();
    expect(to).toEqual(['brother.sample@example.test', 'helper.coord@example.test', 'sister.coordinator@example.test', 'sister.example@example.test']);
    for (const m of gp.fakes.mail.sent) {
      for (const bad of ['=1+1', '555-0100', 'Two bedrooms', 'piano', '2026-12-10', 'Moving in']) {
        expect(m.body + m.htmlBody + m.subject).not.toContain(bad);
      }
      expect(m.subject).toBe('New Moving help request');
    }
  });

  it('a Christmas request notice reaches each bishopric member and coordinator once, and nobody else', () => {
    const { gp } = setupForms();
    for (const l of MORE_BISHOPRIC) addLeader(gp, l);
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'christmas'), { Coordinators: 'brother.counselor@example.test, helper.coord@example.test' });
    gp.gpBegin_();
    const f = filesOf(gp)[1];
    const form = gp.fakes.forms.get(f['Form id']);
    gp.fakes.mail.sent.length = 0;
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'Sister Private', 'Phone or email': 'private@example.test', For: 'My family', Note: 'secret need' }));
    const to = gp.fakes.mail.sent.map((m) => m.to).sort();
    expect(to).toEqual(
      [
        'bishop.example@example.test',
        'brother.counselor@example.test',
        'brother.clerk@example.test',
        'brother.second@example.test',
        'brother.recorder@example.test',
        'helper.coord@example.test',
      ].sort()
    );
    for (const m of gp.fakes.mail.sent) expect(m.subject).toBe('New Christmas help request');
    expect(JSON.stringify(gp.fakes.mail.sent)).not.toContain('secret need');
  });

  it('on failure keeps the answer in the form, logs without request text and alerts the administrators', () => {
    const { gp } = setupForms();
    const f = filesOf(gp)[1];
    const form = gp.fakes.forms.get(f['Form id']);
    gp.fakes.spreadsheets.delete(f['Sheet id']);
    gp.fakes.mail.sent.length = 0;
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'Sister Private', 'Phone or email': 'private@example.test', For: 'My family', Note: 'secret need' }));
    expect(form.deletedResponses).toEqual([]);
    const log = JSON.stringify(gp.fakes.system.rowsOf('Log'));
    expect(log).toContain('request error');
    expect(log).not.toContain('Sister Private');
    expect(log).not.toContain('secret need');
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(['bishop.example@example.test', 'brother.clerk@example.test']);
    expect(JSON.stringify(gp.fakes.mail.sent)).not.toContain('secret need');
  });
});

describe('dailyRequests_', () => {
  function withRows(gp) {
    const f = filesOf(gp)[0];
    const t = gp.table_(gp.fakes.spreadsheets.get(f['Sheet id']).getSheetByName('Requests'));
    t.appendMany([
      { 'Request id': 'old', Status: 'Done', 'Closed on': '2026-10-30', Name: 'A' },
      { 'Request id': 'recent', Status: 'Done', 'Closed on': '2026-11-20', Name: 'B' },
      { 'Request id': 'open', Status: 'In progress', Name: 'C' },
      { 'Request id': 'justdone', Status: 'Declined', Name: 'D' },
    ]);
    return f;
  }

  it('stamps and purges without rotating in the same month', () => {
    const { gp } = setupForms();
    const f = withRows(gp);
    gp.fakes.setNow('2026-12-15 02:00');
    gp.dailyRequests_();
    const rows = gp.fakes.spreadsheets.get(f['Sheet id']).rowsOf('Requests');
    expect(rows.map((r) => [r['Request id'], r['Closed on']])).toEqual([['recent', '2026-11-20'], ['open', ''], ['justdone', '2026-12-15']]);
    expect(gp.fakes.drive.removed).toEqual([]);
  });

  it('on the 1st makes a new month sheet, carries open rows and permanently deletes the old file', () => {
    const { gp } = setupForms();
    const f = withRows(gp);
    gp.fakes.setNow('2027-01-01 02:00');
    gp.dailyRequests_();
    const now = filesOf(gp)[0];
    expect(now.Month).toBe('2027-01');
    expect(now['Sheet id']).not.toBe(f['Sheet id']);
    // Every request file rotates; the old Moving file is among those permanently deleted.
    expect(gp.fakes.drive.removed).toHaveLength(3);
    expect(gp.fakes.drive.removed).toContain(f['Sheet id']);
    const ss = gp.fakes.spreadsheets.get(now['Sheet id']);
    expect(ss.getName()).toBe('Requests – Moving help – 2027-01');
    // 'recent' closed 2026-11-20 is past 30 days on 2027-01-01, so it is purged, not carried.
    expect(ss.rowsOf('Requests').map((r) => r['Request id'])).toEqual(['open', 'justdone']);
    expect(gp.fakes.drive.files.get(now['Sheet id']).parents).toEqual([f['Folder id']]);
  });

  it('trashes the old files and sends one alert when permanent deletion fails', () => {
    const { gp } = setupForms();
    const f = withRows(gp);
    gp.fakes.state.driveRemoveFails = true;
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setNow('2027-01-01 02:00');
    gp.dailyRequests_();
    expect(gp.fakes.drive.files.get(f['Sheet id']).trashed).toBe(true);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(['bishop.example@example.test', 'brother.clerk@example.test']);
  });
});
