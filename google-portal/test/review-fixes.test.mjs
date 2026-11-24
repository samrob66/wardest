// Review round 1 fixes and the coordinator's decisions D1-D4.
import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost, approveVolunteers } from './harness.mjs';
import { formSubmitEvent } from './fakes.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');
const signup = (gp, over = {}) => plain(gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test', ...over }));
const LIMIT = 'Too many sign-ups right now. Please try again later or contact help@riverbend.example.';

function setup(slots) {
  const gp = loadPortal({ seed: true });
  seedPost(gp, {}, slots || [
    { 'Slot id': 'm1', Date: '2026-12-02', Start: '17:00' },
    { 'Slot id': 'm2', Date: '2026-12-02', Start: '18:00', End: '19:00', Role: 'Drive', Needed: 5 },
    { 'Slot id': 'm3', Date: '2026-12-05', Needed: 20 },
  ]);
  return gp;
}

describe('D1: Close and Draft keep reminders; Cancelled and Past do not', () => {
  it('a Closed post still sends the reminder', () => {
    const gp = setup();
    signup(gp);
    const t = gp.serviceTab_('Posts');
    t.update(t.find('Post id', 'p1'), { Status: 'Closed' });
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent.map((m) => m.subject)).toEqual(['Reminder: Meals for the Sample family tomorrow']);
  });

  it('moving the date or start of a booked slot is refused like removing it', () => {
    const gp = setup();
    signup(gp);
    const k = linkFor(gp, 'sister.example@example.test');
    const got = plain(gp.apiGetPost_({ k, postId: 'p1' })).post;
    const moved = { ...got, slots: got.slots.map((s) => (s.slotId === 'm1' ? { ...s, date: '2026-12-03' } : s)) };
    const r = plain(gp.apiSavePost_({ k, action: 'publish', post: moved }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Remove the people signed up for this date first.');
    expect(r.fields['slots[0].date']).toBe('Remove the people signed up for this date first.');
    const later = { ...got, slots: got.slots.map((s) => (s.slotId === 'm1' ? { ...s, start: '17:30' } : s)) };
    expect(plain(gp.apiSavePost_({ k, action: 'publish', post: later })).ok).toBe(false);
    // An unbooked slot may still move.
    const free = { ...got, slots: got.slots.map((s) => (s.slotId === 'm2' ? { ...s, date: '2026-12-04' } : s)) };
    expect(plain(gp.apiSavePost_({ k, action: 'publish', post: free })).ok).toBe(true);
  });
});

describe('details in the reminder (phase 2: Send details is gone)', () => {
  it('the reminder stamps Details sent at only when the post has details', () => {
    const gp = setup();
    const t = gp.serviceTab_('Posts');
    t.update(t.find('Post id', 'p1'), { 'Private details': '' });
    signup(gp);
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    const row = gp.fakes.spreadsheet.rowsOf('Sign-ups')[0];
    expect(row['Reminded at']).toBe('2026-12-01 18:00');
    expect(row['Details sent at']).toBe('');
  });

  it('a cancel during the hourly run is not reminded (claimed from a fresh read under the lock)', () => {
    const gp = setup();
    signup(gp);
    const token = /#t=([0-9a-f]{64})/.exec(gp.fakes.mail.sent[0].body)[1];
    gp.apiCancel_({ t: token });
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent).toEqual([]);
  });
});

describe('D3: refused attempts count toward the limits', () => {
  it('one address may try 3 different roles a day; repeats on one role count once', () => {
    const gp = setup([
      { 'Slot id': 'm1', Date: '2026-12-02', Start: '17:00' },
      { 'Slot id': 'm2', Date: '2026-12-02', Start: '18:00', End: '19:00', Role: 'Drive', Needed: 5 },
      { 'Slot id': 'm3', Date: '2026-12-05', Needed: 20 },
      { 'Slot id': 'm4', Date: '2026-12-06', Needed: 20 },
    ]);
    // Phase 2: a duplicate answers the same sentence as everything else (outcomes by email only).
    const THANKS = { ok: true, message: 'Thanks. Check your email to finish or see your sign-up.' };
    expect(signup(gp).ok).toBe(true); // m1
    expect(signup(gp)).toEqual(THANKS); // m1 again: the same role, still one
    expect(signup(gp, { slotId: 'm2' }).ok).toBe(true);
    expect(signup(gp, { slotId: 'm3' }).ok).toBe(true);
    expect(signup(gp, { slotId: 'm4' }).error).toBe(LIMIT);
    expect(signup(gp)).toEqual(THANKS); // m1 was already counted today
    gp.fakes.setNow('2026-12-02 08:00');
    expect(signup(gp, { slotId: 'm4' }).ok).toBe(true);
  });

  it('full and closed refusals count too, per address and per post per minute', () => {
    const gp = setup();
    approveVolunteers(gp, Array.from({ length: 9 }, (_, i) => `p${i}@example.test`));
    signup(gp, { email: 'first@example.test' });
    // 1 sign-up + 9 refused attempts = 10 this minute on this post: the next attempt is refused.
    // (Phase 2: an approved address on a full role is told by email; the answer is the usual sentence.)
    for (let i = 0; i < 9; i++) expect(signup(gp, { email: `p${i}@example.test` }).ok).toBe(true);
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups')).toHaveLength(1);
    expect(signup(gp, { slotId: 'm3', email: 'fresh@example.test' }).error).toBe(LIMIT);
    gp.fakes.setNow('2026-12-01 10:01');
    expect(signup(gp, { slotId: 'm3', email: 'fresh@example.test' }).ok).toBe(true);
  });

  it('keeps the counters in the cache (per minute) and the Counters tab (per day), never Script Properties or an address', () => {
    const gp = setup();
    const propsBefore = [...gp.fakes.props.keys()].sort();
    signup(gp);
    signup(gp);
    expect([...gp.fakes.props.keys()].sort()).toEqual(propsBefore);
    const keys = [...gp.fakes.cache.keys()].filter((k) => /^RP_/.test(k));
    expect(keys.length).toBeGreaterThan(0);
    const rows = gp.fakes.system.rowsOf('Counters');
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows) + keys.join(' ')).not.toContain('brother');
  });
});

describe('D4: cancel an opportunity or a date', () => {
  function booked() {
    const gp = setup();
    signup(gp); // m1, Dec 2
    signup(gp, { slotId: 'm2', name: 'Sister Two', email: 'two@example.test' }); // Dec 2
    signup(gp, { slotId: 'm3', name: 'Sister Two', email: 'two@example.test' }); // Dec 5, same person
    signup(gp, { slotId: 'm3', name: 'Sister Three', email: 'three@example.test' }); // Dec 5
    const tok = gp.issueToken_('cancel', 'unrelated', '2027-01-01 00:00');
    const tab = gp.serviceTab_('Sign-ups');
    const three = tab.find('Email', 'three@example.test');
    tab.update(three, { Status: 'Cancelled' }); // already cancelled: must not be emailed
    gp.fakes.mail.sent.length = 0;
    return { gp, tok };
  }

  it('emails every Confirmed volunteer once and nobody else, then nothing more happens', () => {
    const { gp } = booked();
    const k = linkFor(gp, 'sister.example@example.test');
    const r = plain(gp.apiCancelPost_({ k, postId: 'p1', note: 'Family <b>moved</b> & sends thanks' }));
    expect(r.ok).toBe(true);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(['brother.volunteer@example.test', 'two@example.test']);
    const two = gp.fakes.mail.sent.find((m) => m.to === 'two@example.test');
    expect(two.subject).toBe('Cancelled: Meals for the Sample family');
    expect(two.body).toContain('Drive');
    expect(two.body).toContain('Bring a meal');
    expect(two.htmlBody).toContain('Family &lt;b&gt;moved&lt;/b&gt; &amp; sends thanks');
    expect(two.htmlBody).not.toContain('<b>moved</b>');
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Cancelled');
    const rows = gp.fakes.spreadsheet.rowsOf('Sign-ups');
    // Removed by records who, and which date and role was called off (the slot rows stay for a whole cancel).
    expect(rows.filter((x) => x.Status === 'Removed').map((x) => x['Removed by']).sort()).toEqual([
      'Sister Example (opportunity cancelled: Wed, Dec 2, Bring a meal)',
      'Sister Example (opportunity cancelled: Wed, Dec 2, Drive)',
      'Sister Example (opportunity cancelled: Sat, Dec 5, Bring a meal)',
    ].sort());
    expect(rows.filter((x) => x.Status === 'Confirmed')).toEqual([]);
    expect(plain(gp.apiServe_()).posts).toEqual([]);
    expect(plain(gp.apiPost_('pubmeals01')).post.status).toBe('Cancelled');
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setNow('2026-12-01 18:00');
    gp.gpHourly();
    expect(gp.fakes.mail.sent).toEqual([]);
    // It can't be reopened.
    const got = plain(gp.apiGetPost_({ k, postId: 'p1' })).post;
    expect(plain(gp.apiSavePost_({ k, action: 'publish', post: got })).error).toBe("This opportunity was cancelled and can't be reopened.");
    expect(plain(gp.apiCancelPost_({ k, postId: 'p1' })).ok).toBe(false);
    // Their cancel links are gone.
    const subjects = gp.fakes.system.rowsOf('Tokens').map((t) => t.Subject);
    for (const s of rows) if (s.Status === 'Removed') expect(subjects).not.toContain(s['Sign-up id']);
  });

  it('an org editor of another organization is refused', () => {
    const { gp } = booked();
    const r = plain(gp.apiCancelPost_({ k: linkFor(gp, 'sister.helper@example.test'), postId: 'p1' }));
    expect(r.ok).toBe(false);
    expect(gp.fakes.mail.sent).toEqual([]);
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Open');
    expect(plain(gp.apiCancelDate_({ k: linkFor(gp, 'sister.helper@example.test'), postId: 'p1', date: '2026-12-02' })).ok).toBe(false);
  });

  it('a note over 300 characters is refused', () => {
    const { gp } = booked();
    const r = plain(gp.apiCancelPost_({ k: linkFor(gp, 'sister.example@example.test'), postId: 'p1', note: 'x'.repeat(301) }));
    expect(r.ok).toBe(false);
  });

  it('cancelling one date tells only its volunteers, removes its slots and keeps the post open', () => {
    const { gp } = booked();
    const k = linkFor(gp, 'sister.example@example.test');
    const r = plain(gp.apiCancelDate_({ k, postId: 'p1', date: '2026-12-02' }));
    expect(r.ok).toBe(true);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(['brother.volunteer@example.test', 'two@example.test']);
    const two = gp.fakes.mail.sent.find((m) => m.to === 'two@example.test');
    expect(two.body).toContain('Drive');
    expect(two.body).not.toContain('Saturday');
    expect(gp.fakes.spreadsheet.rowsOf('Slots').map((s) => s['Slot id'])).toEqual(['m3']);
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Open');
    const still = gp.fakes.spreadsheet.rowsOf('Sign-ups').filter((x) => x.Status === 'Confirmed');
    expect(still.map((x) => x.Email)).toEqual(['two@example.test']);
    // The slot rows are gone, so Removed by keeps which date and role was called off.
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').filter((x) => x.Status === 'Removed').map((x) => x['Removed by']).sort()).toEqual([
      'Sister Example (date cancelled: Wed, Dec 2, Bring a meal)',
      'Sister Example (date cancelled: Wed, Dec 2, Drive)',
    ]);
    expect(plain(gp.apiServe_()).posts.map((p) => p.publicId)).toEqual(['pubmeals01']);
    // The last date can't be cancelled this way.
    expect(plain(gp.apiCancelDate_({ k, postId: 'p1', date: '2026-12-05' })).error).toBe('This is the only date. Cancel the whole opportunity instead.');
  });

  it('doPost dispatches cancelPost and cancelDate', () => {
    const { gp } = booked();
    const k = linkFor(gp, 'sister.example@example.test');
    const out = gp.doPost({ postData: { contents: JSON.stringify({ action: 'cancelDate', k, postId: 'p1', date: '2026-12-02' }) } });
    expect(JSON.parse(out.getContent()).ok).toBe(true);
  });
});

describe('requests: step messages and capped alerts', () => {
  function forms() {
    const gp = loadPortal({ seed: true });
    const portal = gp.DriveApp.createFolder('Service Portal');
    gp.fakes.props.set('PORTAL_FOLDER_ID', portal.getId());
    gp.buildRequestForms_(gp.settings_(), gp.serviceTab_('Categories').rows());
    const f = gp.fakes.system.rowsOf('Request files')[0];
    return { gp, f, form: gp.fakes.forms.get(f['Form id']) };
  }

  it('a failure after filing says it was filed and is still in the form', () => {
    const { gp, f, form } = forms();
    form.deleteResponse = () => {
      throw new Error('form busy');
    };
    gp.fakes.mail.sent.length = 0;
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'Sister Requester', 'Phone or email': '555-0100' }));
    expect(gp.fakes.spreadsheets.get(f['Sheet id']).rowsOf('Requests')).toHaveLength(1);
    expect(gp.fakes.mail.sent[0].body).toContain('It was filed in the request sheet but is still in the form');
  });

  it('alerts about failed requests at most 3 times a day', () => {
    const { gp, f, form } = forms();
    gp.fakes.spreadsheets.delete(f['Sheet id']);
    gp.fakes.mail.sent.length = 0;
    for (let i = 0; i < 6; i++) gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'N', 'Phone or email': 'c' }));
    expect(gp.fakes.mail.sent).toHaveLength(6); // 3 alerts × 2 administrators
    expect(gp.fakes.mail.sent[0].body).toContain('It is kept in the form');
  });

  it('a request filed during the monthly rotation lands in the new sheet', () => {
    const { gp, form } = forms();
    gp.fakes.setNow('2027-01-01 02:00');
    gp.dailyRequests_();
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'After', 'Phone or email': 'c' }));
    const now = gp.fakes.system.rowsOf('Request files')[0];
    expect(gp.fakes.spreadsheets.get(now['Sheet id']).rowsOf('Requests').map((r) => r.Name)).toEqual(['After']);
  });
});

describe('Decision 14 (replaces D2): the Read me says who edits and who sees confidential requests', () => {
  it('names the whole bishopric as editors, says to tick Bishopric for five callings, and says why', () => {
    const gp = loadPortal({ seed: true });
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    const text = gp.fakes.spreadsheet.getSheetByName('Read me').raw().flat().join('\n');
    expect(text).not.toContain('only the bishop and the Executive Secretary edit this sheet');
    expect(text).toContain('the bishopric (every Leaders row with Bishopric ticked) edits this sheet');
    expect(text).toContain('the bishop, both counselors, the Executive Secretary and the Ward Clerk');
    expect(text).toContain('script');
    expect(text).toContain('Christmas and Other requests go only to the bishopric and that kind');
  });
});

describe('round 2', () => {
  it('cancellation emails are high priority: they go out at the reserve instead of waiting', () => {
    const gp = setup();
    signup(gp);
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setQuota(30); // exactly the reserve
    expect(plain(gp.apiCancelPost_({ k: linkFor(gp, 'sister.example@example.test'), postId: 'p1' })).ok).toBe(true);
    expect(gp.fakes.mail.sent.map((m) => m.subject)).toEqual(['Cancelled: Meals for the Sample family']);
    expect(gp.fakes.system.rowsOf('Outbox')).toEqual([]);
  });

  it('the menu works only for the Service Sheet owner and says how to fix it', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.state.effectiveUser = 'someone.else@example.test';
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    expect(gp.fakes.alerts.at(-1)).toContain('ward.account@example.test');
    expect(gp.fakes.alerts.at(-1)).toContain('signed in only to that account');
    expect(gp.fakes.forms.size).toBe(0);
    expect(gp.fakes.props.has('SYSTEM_ID')).toBe(false);
    // The owner is not locked out by that attempt.
    gp.fakes.state.effectiveUser = 'ward.account@example.test';
    gp.gpMenuSetUp();
    expect(gp.fakes.forms.size).toBe(4);
  });

  it('jobs stamp when they last ran, and Check health flags a job that has stopped', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    gp.gpMenuInstallTriggers();
    gp.fakes.state.fetch = () => ({ code: 200, text: JSON.stringify({ ok: true, at: 'x', build: gp.GP_BUILD }) });
    const fresh = (name) => gp.gpMenuCheckHealth().find((l) => l.includes(name + ' last ran') || l.includes(name + ' has not run'));
    // Just installed: not run yet is fine.
    expect(fresh('gpDaily')).toMatch(/^OK /);
    gp.gpTenMinute();
    gp.gpHourly();
    gp.gpDaily();
    expect(gp.fakes.props.get('LAST_RAN_gpTenMinute')).toBe('2026-12-01 10:00');
    for (const n of ['gpTenMinute', 'gpHourly', 'gpDaily']) expect(fresh(n)).toMatch(/^OK /);
    gp.fakes.setNow('2026-12-01 10:31');
    expect(fresh('gpTenMinute')).toMatch(/^PROBLEM /);
    expect(fresh('gpHourly')).toMatch(/^OK /);
    gp.fakes.setNow('2026-12-01 12:01');
    expect(fresh('gpHourly')).toMatch(/^PROBLEM /);
    expect(fresh('gpDaily')).toMatch(/^OK /);
    gp.fakes.setNow('2026-12-02 12:01');
    expect(fresh('gpDaily')).toMatch(/^PROBLEM /);
  });

  it('a job that never runs after install is flagged once its window has passed', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    gp.gpMenuInstallTriggers();
    gp.fakes.state.fetch = () => ({ code: 200, text: JSON.stringify({ ok: true, at: 'x', build: gp.GP_BUILD }) });
    gp.fakes.setNow('2026-12-01 10:45');
    expect(gp.gpMenuCheckHealth().find((l) => l.includes('gpTenMinute has not run'))).toMatch(/^PROBLEM /);
  });

  it('a refused job run leaves a Log line', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.state.activeUser = '';
    gp.gpHourly({});
    expect(gp.fakes.system.rowsOf('Log').some((l) => l.What === 'job refused' && String(l.Detail).includes('gpHourly'))).toBe(true);
  });
});
