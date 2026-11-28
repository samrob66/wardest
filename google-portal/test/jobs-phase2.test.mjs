// Phase 2 timed jobs: 48-hour nudges, lapses, fill warnings, the Needs help soon tab, Waiting
// counts, the daily health email, trigger owners in Check health, and the phase 1 upgrade.
import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost, setSetting } from './harness.mjs';
import { OWNER_EMAIL } from './fakes.mjs';

const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const rows = (gp, tab = 'Sign-ups') => gp.fakes.spreadsheet.rowsOf(tab);
const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
const NEW = 'brother.new@example.test';
// 1.1: the Bishopric tick (bishop, counselor, Executive Secretary) makes a bishopric approver.
const RS_APPROVERS = ['bishop.example@example.test', 'brother.clerk@example.test', 'brother.counselor@example.test', 'sister.example@example.test'];

function setup() {
  const gp = loadPortal({ seed: true });
  const ct = gp.serviceTab_('Categories');
  ct.update(ct.find('Id', 'meals'), { Coordinators: 'sister.coordinator@example.test', 'Warn hours': 72, 'Also warn': 'brother.clerk@example.test, not-an-address' });
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03', Start: '17:00', Needed: 2 },
    { 'Slot id': 'm2', Date: '2026-12-10', Start: '17:00', Needed: 2 },
  ]);
  return gp;
}

/** Brother New confirms his address on m1 (Dec 3, 17:00): he waits for approval. */
function waiting(gp) {
  gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother New', email: NEW });
  const t = tokenFrom(gp.fakes.mail.sent.find((m) => m.to === NEW).body, 'confirm');
  gp.apiConfirm_({ t });
  gp.fakes.mail.sent.length = 0;
}

describe('gpHourly: nudges, lapses, warnings', () => {
  it('nudges the first post approvers once per post and date, 48 hours ahead', () => {
    const gp = setup();
    waiting(gp);
    gp.fakes.setNow('2026-12-01 16:00'); // 49 h before
    gp.gpHourly();
    expect(gp.fakes.mail.sent.filter((m) => /Urgent/.test(m.subject))).toEqual([]);
    gp.fakes.setNow('2026-12-01 18:00'); // 47 h before
    gp.gpHourly();
    const nudges = gp.fakes.mail.sent.filter((m) => /Urgent/.test(m.subject));
    expect(nudges.map((m) => m.to).sort()).toEqual(RS_APPROVERS);
    expect(nudges[0].body).not.toContain(NEW);
    gp.fakes.setNow('2026-12-01 19:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent.filter((m) => /Urgent/.test(m.subject))).toHaveLength(RS_APPROVERS.length);
    // The sent key is a Script Property, pruned by the daily job after 30 days.
    expect([...gp.fakes.props.keys()].filter((k) => k.startsWith('SENT_NUDGE_'))).toEqual(['SENT_NUDGE_p1|2026-12-03']);
    gp.fakes.setNow('2027-01-02 03:00');
    gp.gpDaily();
    expect([...gp.fakes.props.keys()].filter((k) => k.startsWith('SENT_'))).toEqual([]);
  });

  it("lapses yesterday's waiting sign-ups with no email, and refreshes Waiting", () => {
    const gp = setup();
    waiting(gp);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
    expect(rows(gp, 'Slots').map((s) => s.Waiting)).toEqual([1, 1]);
    gp.fakes.setNow('2026-12-04 01:00');
    gp.fakes.mail.sent.length = 0;
    gp.gpHourly();
    expect(rows(gp).map((s) => [s['Slot id'], s.Status])).toEqual([
      ['m1', 'Lapsed'],
      ['m2', 'Waiting-approval'],
    ]);
    expect(gp.fakes.mail.sent.filter((m) => m.to === NEW)).toEqual([]);
    expect(rows(gp, 'Slots').map((s) => s.Waiting)).toEqual([0, 1]);
  });

  it('a warning with nobody to tell is not marked sent, so coordinators added later still hear', () => {
    const gp = setup();
    const ct = gp.serviceTab_('Categories');
    ct.update(ct.find('Id', 'meals'), { Coordinators: '', 'Also warn': '' });
    gp.gpBegin_();
    gp.fakes.setNow('2026-11-30 19:00');
    gp.gpHourly();
    expect([...gp.fakes.props.keys()].filter((k) => k.startsWith('SENT_WARN_'))).toEqual([]);
    ct.update(ct.find('Id', 'meals'), { Coordinators: 'sister.coordinator@example.test' });
    gp.gpBegin_();
    gp.fakes.setNow('2026-11-30 20:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent.filter((m) => /short/i.test(m.subject)).map((m) => m.to)).toEqual(['sister.coordinator@example.test']);
  });

  it('warns the category coordinators and Also warn once per post date', () => {
    const gp = setup();
    gp.fakes.setNow('2026-11-30 16:00'); // 73 h before Dec 3 17:00
    gp.gpHourly();
    expect(gp.fakes.mail.sent.filter((m) => /short/i.test(m.subject))).toEqual([]);
    gp.fakes.setNow('2026-11-30 19:00'); // 70 h before
    gp.gpHourly();
    const warns = gp.fakes.mail.sent.filter((m) => /short/i.test(m.subject));
    expect(warns.map((m) => m.to).sort()).toEqual(['brother.clerk@example.test', 'sister.coordinator@example.test']);
    expect(warns[0].body).toContain('Bring a meal: 0 of 2 filled');
    expect(warns[0].body).toContain('#p=pubmeals01');
    gp.fakes.setNow('2026-11-30 20:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent.filter((m) => /short/i.test(m.subject))).toHaveLength(2);
  });
});

describe('gpTenMinute: the Needs help soon tab', () => {
  it('rewrites the tab from the rule and leaves it alone when nothing changed', () => {
    const gp = setup();
    seedPost(gp, { 'Post id': 'p2', 'Public id': 'pubfar', Title: 'Far away' }, [{ 'Slot id': 'f1', Date: '2026-12-20' }]);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
    gp.gpTenMinute();
    const tab = rows(gp, 'Needs help soon');
    expect(tab.map((r) => [r.Date, r.Title, r.Role, r.Filled, r.Needed])).toEqual([
      ['2026-12-03', 'Meals for the Sample family', 'Bring a meal', 1, 2],
      ['2026-12-10', 'Meals for the Sample family', 'Bring a meal', 0, 2],
    ]);
    expect(tab[0].Link).toContain('pubmeals01');
    const writes = gp.fakes.spreadsheet.counters.writes;
    gp.gpTenMinute();
    expect(gp.fakes.spreadsheet.counters.writes).toBe(writes);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Sister Other', email: 'sister.other@example.test' });
    gp.gpTenMinute();
    expect(rows(gp, 'Needs help soon').map((r) => r.Date)).toEqual(['2026-12-10']);
  });
});

function afterSetUp() {
  const gp = loadPortal({ seed: true });
  gp.fakes.props.delete('SYSTEM_ID');
  gp.gpMenuSetUp();
  gp.gpMenuInstallTriggers();
  return gp;
}

describe('gpDaily: the health email', () => {
  it('emails the administrators only when a check is PROBLEM, once a day, with no volunteer or request data', () => {
    const gp = afterSetUp();
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-03' }]);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
    sys(gp).getSheetByName('Outbox');
    gp.systemTab_('Outbox').append({ Id: 'mf', 'Queued at': '2026-11-30 10:00', To: 'brother.volunteer@example.test', Subject: 'Reminder: Meals for the Sample family tomorrow', Status: 'Failed', Priority: 'high', Error: 'boom' });
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setNow('2026-12-02 02:00');
    gp.gpDaily();
    // Only the failed email is a problem: one health email to the administrator (2.5.2: the
    // Executive Secretary, not the bishop).
    let health = gp.fakes.mail.sent.filter((m) => /needs attention/.test(m.subject));
    expect(health.map((m) => m.to).sort()).toEqual(['brother.clerk@example.test']);
    for (const m of health) {
      expect(m.body).toContain('PROBLEM Outbox: 0 waiting, 1 failed.');
      expect(m.body).not.toMatch(/OK /);
      for (const bad of ['brother.volunteer', 'Brother Volunteer', 'Meals for the Sample', '123 Example Lane']) expect(m.body).not.toContain(bad);
    }
    gp.gpDaily();
    expect(gp.fakes.mail.sent.filter((m) => /needs attention/.test(m.subject))).toHaveLength(1);
  });

  it('sends nothing when every check is OK, and flags jobs that run as another account', () => {
    const gp = afterSetUp();
    gp.fakes.mail.sent.length = 0;
    gp.gpDaily();
    expect(gp.fakes.mail.sent).toEqual([]);
    const lines = gp.healthLines_({ job: true });
    expect(lines.filter((l) => l.startsWith('PROBLEM'))).toEqual([]);
    gp.fakes.state.effectiveUser = 'someone.else@example.test';
    const other = gp.healthLines_({ job: true });
    expect(other.find((l) => l.includes('run as'))).toMatch(/^PROBLEM .*someone\.else@example\.test/);
  });
});

describe('Check health: trigger owners', () => {
  it('names the account that owns the listed triggers and their kinds', () => {
    const gp = afterSetUp();
    gp.fakes.state.fetch = () => ({ code: 200, text: JSON.stringify({ ok: true, build: gp.GP_BUILD }) });
    const lines = gp.gpMenuCheckHealth();
    const owner = lines.find((l) => l.includes('Triggers belong to'));
    expect(owner).toMatch(new RegExp('^OK Triggers belong to ' + OWNER_EMAIL.replace(/\./g, '\\.')));
    expect(owner).toContain('CLOCK');
    expect(lines.filter((l) => l.startsWith('PROBLEM'))).toEqual([]);
  });
});

describe('upgrading a ward live on phase 1', () => {
  it('Set up approves phase 1 volunteers: no row, or Pending with a sign-up from before phase 2; leaders excepted', () => {
    const gp = loadPortal({ seed: { approved: [] } });
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-03', Needed: 9 }]);
    gp.serviceTab_('Sign-ups').appendMany([
      { 'Sign-up id': 's1', 'Post id': 'p1', 'Slot id': 'm1', Email: 'old.volunteer@example.test', Name: 'Old Volunteer', Status: 'Confirmed', 'Signed up at': '2026-11-20 10:00' },
      { 'Sign-up id': 's2', 'Post id': 'p1', 'Slot id': 'm1', Email: 'sister.example@example.test', Name: 'Sister Example', Status: 'Confirmed', 'Signed up at': '2026-11-20 10:00' },
      { 'Sign-up id': 's3', 'Post id': 'p1', 'Slot id': 'm1', Email: 'gone@example.test', Name: 'Gone Person', Status: 'Cancelled', 'Signed up at': '2026-11-20 10:00' },
      { 'Sign-up id': 's4', 'Post id': 'p1', 'Slot id': 'm1', Email: 'gap.person@example.test', Name: 'Gap Person', Status: 'Confirmed', 'Signed up at': '2026-11-21 10:00' },
    ]);
    // A phase 2 sign-up in the gap made a Pending row for someone phase 1 had already accepted.
    gp.serviceTab_('Volunteers').append({ Email: 'gap.person@example.test', Name: 'Gap Person', Status: 'Pending', 'First post': 'p1' });
    gp.gpBegin_();
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    const vols = () => rows(gp, 'Volunteers').map((v) => [v.Email, v.Status, v['Decided by']]);
    expect(vols()).toEqual([
      ['gap.person@example.test', 'Approved', 'Phase 1 sign-up'],
      ['old.volunteer@example.test', 'Approved', 'Phase 1 sign-up'],
    ]);
    expect(gp.fakes.props.get('SCHEMA_VERSION')).toBe(gp.GP_VERSION);
    // A Confirmed sign-up the old web app took after that (no row) is covered by the next Set up;
    // a Pending address a bishopric member decided (an undone revoke, Decided by set) is not.
    gp.fakes.setNow('2026-12-01 11:00');
    gp.serviceTab_('Sign-ups').appendMany([
      { 'Sign-up id': 's5', 'Post id': 'p1', 'Slot id': 'm1', Email: 'later@example.test', Name: 'Later', Status: 'Confirmed', 'Signed up at': '2026-12-01 10:30' },
      { 'Sign-up id': 's6', 'Post id': 'p1', 'Slot id': 'm1', Email: 'undone@example.test', Name: 'Undone', Status: 'Confirmed', 'Signed up at': '2026-12-01 10:45' },
    ]);
    gp.serviceTab_('Volunteers').append({ Email: 'undone@example.test', Name: 'Undone', Status: 'Pending', 'Decided by': 'Bishop Example', 'Decided at': '2026-11-30 10:00', 'Email confirmed at': '2026-11-25 10:00' });
    gp.gpBegin_();
    gp.gpMenuSetUp();
    expect(vols()).toContainEqual(['later@example.test', 'Approved', 'Phase 1 sign-up']);
    expect(vols()).toContainEqual(['undone@example.test', 'Pending', 'Bishop Example']);
  });

  it('jobs and web calls on a sheet not yet set up for phase 2 upgrade it first: reminders keep their details', () => {
    const gp = loadPortal({ seed: { approved: [] } });
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-02', Needed: 2 }]);
    gp.serviceTab_('Sign-ups').append({ 'Sign-up id': 's1', 'Post id': 'p1', 'Slot id': 'm1', Email: 'old.volunteer@example.test', Name: 'Old Volunteer', Status: 'Confirmed', 'Signed up at': '2026-11-20 10:00' });
    // Make it look like phase 1: no 'Email confirmed at', no Needs help soon headers, no Counters tab.
    const vsh = gp.fakes.spreadsheet.getSheetByName('Volunteers');
    vsh.getRange(1, vsh.raw()[0].indexOf('Email confirmed at') + 1).setValue('');
    const nsh = gp.fakes.spreadsheet.getSheetByName('Needs help soon');
    nsh.getRange(1, 1, 1, 8).clearContent();
    gp.fakes.system.deleteSheet(gp.fakes.system.getSheetByName('Counters'));
    gp.gpBegin_();
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    const reminder = gp.fakes.mail.sent.find((m) => m.to === 'old.volunteer@example.test');
    expect(reminder.subject).toMatch(/^Reminder/);
    expect(reminder.body).toContain('123 Example Lane');
    gp.gpTenMinute();
    expect(rows(gp, 'Needs help soon').map((r) => r.Date)).toEqual(['2026-12-02']);
    expect(gp.fakes.system.rowsOf('Log').filter((l) => l.What === 'job error')).toEqual([]);
    // A web call works too.
    const res = JSON.parse(gp.doPost({ postData: { contents: JSON.stringify({ action: 'signup', publicId: 'pubmeals01', slotId: 'm1', name: 'New Person', email: 'new.person@example.test' }) } }).getContent());
    expect(res).toEqual({ ok: true, message: 'Thanks. Check your email to finish or see your sign-up.' });
  });
});

describe('review round 2: the migration never undoes a decision', () => {
  function phase1Ward() {
    const gp = loadPortal({ seed: { approved: [] } });
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-03', Needed: 9 }]);
    gp.serviceTab_('Sign-ups').append({ 'Sign-up id': 's1', 'Post id': 'p1', 'Slot id': 'm1', Email: 'old.volunteer@example.test', Name: 'Old Volunteer', Status: 'Confirmed', 'Signed up at': '2026-11-20 10:00' });
    gp.gpBegin_();
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    return gp;
  }
  const vol = (gp, email) => rows(gp, 'Volunteers').find((v) => v.Email === email);

  it('a phase 1 volunteer revoked and then undone stays Pending with the bishop as decider after Set up', () => {
    const gp = phase1Ward();
    expect(vol(gp, 'old.volunteer@example.test')).toMatchObject({ Status: 'Approved', 'Decided by': 'Phase 1 sign-up' });
    const k = gp.issueToken_('leader', 'bishop.example@example.test', '2027-01-01 00:00');
    expect(gp.apiBishopric_({ k, email: 'old.volunteer@example.test', decision: 'revoke' }).ok).toBe(true);
    expect(gp.apiBishopric_({ k, email: 'old.volunteer@example.test', decision: 'undo' }).ok).toBe(true);
    gp.gpMenuSetUp();
    expect(vol(gp, 'old.volunteer@example.test')).toMatchObject({ Status: 'Pending', 'Decided by': 'Bishop Example' });
  });

  it('a former leader who signed up after the phase 2 web app went live is not labelled a phase 1 volunteer', () => {
    const gp = phase1Ward();
    gp.fakes.setNow('2026-12-01 12:00');
    // The phase 2 web app answers for the first time.
    gp.doGet({ parameter: { api: 'serve' } });
    expect(gp.fakes.props.get('PHASE2_WEB_AT')).toBe('2026-12-01 12:00');
    gp.serviceTab_('Sign-ups').appendMany([
      // Taken by the old web app before that (no row): a phase 1 sign-up.
      { 'Sign-up id': 's2', 'Post id': 'p1', 'Slot id': 'm1', Email: 'gap.volunteer@example.test', Name: 'Gap Volunteer', Status: 'Confirmed', 'Signed up at': '2026-12-01 11:00' },
      // A leader's sign-up later (leaders get no row); then they left the Leaders tab.
      { 'Sign-up id': 's3', 'Post id': 'p1', 'Slot id': 'm1', Email: 'former.leader@example.test', Name: 'Former Leader', Status: 'Confirmed', 'Signed up at': '2026-12-01 13:00' },
    ]);
    gp.gpBegin_();
    gp.fakes.setNow('2026-12-02 09:00');
    gp.gpMenuSetUp();
    expect(vol(gp, 'gap.volunteer@example.test')).toMatchObject({ Status: 'Approved', 'Decided by': 'Phase 1 sign-up' });
    expect(vol(gp, 'former.leader@example.test')).toBeUndefined();
  });
});

describe('review round 3', () => {
  it('item 1: someone the old web app accepted in the gap who signs up again through phase 2 is approved', () => {
    const gp = loadPortal({ seed: { approved: [] } });
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-03', Needed: 9 }, { 'Slot id': 'm2', Date: '2026-12-04', Needed: 9 }]);
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp(); // step 3: PHASE2_AT 10:00
    gp.fakes.setNow('2026-12-01 10:02');
    // The old web app (no Volunteers row) takes a sign-up.
    gp.serviceTab_('Sign-ups').append({ 'Sign-up id': 's1', 'Post id': 'p1', 'Slot id': 'm1', Email: 'gap@example.test', Name: 'Gap Person', Status: 'Confirmed', 'Signed up at': '2026-12-01 10:02' });
    gp.gpBegin_();
    gp.fakes.setNow('2026-12-01 10:05'); // step 4: the phase 2 web app answers
    gp.doGet({ parameter: { api: 'serve' } });
    gp.fakes.setNow('2026-12-01 10:07'); // they sign up again: a Pending row
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Gap Person', email: 'gap@example.test' });
    expect(rows(gp, 'Volunteers').find((v) => v.Email === 'gap@example.test').Status).toBe('Pending');
    gp.fakes.setNow('2026-12-01 10:10'); // step 5: Set up again
    gp.gpMenuSetUp();
    expect(rows(gp, 'Volunteers').find((v) => v.Email === 'gap@example.test')).toMatchObject({ Status: 'Approved', 'Decided by': 'Phase 1 sign-up' });
  });

  it('item 2: the ping carries the build, and Check health says when the web app is an older version', () => {
    const gp = afterSetUp();
    const pong = JSON.parse(gp.doGet({ parameter: { api: 'ping' } }).getContent());
    expect(pong.build).toBe(gp.GP_BUILD);
    expect(gp.GP_BUILD).toMatch(/^[0-9a-f]{12}$/);
    expect(gp.healthLines_({}).find((l) => l.includes('build'))).toMatch(/^OK Web app runs the saved script/);
    gp.fakes.state.fetch = () => ({ code: 200, text: JSON.stringify({ ok: true, at: 'x' }) }); // a phase 1 web app
    expect(gp.healthLines_({ job: true })).toContain('PROBLEM The web app is an older version: Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy.');
    gp.fakes.mail.sent.length = 0;
    gp.gpDaily();
    expect(gp.fakes.mail.sent.filter((m) => /needs attention/.test(m.subject) && m.body.includes('older version'))).toHaveLength(1);
  });

  it('item 4: a new Settings tab defaults to 80 sign-up attempts a day; a value a ward typed stays', () => {
    const gp = loadPortal({ seed: true });
    expect(gp.settings_().signup_limit_per_day).toBe(80);
    setSetting(gp, 'signup_limit_per_day', 40);
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    gp.gpBegin_();
    expect(gp.settings_().signup_limit_per_day).toBe(40);
  });
});
