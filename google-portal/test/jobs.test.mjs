import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost, setSetting, addLeader, MORE_BISHOPRIC } from './harness.mjs';
import { OWNER_EMAIL } from './fakes.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
// The cancel link (2.4.1: the reminder's My sign-ups link comes first).
const tokenFrom = (text) => /confirm[^\s"]*#t=([0-9a-f]{64})/.exec(text)[1];
const meTokens = (text) => [...text.matchAll(/me(?:\.html|\?page=me)?#t=([0-9a-f]{64})/g)].map((x) => x[1]);
/** The System Sheet in use (Set up makes a new one). */
const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));

function withSignup() {
  const gp = loadPortal({ seed: true });
  seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-02', Start: '17:00' }, { 'Slot id': 'm2', Date: '2026-12-05', Needed: 3 }]);
  gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
  gp.fakes.mail.sent.length = 0;
  return gp;
}

/** A portal after Set up has run (folder, System Sheet, forms). */
function afterSetUp() {
  const gp = loadPortal({ seed: true });
  gp.fakes.props.delete('SYSTEM_ID');
  gp.gpMenuSetUp();
  return gp;
}

describe('gpHourly', () => {
  it('sends the day-before reminder with private details once, at the reminder hour', () => {
    const gp = withSignup();
    gp.fakes.setNow('2026-12-01 17:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent).toHaveLength(0);
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent).toHaveLength(1);
    const m = gp.fakes.mail.sent[0];
    expect(m.to).toBe('brother.volunteer@example.test');
    expect(m.body).toContain('123 Example Lane');
    const row = gp.fakes.spreadsheet.rowsOf('Sign-ups')[0];
    expect(row['Reminded at']).toBe('2026-12-01 18:00');
    expect(row['Details sent at']).toBe('2026-12-01 18:00');
    gp.fakes.setNow('2026-12-01 19:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent).toHaveLength(1);
    // The reminder's cancel link works.
    const info = plain(gp.apiTokenInfo_({ t: tokenFrom(m.body) }));
    expect(info).toMatchObject({ ok: true, status: 'Confirmed', date: '2026-12-02' });
    expect(plain(gp.apiCancel_({ t: tokenFrom(m.body) })).ok).toBe(true);
  });

  it('2.4.1: the reminder has the See all your sign-ups button, then the cancel text link; the link opens My sign-ups', () => {
    const gp = withSignup();
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    const m = gp.fakes.mail.sent[0];
    const me = meTokens(m.body);
    expect(me).toHaveLength(1);
    expect(m.body.indexOf('See all your sign-ups')).toBeLessThan(m.body.indexOf('Cancel my sign-up'));
    expect(m.htmlBody.indexOf('See all your sign-ups')).toBeGreaterThan(-1);
    expect(m.htmlBody.indexOf('See all your sign-ups')).toBeLessThan(m.htmlBody.indexOf('Cancel my sign-up'));
    expect(m.htmlBody.match(/background:#1d3557/g)).toHaveLength(1);
    const r = plain(gp.apiMe_({ t: me[0] }));
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).toContain('Meals for the Sample family');
  });

  it('2.4.1: two reminders to one address in one run share one working My sign-ups link', () => {
    const gp = loadPortal({ seed: true });
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-02', Start: '17:00', Needed: 3 }, { 'Slot id': 'm2', Date: '2026-12-02', Start: '19:00', Needed: 3 }]);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    const reminders = gp.fakes.mail.sent.filter((m) => m.subject.startsWith('Reminder'));
    expect(reminders).toHaveLength(2);
    const links = reminders.map((m) => meTokens(m.body)[0]);
    expect(links[0]).toBe(links[1]);
    expect(plain(gp.apiMe_({ t: links[0] })).ok).toBe(true);
  });

  it('marks a post Past after its last date and it leaves serve', () => {
    const gp = withSignup();
    gp.fakes.setNow('2026-12-06 01:00');
    gp.gpHourly();
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Past');
    expect(plain(gp.apiServe_()).posts).toEqual([]);
    expect(plain(gp.apiPost_('pubmeals01')).post.status).toBe('Past');
  });

  it('a job error is logged and alerts the administrators once a day', () => {
    const gp = withSignup();
    gp.fakes.props.set('SCHEMA_VERSION', gp.GP_VERSION); // already upgraded: a missing tab is a real problem
    gp.fakes.spreadsheet.deleteSheet(gp.fakes.spreadsheet.getSheetByName('Slots'));
    gp.gpHourly();
    gp.gpHourly();
    expect(gp.fakes.system.rowsOf('Log').filter((l) => l.What === 'job error')).toHaveLength(2);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(['bishop.example@example.test', 'brother.clerk@example.test']);
    gp.fakes.setNow('2026-12-02 10:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent).toHaveLength(4);
  });
});

describe('email reserve with reminders due', () => {
  it('reminders still go at the reserve; confirmations queue and go out in order on the next 10-minute run', () => {
    const gp = withSignup();
    gp.fakes.setNow('2026-12-01 18:00');
    gp.fakes.setQuota(30); // exactly the reserve
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister One', email: 'one@example.test' });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Two', email: 'two@example.test' });
    gp.gpHourly();
    expect(gp.fakes.mail.sent.map((m) => m.subject)).toEqual(['Reminder: Meals for the Sample family tomorrow']);
    expect(gp.fakes.system.rowsOf('Outbox').map((m) => m.To)).toEqual(['one@example.test', 'two@example.test']);
    gp.fakes.setQuota(100);
    gp.gpTenMinute();
    expect(gp.fakes.mail.sent.slice(1).map((m) => m.to)).toEqual(['one@example.test', 'two@example.test']);
    expect(gp.fakes.system.rowsOf('Outbox')).toEqual([]);
  });
});

describe('gpTenMinute', () => {
  it('drains a queued confirmation once the quota returns, and refreshes Filled', () => {
    const gp = loadPortal({ seed: true });
    seedPost(gp, {}, [{ 'Slot id': 'm1', Needed: 2 }]);
    gp.fakes.setQuota(10);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
    expect(gp.fakes.mail.sent).toHaveLength(0);
    expect(gp.fakes.system.rowsOf('Outbox')).toHaveLength(1);
    const slots = gp.fakes.spreadsheet.getSheetByName('Slots');
    const col = slots.raw()[0].indexOf('Filled') + 1;
    slots.getRange(2, col).setValue(7);
    gp.fakes.setQuota(100);
    gp.gpTenMinute();
    expect(gp.fakes.mail.sent.map((m) => m.subject)).toEqual(["You're signed up: Meals for the Sample family"]);
    expect(gp.fakes.system.rowsOf('Outbox')).toHaveLength(0);
    expect(gp.fakes.spreadsheet.rowsOf('Slots')[0].Filled).toBe(1);
  });

  it('sends ticked leader links', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'sister.helper@example.test'), { 'Send leader link': true });
    gp.gpTenMinute();
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['sister.helper@example.test']);
  });
});

describe('gpDaily', () => {
  it('deletes expired tokens and keeps live ones', () => {
    const gp = loadPortal({ seed: true });
    gp.issueToken_('cancel', 'old', '2026-11-30 23:59');
    gp.issueToken_('cancel', 'live', '2026-12-04 23:59');
    gp.gpDaily();
    expect(gp.fakes.system.rowsOf('Tokens').map((t) => t.Subject)).toEqual(['live']);
  });

  it('rotates request files on the 1st', () => {
    const gp = afterSetUp();
    const before = sys(gp).rowsOf('Request files')[0];
    const t = gp.table_(gp.fakes.spreadsheets.get(before['Sheet id']).getSheetByName('Requests'));
    t.append({ 'Request id': 'open1', Status: 'New', Name: 'Sister Requester' });
    gp.fakes.setNow('2027-01-01 02:00');
    gp.gpDaily();
    const after = sys(gp).rowsOf('Request files')[0];
    expect(gp.fakes.drive.removed).toContain(before['Sheet id']);
    expect(gp.fakes.spreadsheets.get(after['Sheet id']).rowsOf('Requests').map((r) => r['Request id'])).toEqual(['open1']);
  });

  it('trims the Log to 90 days and reports old failed mail once before deleting it', () => {
    const gp = loadPortal({ seed: true });
    gp.systemTab_('Log').appendMany([
      { At: '2026-08-01 10:00', What: 'old', Detail: '' },
      { At: '2026-11-30 10:00', What: 'recent', Detail: '' },
    ]);
    gp.systemTab_('Outbox').appendMany([
      { Id: 'm1', 'Queued at': '2026-11-20 10:00', To: 'a@example.test', Subject: 'Old failure', Status: 'Failed', Priority: 'normal' },
      { Id: 'm2', 'Queued at': '2026-11-30 10:00', To: 'b@example.test', Subject: 'New failure', Status: 'Failed', Priority: 'normal' },
    ]);
    gp.gpDaily();
    const whats = gp.fakes.system.rowsOf('Log').map((l) => l.What);
    expect(whats).not.toContain('old');
    expect(whats).toContain('recent');
    expect(gp.fakes.system.rowsOf('Outbox').map((m) => m.Id)).toEqual(['m2']);
    // (Phase 2's health email goes out too here: this portal has no triggers or web app check.)
    const alerts = gp.fakes.mail.sent.filter((m) => m.subject.includes('needs attention') && m.body.includes('could not be sent'));
    expect(alerts).toHaveLength(2);
    expect(alerts[0].body).toContain('Old failure');
  });
});

describe('Set up', () => {
  it('stops with a clear message until Settings are filled', () => {
    const gp = loadPortal();
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    expect(gp.fakes.alerts.at(-1)).toBe('Fill in Settings (ward name, time zone, contact email) and the Leaders tab, then run Set up again.');
    expect(gp.fakes.forms.size).toBe(0);
  });

  it('twice makes one folder, one System Sheet and one form per request category', () => {
    const gp = afterSetUp();
    const sysId = gp.fakes.props.get('SYSTEM_ID');
    gp.gpMenuSetUp();
    expect(gp.fakes.props.get('SYSTEM_ID')).toBe(sysId);
    const systems = [...gp.fakes.spreadsheets.values()].filter((s) => s.getName() === 'Riverbend 1st Ward (example) – Service System (private)');
    expect(systems.map((s) => s.getId())).toContain(sysId);
    expect(systems.filter((s) => s.getId() !== gp.fakes.system.getId())).toHaveLength(1);
    expect(gp.fakes.forms.size).toBe(4);
    const portals = [...gp.fakes.drive.folders.values()].filter((f) => f.name === 'Service Portal');
    expect(portals).toHaveLength(1);
    const service = gp.fakes.drive.files.get(gp.fakes.spreadsheet.getId());
    expect(service.parents).toEqual([portals[0].id]);
    expect(gp.fakes.drive.files.get(sysId).parents).toEqual([portals[0].id]);
    expect(gp.fakes.menus.length).toBe(0);
  });

  it('warns when the script time zone differs from Settings', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.state.scriptTz = 'America/New_York';
    gp.gpMenuSetUp();
    expect(gp.fakes.alerts.at(-1)).toMatch(/time zone/i);
    expect(gp.fakes.alerts.at(-1)).toContain('Project Settings');
  });

  it('adds the Service Portal menu', () => {
    const gp = loadPortal({ seed: true });
    gp.onOpen();
    expect(gp.fakes.menus[0].name).toBe('Service Portal');
    expect(gp.fakes.menus[0].items.map((i) => i[0])).toEqual(['Set up', 'Sync sharing', 'Install triggers', 'Make hub files', 'Send leader links now', 'Check health']);
  });
});

describe('Sync sharing', () => {
  it('shares the Service Sheet and request folders by role, keeps the System Sheet private and protects script tabs', () => {
    const gp = afterSetUp();
    const perms = (id) => Object.fromEntries([...gp.fakes.drive.permsOf(id).values()].map((p) => [p.emailAddress, p.role]));
    const serviceId = gp.fakes.spreadsheet.getId();
    gp.fakes.drive.permsOf(serviceId).set('stale@example.test', { id: 'px', role: 'reader', type: 'user', emailAddress: 'stale@example.test' });
    const sysId = gp.fakes.props.get('SYSTEM_ID');
    gp.fakes.drive.permsOf(sysId).set('leak@example.test', { id: 'py', role: 'reader', type: 'user', emailAddress: 'leak@example.test' });
    gp.fakes.state.failPermissionFor = ['sister.coordinator@example.test'];
    for (const l of MORE_BISHOPRIC) addLeader(gp, l);
    // Calling text alone no longer decides anything: this row says Bishop but Bishopric is not ticked.
    addLeader(gp, { Name: 'Brother Typed', Email: 'brother.typed@example.test', Calling: 'Bishop', Organization: 'Sunday School', 'Ward council': true });
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'christmas'), { Coordinators: 'helper.coord@example.test' });
    gp.gpBegin_();
    gp.gpMenuSyncSharing();
    expect(perms(serviceId)).toEqual({
      [OWNER_EMAIL]: 'owner',
      // 1.1 (decision 14): every Bishopric-ticked leader edits; other ward council members view.
      'bishop.example@example.test': 'writer',
      'brother.counselor@example.test': 'writer',
      'brother.clerk@example.test': 'writer',
      'brother.second@example.test': 'writer',
      'brother.recorder@example.test': 'writer',
      'sister.example@example.test': 'reader',
      'brother.sample@example.test': 'reader',
      'brother.typed@example.test': 'reader',
    });
    expect(perms(sysId)).toEqual({ [OWNER_EMAIL]: 'owner' });
    const files = sys(gp).rowsOf('Request files');
    expect(files[1]['Category id']).toBe('christmas');
    // Christmas: the whole bishopric plus its coordinators.
    expect(perms(files[1]['Folder id'])).toEqual({
      [OWNER_EMAIL]: 'owner',
      'bishop.example@example.test': 'writer',
      'brother.counselor@example.test': 'writer',
      'brother.clerk@example.test': 'writer',
      'brother.second@example.test': 'writer',
      'brother.recorder@example.test': 'writer',
      'helper.coord@example.test': 'writer',
    });
    // Moving (decision 18): the whole bishopric plus the EQ and RS leaders (Sister Coordinator's
    // address has no Google account in this test, so she is a problem line, not a permission).
    expect(Object.keys(perms(files[0]['Folder id'])).sort()).toEqual(
      [
        OWNER_EMAIL,
        'bishop.example@example.test',
        'brother.counselor@example.test',
        'brother.clerk@example.test',
        'brother.second@example.test',
        'brother.recorder@example.test',
        'brother.sample@example.test',
        'sister.example@example.test',
      ].sort()
    );
    // Share emails are off.
    for (const p of gp.fakes.drive.permsOf(serviceId).values()) if (p.opts) expect(p.opts.sendNotificationEmail).toBe(false);
    expect(gp.fakes.alerts.at(-1)).toContain('sister.coordinator@example.test');
    for (const name of ['Posts', 'Slots', 'Sign-ups', 'Volunteers', 'Needs help soon']) {
      const p = gp.fakes.spreadsheet.getSheetByName(name).protections;
      expect(p).toHaveLength(1);
      expect(p[0].editors).toEqual([OWNER_EMAIL]);
      expect(p[0].warningOnly).toBe(false);
    }
    expect(gp.fakes.spreadsheet.getSheetByName('Leaders').protections).toHaveLength(0);
    gp.gpMenuSyncSharing();
    expect(gp.fakes.spreadsheet.getSheetByName('Posts').protections).toHaveLength(1);
  });
});

describe('Unticking Bishopric takes access away', () => {
  it('a counselor who keeps Ward council drops to reader and leaves the Christmas folder; a Ward Clerk with no other role loses both', () => {
    const gp = afterSetUp();
    for (const l of MORE_BISHOPRIC) addLeader(gp, l);
    gp.gpBegin_();
    gp.gpMenuSyncSharing();
    const perms = (id) => Object.fromEntries([...gp.fakes.drive.permsOf(id).values()].map((p) => [p.emailAddress, p.role]));
    const serviceId = gp.fakes.spreadsheet.getId();
    const christmasFolder = sys(gp).rowsOf('Request files').find((f) => f['Category id'] === 'christmas')['Folder id'];
    expect(perms(serviceId)['brother.counselor@example.test']).toBe('writer');
    expect(perms(serviceId)['brother.recorder@example.test']).toBe('writer');
    expect(perms(christmasFolder)['brother.counselor@example.test']).toBe('writer');
    expect(perms(christmasFolder)['brother.recorder@example.test']).toBe('writer');

    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'brother.counselor@example.test'), { Bishopric: false });
    t.update(t.find('Email', 'brother.recorder@example.test'), { Bishopric: false });
    gp.gpBegin_();
    gp.gpMenuSyncSharing();
    // The counselor keeps Ward council: he views the Service Sheet and no longer opens Christmas.
    expect(perms(serviceId)['brother.counselor@example.test']).toBe('reader');
    expect(perms(christmasFolder)['brother.counselor@example.test']).toBeUndefined();
    // The Ward Clerk had no other role: he loses both.
    expect(perms(serviceId)['brother.recorder@example.test']).toBeUndefined();
    expect(perms(christmasFolder)['brother.recorder@example.test']).toBeUndefined();
  });
});

describe('Install triggers, hub files, leader links, health', () => {
  it('installs the three timed triggers and one per form, replacing old ones', () => {
    const gp = afterSetUp();
    gp.gpMenuInstallTriggers();
    gp.gpMenuInstallTriggers();
    const t = gp.fakes.triggers.map((x) => [x.handler, x.kind]);
    expect(t.filter((x) => x[0] === 'gpOnRequestSubmit')).toHaveLength(4);
    expect(t.filter((x) => x[0] !== 'gpOnRequestSubmit')).toEqual([['gpTenMinute', 'CLOCK'], ['gpHourly', 'CLOCK'], ['gpDaily', 'CLOCK']]);
    expect(gp.fakes.triggers.find((x) => x.handler === 'gpTenMinute').detail.everyMinutes).toBe(10);
    expect(gp.fakes.triggers.find((x) => x.handler === 'gpDaily').detail).toMatchObject({ everyDays: 1, atHour: 2 });
  });

  it('writes the hub files with the ward filled in, replacing older copies', () => {
    const gp = afterSetUp();
    setSetting(gp, 'serve_short_link', 'https://zippa.run/rb1Serve');
    gp.gpMenuMakeHubFiles();
    gp.gpMenuMakeHubFiles();
    const live = [...gp.fakes.drive.files.values()].filter((f) => f.mime === 'text/html' && !f.trashed);
    expect(live.map((f) => f.name).sort()).toEqual(['confirm.html', 'help.html', 'hub-sections.html', 'leader.html', 'me.html', 'post.html', 'serve.html']);
    const serve = live.find((f) => f.name === 'serve.html').content;
    expect(serve).toContain('fallback: false');
    expect(serve).toContain('Riverbend 1st Ward (example)');
    expect(live.find((f) => f.name === 'hub-sections.html').content).toContain('zippa.run/rb1Serve');
    const folder = gp.fakes.drive.folders.get(live[0].parents[0]);
    expect(folder.name).toBe('Hub files (copy to the hub)');
    expect(gp.fakes.alerts.at(-1)).toContain(folder.getUrl());
  });

  it('Send leader links now sends ticked rows', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'sister.helper@example.test'), { 'Send leader link': true });
    gp.gpMenuSendLeaderLinks();
    expect(gp.fakes.mail.sent).toHaveLength(1);
    expect(gp.fakes.alerts.at(-1)).toMatch(/1/);
  });

  it('Check health lists one line per piece', () => {
    const gp = afterSetUp();
    gp.gpMenuInstallTriggers();
    gp.fakes.state.fetch = (url) => (url.endsWith('?api=ping') ? { code: 200, text: JSON.stringify({ ok: true, at: 'x', build: gp.GP_BUILD }) } : { code: 404, text: '' });
    const lines = gp.gpMenuCheckHealth();
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const l of lines) expect(l).toMatch(/^(OK|PROBLEM) /);
    expect(lines.filter((l) => l.startsWith('PROBLEM'))).toEqual([]);
    setSetting(gp, 'hub_url', 'https://example.github.io/rb1links/');
    const again = gp.gpMenuCheckHealth();
    expect(again.find((l) => l.includes('Hub'))).toMatch(/^PROBLEM/);
    expect(gp.fakes.fetches.at(-1)[0]).toBe('https://example.github.io/rb1links/serve.html');
  });
});
