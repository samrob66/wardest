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
    expect(filesOf(gp).map((f) => f['Category id'])).toEqual(['moving', 'christmas', 'other', 'christmas-giving']);
    gp.buildRequestForms_(gp.settings_(), gp.serviceTab_('Categories').rows());
    expect(filesOf(gp)).toHaveLength(4);
    expect(gp.fakes.forms.size).toBe(4);
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
    expect(christmas.description).toContain('Only the bishopric and the Christmas gift coordinators see this request.');
    expect(other.description).toContain('Only the bishopric and the people they name see this request.');
    for (const f of [christmas, other]) expect(f.description).not.toContain('the bishop and the people he names');
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
    expect(gp.fakes.forms.size).toBe(4);
    expect(filesOf(gp)).toHaveLength(4);
    const [moving, christmas, other] = forms();
    expect(christmas.description).toContain('Only the bishopric and the Christmas gift coordinators see this request.');
    expect(other.description).toContain('Only the bishopric and the people they name see this request.');
    for (const f of [christmas, other]) expect(f.description).not.toContain('he names');
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
    expect(gp.fakes.drive.removed).toHaveLength(4);
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

// ---------- 1.1 addition (decision 15): Christmas gift coordinators and Notify ----------

/** An invented couple called to the Christmas gift calling; not in the bishopric. */
const COUPLE = ['brother.example.gifts@example.test', 'sister.example.gifts@example.test'];
const BISHOPRIC5 = [
  'bishop.example@example.test',
  'brother.counselor@example.test',
  'brother.clerk@example.test',
  'brother.second@example.test',
  'brother.recorder@example.test',
];

/** Set up and Sync sharing on a ward with a full bishopric and the couple as Christmas coordinators. */
function wardWithCouple({ coupleLeaderRow = false } = {}) {
  const gp = loadPortal({ seed: true });
  gp.fakes.props.delete('SYSTEM_ID');
  for (const l of MORE_BISHOPRIC) addLeader(gp, l);
  if (coupleLeaderRow) {
    addLeader(gp, { Name: 'Brother Example (gifts)', Email: COUPLE[0], Calling: 'Christmas gift coordinator', Organization: 'Bishopric', Coordinator: true });
    addLeader(gp, { Name: 'Sister Example (gifts)', Email: COUPLE[1], Calling: 'Christmas gift coordinator', Organization: 'Bishopric', Coordinator: true });
  }
  gp.gpMenuSetUp();
  const cats = gp.serviceTab_('Categories');
  cats.update(cats.find('Id', 'christmas'), { Coordinators: COUPLE.join(', ') });
  gp.gpBegin_();
  gp.gpMenuSyncSharing();
  gp.fakes.mail.sent.length = 0;
  return gp;
}
const permsOf = (gp, id) => Object.fromEntries([...gp.fakes.drive.permsOf(id).values()].map((p) => [p.emailAddress, p.role]));
const fileFor = (gp, catId) => filesOf(gp).find((f) => f['Category id'] === catId);
function submit(gp, catId, answers) {
  const form = gp.fakes.forms.get(fileFor(gp, catId)['Form id']);
  gp.gpOnRequestSubmit(formSubmitEvent(form, answers));
}

describe('Christmas gift coordinators (decision 15)', () => {
  it('a couple listed only as Christmas coordinators gets the Christmas folder and notices, and nothing else', () => {
    const gp = wardWithCouple();
    const serviceSheet = permsOf(gp, gp.fakes.spreadsheet.getId());
    const christmas = permsOf(gp, fileFor(gp, 'christmas')['Folder id']);
    const other = permsOf(gp, fileFor(gp, 'other')['Folder id']);
    const moving = permsOf(gp, fileFor(gp, 'moving')['Folder id']);
    for (const e of COUPLE) {
      expect(christmas[e]).toBe('writer');
      expect(serviceSheet[e]).toBeUndefined();
      expect(other[e]).toBeUndefined();
      expect(moving[e]).toBeUndefined();
    }
    // The Christmas folder is exactly the bishopric and the couple.
    expect(Object.keys(christmas).sort()).toEqual(['ward.account@example.test', ...BISHOPRIC5, ...COUPLE].sort());

    submit(gp, 'christmas', { Name: 'Sister Private', 'Phone or email': 'private@example.test', For: 'Another family', Note: 'gift need' });
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual([...BISHOPRIC5, ...COUPLE].sort());
    expect(JSON.stringify(gp.fakes.mail.sent)).not.toContain('gift need');

    gp.fakes.mail.sent.length = 0;
    submit(gp, 'other', { Name: 'Brother Private', 'Phone or email': 'p2@example.test', Note: 'other need' });
    submit(gp, 'moving', { Name: 'Sister Mover', 'Phone or email': 'p3@example.test', 'Moving in or out': 'Moving in' });
    const to = gp.fakes.mail.sent.map((m) => m.to);
    expect(to).toContain('bishop.example@example.test');
    expect(to).toContain('sister.example@example.test');
    for (const e of COUPLE) expect(to).not.toContain(e);
  });

  it('a Leaders row with only Coordinator ticked still gives the couple no Service Sheet access', () => {
    const gp = wardWithCouple({ coupleLeaderRow: true });
    const serviceSheet = permsOf(gp, gp.fakes.spreadsheet.getId());
    for (const e of COUPLE) expect(serviceSheet[e]).toBeUndefined();
    const christmas = permsOf(gp, fileFor(gp, 'christmas')['Folder id']);
    for (const e of COUPLE) expect(christmas[e]).toBe('writer');
  });
});

describe('Notify (decision 15)', () => {
  const other = { Id: 'other', Coordinators: '', Confidential: true, Notify: 'Bishop' };
  it('requestNotifyList: Bishop means Calling Bishop; limited to readers; outsiders and junk dropped', () => {
    const leaders = [...LEADERS, ...MORE_BISHOPRIC];
    expect(plain(gp0.requestNotifyList(other, leaders))).toEqual({ to: ['bishop.example@example.test'], dropped: [] });
    expect(plain(gp0.requestNotifyList({ ...other, Notify: '' }, leaders)).to.sort()).toEqual([...BISHOPRIC5].sort());
    const odd = plain(gp0.requestNotifyList({ ...other, Notify: 'bishop, Brother.Second@example.test, outsider@example.test, not an address' }, leaders));
    expect(odd.to).toEqual(['bishop.example@example.test', 'brother.second@example.test']);
    expect(odd.dropped).toEqual(['outsider@example.test', 'not an address']);
    // The bishop's Bishopric box is not ticked: he can't open the folder, so no notice goes to
    // him, and with nobody left the notice falls back to every reader.
    const unticked = leaders.map((l) => (l.Calling === 'Bishop' ? { ...l, Bishopric: false } : l));
    const fb = plain(gp0.requestNotifyList(other, unticked));
    expect(fb.dropped).toEqual(['bishop.example@example.test']);
    expect(fb.to.sort()).toEqual(BISHOPRIC5.filter((e) => e !== 'bishop.example@example.test').sort());
  });

  it('an Other notice reaches the bishop only, while the Other folder still goes to the whole bishopric', () => {
    const gp = wardWithCouple();
    expect(gp.fakes.spreadsheet.rowsOf('Categories').find((c) => c.Id === 'other').Notify).toBe('Bishop');
    expect(Object.keys(permsOf(gp, fileFor(gp, 'other')['Folder id'])).sort()).toEqual(['ward.account@example.test', ...BISHOPRIC5].sort());
    submit(gp, 'other', { Name: 'Brother Private', 'Phone or email': 'p2@example.test', Note: 'other need' });
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['bishop.example@example.test']);
  });

  it('blank Notify keeps today: every reader gets the notice, and Set up does not put Bishop back', () => {
    const gp = wardWithCouple();
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'other'), { Notify: '' });
    gp.gpBegin_();
    submit(gp, 'other', { Name: 'Brother Private', 'Phone or email': 'p2@example.test' });
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual([...BISHOPRIC5].sort());
    gp.gpMenuSetUp();
    expect(gp.fakes.spreadsheet.rowsOf('Categories').find((c) => c.Id === 'other').Notify).toBe('');
  });

  it('Notify Bishop with no Leaders row whose Calling is Bishop: Sync sharing and Check health say PROBLEM', () => {
    const gp = wardWithCouple();
    gp.gpMenuSyncSharing();
    expect(gp.fakes.alerts.at(-1)).not.toContain('Calling Bishop');
    expect(gp.gpMenuCheckHealth().filter((l) => l.includes('Calling Bishop'))).toEqual([]);
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'bishop.example@example.test'), { Calling: 'Bishop (released)' });
    gp.gpBegin_();
    gp.gpMenuSyncSharing();
    expect(gp.fakes.alerts.at(-1)).toContain('Other help Notify says Bishop, but no Leaders row has Calling Bishop');
    const health = gp.gpMenuCheckHealth().filter((l) => l.includes('Calling Bishop'));
    expect(health).toHaveLength(1);
    expect(health[0]).toMatch(/^PROBLEM /);
    // Case doesn't matter.
    t.update(t.find('Email', 'bishop.example@example.test'), { Calling: '  bishop ' });
    gp.gpBegin_();
    expect(gp.gpMenuCheckHealth().filter((l) => l.includes('Calling Bishop'))).toEqual([]);
  });

  it('an outsider email in Notify gets nothing and is logged', () => {
    const gp = wardWithCouple();
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'other'), { Notify: 'Bishop, outsider@example.test' });
    gp.gpBegin_();
    submit(gp, 'other', { Name: 'Brother Private', 'Phone or email': 'p2@example.test' });
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['bishop.example@example.test']);
    const sys = gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
    const line = sys.rowsOf('Log').find((l) => l.What === 'request notice dropped');
    expect(line.Detail).toContain('outsider@example.test');
    // Sync sharing points out the entry too, so it can be fixed before a request comes in.
    gp.gpMenuSyncSharing();
    expect(gp.fakes.alerts.at(-1)).toContain('Other help');
    expect(gp.fakes.alerts.at(-1)).toContain('outsider@example.test');
    expect(permsOf(gp, fileFor(gp, 'other')['Folder id'])['outsider@example.test']).toBeUndefined();
  });

  it('Set up adds the Notify column to an older sheet and seeds Other with Bishop once, never over a typed value', () => {
    // A Categories tab from before 1.1: no Notify column, Other row already there.
    const gp = loadPortal({ seed: true });
    const sh = gp.fakes.spreadsheet.getSheetByName('Categories');
    const col = sh.raw()[0].indexOf('Notify') + 1;
    for (let r = 1; r <= sh.getLastRow(); r++) sh.getRange(r, col).setValue('');
    gp.fakes.props.delete('NOTIFY_SEEDED');
    gp.gpBegin_();
    expect(gp.table_(sh).headers).not.toContain('Notify');
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    const rows = gp.fakes.spreadsheet.rowsOf('Categories');
    expect(rows.find((c) => c.Id === 'other').Notify).toBe('Bishop');
    expect(rows.find((c) => c.Id === 'christmas').Notify).toBe('');
    expect(rows.find((c) => c.Id === 'moving').Notify).toBe('');

    // A value Sam typed before the seeding ran is kept.
    const gp2 = loadPortal({ seed: true });
    const t = gp2.serviceTab_('Categories');
    t.update(t.find('Id', 'other'), { Notify: 'brother.counselor@example.test' });
    gp2.fakes.props.delete('NOTIFY_SEEDED');
    gp2.gpEnsureTabs_(gp2.fakes.spreadsheet);
    expect(gp2.fakes.spreadsheet.rowsOf('Categories').find((c) => c.Id === 'other').Notify).toBe('brother.counselor@example.test');
  });
});

// ---------- 1.1 addition (decision 16): the private Christmas giving offer form ----------

describe('Christmas giving offers (decision 16)', () => {
  const GIVE = 'What would you like to give?';

  it('the giving form gets its four questions, its own wording, and its title', () => {
    const gp = wardWithCouple();
    const form = gp.fakes.forms.get(fileFor(gp, 'christmas-giving')['Form id']);
    expect(form.title).toBe('Christmas giving offers — Riverbend 1st Ward (example)');
    expect(form.items.map((i) => [i.title, i.type, i.required])).toEqual([
      ['Name', 'TEXT', true],
      ['Phone or email', 'TEXT', true],
      [GIVE, 'PARAGRAPH_TEXT', true],
      ['Note', 'PARAGRAPH_TEXT', false],
    ]);
    expect(form.items[2].help).toMatch(/families or children/);
    expect(JSON.stringify(form.items[2].validation)).toContain('300');
    expect(form.description).toContain(
      'Thank you for offering to help with Christmas gifts. Only the bishopric and the Christmas gift coordinators see this. A coordinator will contact you. Nothing is emailed back to you.'
    );
    expect(form.description).toContain('This form is an independent tool made by Church members.');
    expect(form.description).toContain('Contact: help@riverbend.example');
    expect(form.confirmation).toBe('Thank you. A coordinator will contact you.');
    expect(form.collectEmail).toBe(false);
  });

  it('readers are the bishopric and the coordinators only', () => {
    const gp = wardWithCouple();
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'christmas-giving'), { Coordinators: COUPLE.join(', ') });
    gp.gpBegin_();
    gp.gpMenuSyncSharing();
    const folder = gp.fakes.drive.folders.get(fileFor(gp, 'christmas-giving')['Folder id']);
    expect(folder.name).toBe('Requests – Christmas giving offers');
    expect(Object.keys(permsOf(gp, folder.id)).sort()).toEqual(['ward.account@example.test', ...BISHOPRIC5, ...COUPLE].sort());
  });

  it('an offer lands in its sheet with Offer filled (formula text neutralized), the response is deleted, and only the coordinators are told', () => {
    const gp = wardWithCouple();
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'christmas-giving'), { Coordinators: COUPLE.join(', ') });
    gp.gpBegin_();
    gp.gpMenuSyncSharing();
    gp.fakes.mail.sent.length = 0;
    const f = fileFor(gp, 'christmas-giving');
    const form = gp.fakes.forms.get(f['Form id']);
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'Sister Giver', 'Phone or email': '555-0199', [GIVE]: '=gifts for two children', Note: 'after the 15th' }, 'resp-give'));
    const rows = gp.fakes.spreadsheets.get(f['Sheet id']).rowsOf('Requests');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Kind: 'Christmas giving offers', Name: 'Sister Giver', 'Phone or email': '555-0199', Offer: "'=gifts for two children", Note: 'after the 15th', Status: 'New' });
    // Offer ids start with o, request ids with r, so a match note can name either.
    expect(rows[0]['Request id']).toMatch(/^o[a-z2-7]{10}$/);
    expect(form.deletedResponses).toEqual(['resp-give']);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual([...COUPLE].sort());
    for (const m of gp.fakes.mail.sent) {
      for (const bad of ['Sister Giver', '555-0199', 'gifts for two', '15th']) expect(m.body + m.htmlBody + m.subject).not.toContain(bad);
    }
    submit(gp, 'christmas', { Name: 'Sister Private', 'Phone or email': 'private@example.test', For: 'My family' });
    const req = gp.fakes.spreadsheets.get(fileFor(gp, 'christmas')['Sheet id']).rowsOf('Requests')[0];
    expect(req['Request id']).toMatch(/^r[a-z2-7]{10}$/);
  });

  it('with no coordinators typed yet, an offer notice falls back to the bishopric', () => {
    const gp = wardWithCouple();
    const form = gp.fakes.forms.get(fileFor(gp, 'christmas-giving')['Form id']);
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'Sister Giver', 'Phone or email': '555-0199', [GIVE]: 'A bike' }));
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual([...BISHOPRIC5].sort());
  });

  it('a request sheet made before the Offer column gets it added when an offer is filed', () => {
    const gp = wardWithCouple();
    const f = fileFor(gp, 'christmas-giving');
    const sh = gp.fakes.spreadsheets.get(f['Sheet id']).getSheetByName('Requests');
    // As an older sheet: drop the Offer header.
    const col = sh.raw()[0].indexOf('Offer') + 1;
    const head = sh.raw()[0].filter((h) => h !== 'Offer');
    sh.getRange(1, 1, 1, head.length + 1).setValues([[...head, '']]);
    expect(gp.table_(sh).headers).not.toContain('Offer');
    expect(col).toBeGreaterThan(0);
    const form = gp.fakes.forms.get(f['Form id']);
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'Brother Giver', 'Phone or email': 'g@example.test', [GIVE]: 'Coats' }));
    const rows = gp.fakes.spreadsheets.get(f['Sheet id']).rowsOf('Requests');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Name: 'Brother Giver', Offer: 'Coats' });
    expect(form.deletedResponses).toHaveLength(1);
  });

  it('is not on the Help page; the other request kinds are', () => {
    const gp = wardWithCouple();
    const ids = plain(gp.apiHelp_()).tiles.map((t) => t.id);
    expect(ids).toEqual(['moving', 'christmas', 'other']);
  });

  it('Set up names the giving form link, since it is not on the Help page', () => {
    const gp = wardWithCouple();
    const form = gp.fakes.forms.get(fileFor(gp, 'christmas-giving')['Form id']);
    gp.gpMenuSetUp();
    expect(gp.fakes.alerts.at(-1)).toContain('Christmas giving offers');
    expect(gp.fakes.alerts.at(-1)).toContain(form.getPublishedUrl());
  });

  it('Notify Coordinators means that kind\'s Coordinators, still limited to readers', () => {
    const giving = { Id: 'christmas-giving', Confidential: true, Coordinators: COUPLE.join(', '), Notify: 'Coordinators' };
    expect(plain(gp0.requestNotifyList(giving, LEADERS)).to.sort()).toEqual([...COUPLE].sort());
    const mixed = plain(gp0.requestNotifyList({ ...giving, Notify: 'coordinators, Bishop' }, LEADERS));
    expect(mixed.to.sort()).toEqual([...COUPLE, 'bishop.example@example.test'].sort());
    // A non-confidential kind: Coordinators are readers too.
    const moving = { Id: 'moving', 'Owning organizations': 'Elders Quorum', Coordinators: 'helper.coord@example.test', Notify: 'Coordinators' };
    expect(plain(gp0.requestNotifyList(moving, LEADERS)).to).toEqual(['helper.coord@example.test']);
  });

  it('is added once to an already-seeded Categories tab, unticked for the Help page, and never over a typed row', () => {
    // A Categories tab from before the giving row: remove it and the new columns' seeding marks.
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Categories');
    t.remove(t.find('Id', 'christmas-giving'));
    gp.fakes.props.delete('GIVING_SEEDED');
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    const rows = () => gp.fakes.spreadsheet.rowsOf('Categories');
    const giving = rows().filter((c) => c.Id === 'christmas-giving');
    expect(giving).toHaveLength(1);
    expect(giving[0]).toMatchObject({ Name: 'Christmas giving offers', Icon: '🎁', Kind: 'Request', Confidential: true, 'Owning organizations': 'Bishopric', Coordinators: '', Notify: 'Coordinators', 'On Help page': false });
    // Run again: still one. Delete it: Set up doesn't bring it back.
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(rows().filter((c) => c.Id === 'christmas-giving')).toHaveLength(1);
    const t2 = gp.serviceTab_('Categories');
    t2.remove(t2.find('Id', 'christmas-giving'));
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(rows().filter((c) => c.Id === 'christmas-giving')).toHaveLength(0);

    // A row Sam already typed with that Id is kept as he typed it.
    const gp2 = loadPortal({ seed: true });
    const t3 = gp2.serviceTab_('Categories');
    t3.update(t3.find('Id', 'christmas-giving'), { Name: 'Gifts we can give', Coordinators: COUPLE[0] });
    gp2.fakes.props.delete('GIVING_SEEDED');
    gp2.gpEnsureTabs_(gp2.fakes.spreadsheet);
    const mine = gp2.fakes.spreadsheet.rowsOf('Categories').filter((c) => c.Id === 'christmas-giving');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ Name: 'Gifts we can give', Coordinators: COUPLE[0] });
  });

  it('adding the On Help page column to an older tab ticks every existing row, so they keep showing', () => {
    const gp = loadPortal({ seed: true });
    const sh = gp.fakes.spreadsheet.getSheetByName('Categories');
    const t = gp.serviceTab_('Categories');
    t.remove(t.find('Id', 'christmas-giving'));
    // Drop the On Help page and Notify columns (they are the last two).
    const head = sh.raw()[0];
    for (const name of ['On Help page', 'Notify']) {
      const c = head.indexOf(name) + 1;
      for (let r = 1; r <= sh.getMaxRows(); r++) {
        sh.validations.delete(`${r},${c}`);
        if (sh.cell(r, c) !== '') sh.write(r, c, '');
      }
    }
    for (const k of ['GIVING_SEEDED', 'HELP_PAGE_SEEDED', 'NOTIFY_SEEDED']) gp.fakes.props.delete(k);
    gp.gpBegin_();
    expect(gp.table_(sh).headers).not.toContain('On Help page');
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    const rows = gp.fakes.spreadsheet.rowsOf('Categories');
    for (const r of rows) expect([r.Id, r['On Help page']]).toEqual([r.Id, r.Id !== 'christmas-giving']);
    // Unticking stays unticked on the next Set up.
    const t2 = gp.serviceTab_('Categories');
    t2.update(t2.find('Id', 'moving'), { 'On Help page': false });
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(gp.fakes.spreadsheet.rowsOf('Categories').find((c) => c.Id === 'moving')['On Help page']).toBe(false);
  });
});
