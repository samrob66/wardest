import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
// The cancel/confirm link (2.4.1: the My sign-ups link now comes first in the email).
const tokenFrom = (text) => /confirm[^\s"]*#t=([0-9a-f]{64})/.exec(text)[1];
const VOLUNTEER = { name: 'Brother Volunteer', email: 'brother.volunteer@example.test' };

function setup() {
  const gp = loadPortal({ seed: true });
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03' },
    { 'Slot id': 'm2', Date: '2026-12-04', Needed: 20, 'Bringing prompt': '' },
    { 'Slot id': 'm3', Date: '2026-12-05', Needed: 20 },
    { 'Slot id': 'm4', Date: '2026-12-06', Needed: 20 },
  ]);
  seedPost(gp, { 'Post id': 'p2', 'Public id': 'pubdraft01', Title: 'Draft activity', Status: 'Draft', 'Private details': 'secret draft' }, [{ 'Slot id': 'd1' }]);
  return gp;
}

const signup = (gp, over = {}) => plain(gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', ...VOLUNTEER, bringing: 'Soup', ...over }));

describe('apiServe_ and apiPost_', () => {
  it('lists Open posts only and never names, emails or private details', () => {
    const gp = setup();
    expect(signup(gp).ok).toBe(true);
    const serve = plain(gp.apiServe_());
    expect(serve.ok).toBe(true);
    expect(serve.ward).toEqual({ name: 'Riverbend 1st Ward (example)', contact: 'help@riverbend.example', serveLink: '', helpLink: '' });
    expect(serve.posts.map((p) => p.publicId)).toEqual(['pubmeals01']);
    expect(serve.posts[0]).toMatchObject({ needed: 61, filled: 1 });
    const post = plain(gp.apiPost_('pubmeals01'));
    expect(post.post.slots.find((s) => s.slotId === 'm1')).toMatchObject({ filled: 1, full: true });
    const token = tokenFrom(gp.fakes.mail.sent[0].body);
    const info = plain(gp.apiTokenInfo_({ t: token }));
    for (const json of [JSON.stringify(serve), JSON.stringify(post), JSON.stringify(info)]) {
      for (const bad of ['Brother Volunteer', 'brother.volunteer@example.test', '123 Example Lane', 'Soup', 'sister.example@example.test']) {
        expect(json).not.toContain(bad);
      }
    }
  });

  it('hides drafts and unknown posts, shows Past posts as Past', () => {
    const gp = setup();
    expect(plain(gp.apiPost_('pubdraft01'))).toEqual({ ok: false, error: 'This opportunity was not found.' });
    expect(plain(gp.apiPost_('nope'))).toEqual({ ok: false, error: 'This opportunity was not found.' });
    const t = gp.serviceTab_('Posts');
    t.update(t.find('Post id', 'p1'), { Status: 'Past' });
    expect(plain(gp.apiPost_('pubmeals01')).post.status).toBe('Past');
  });

  it('leaves out posts with no date today or later', () => {
    const gp = setup();
    gp.fakes.setNow('2026-12-07 08:00');
    gp.cache_().remove('serve');
    expect(plain(gp.apiServe_()).posts).toEqual([]);
  });

  it('caches serve for a minute and a sign-up clears it', () => {
    const gp = setup();
    gp.apiServe_();
    const reads = gp.fakes.spreadsheet.counters.reads;
    gp.apiServe_();
    expect(gp.fakes.spreadsheet.counters.reads).toBe(reads);
    signup(gp);
    const after = plain(gp.apiServe_());
    expect(after.posts[0].filled).toBe(1);
  });
});

describe('apiSignup_', () => {
  it('stores a formula-looking name as text', () => {
    const gp = setup();
    expect(signup(gp, { name: '=IMPORTXML("http://x","//a")' }).ok).toBe(true);
    const row = gp.fakes.spreadsheet.rowsOf('Sign-ups')[0];
    expect(row.Name).toBe('\'=IMPORTXML("http://x","//a")');
    expect(row.Status).toBe('Confirmed');
    expect(row.Email).toBe('brother.volunteer@example.test');
    expect(gp.fakes.spreadsheet.rowsOf('Slots').find((s) => s['Slot id'] === 'm1').Filled).toBe(1);
  });

  it('answers without private details or other names', () => {
    const gp = setup();
    const r = signup(gp);
    expect(r).toEqual({ ok: true, message: 'Thanks. Check your email to finish or see your sign-up.' });
  });

  it('a full role and a duplicate answer the same sentence (phase 2: outcomes by email); bad fields and a draft are refused', () => {
    const gp = setup();
    signup(gp);
    gp.fakes.mail.sent.length = 0;
    expect(signup(gp, { email: 'sister.other@example.test' })).toEqual({ ok: true, message: 'Thanks. Check your email to finish or see your sign-up.' });
    expect(gp.fakes.mail.sent.map((m) => [m.to, m.subject])).toEqual([['sister.other@example.test', 'This role is already filled: Meals for the Sample family']]);
    expect(signup(gp, { slotId: 'm2' }).ok).toBe(true);
    expect(signup(gp, { slotId: 'm2' })).toEqual({ ok: true, message: 'Thanks. Check your email to finish or see your sign-up.' });
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').filter((r) => r['Slot id'] === 'm2')).toHaveLength(1);
    const bad = signup(gp, { name: '', email: 'x@y', bringing: 'b'.repeat(201), slotId: 'm3' });
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.fields).sort()).toEqual(['bringing', 'email', 'name']);
    expect(signup(gp, { publicId: 'pubdraft01', slotId: 'd1' }).error).toBe('This opportunity was not found.');
  });

  it('sends a confirmation whose cancel link reads back', () => {
    const gp = setup();
    signup(gp);
    const mail = gp.fakes.mail.sent[0];
    expect(mail.to).toBe('brother.volunteer@example.test');
    // Phase 2: an approved volunteer's confirmation carries the private details.
    expect(mail.body).toContain('123 Example Lane');
    expect(mail.body).toContain('https://script.example.test/macros/s/EXAMPLE/exec?page=confirm#t=');
    const info = plain(gp.apiTokenInfo_({ t: tokenFrom(mail.body) }));
    expect(info).toEqual({ ok: true, kind: 'cancel', title: 'Meals for the Sample family', date: '2026-12-03', start: '17:00', role: 'Bring a meal', status: 'Confirmed' });
    expect(plain(gp.apiTokenInfo_({ t: 'f'.repeat(64) })).ok).toBe(false);
  });

  it('limits sign-up emails to 3 per address per day', () => {
    const gp = setup();
    for (const slotId of ['m1', 'm2', 'm3']) expect(signup(gp, { slotId }).ok).toBe(true);
    expect(signup(gp, { slotId: 'm4' }).error).toBe('Too many sign-ups right now. Please try again later or contact help@riverbend.example.');
    gp.fakes.setNow('2026-12-02 08:00');
    expect(signup(gp, { slotId: 'm4' }).ok).toBe(true);
  });

  it('limits a post to 10 sign-ups a minute', () => {
    const gp = setup();
    for (let i = 0; i < 10; i++) expect(signup(gp, { slotId: 'm2', email: `person${i}@example.test` }).ok).toBe(true);
    expect(signup(gp, { slotId: 'm2', email: 'person10@example.test' }).error).toMatch(/^Too many sign-ups right now/);
    gp.fakes.setNow('2026-12-01 10:01');
    expect(signup(gp, { slotId: 'm2', email: 'person10@example.test' }).ok).toBe(true);
  });

  it('limits sign-ups per day from Settings', () => {
    const gp = setup();
    gp.serviceTab_('Settings');
    const t = gp.serviceTab_('Settings');
    t.update(t.find('Key', 'signup_limit_per_day'), { Value: 2 });
    gp.gpBegin_();
    expect(signup(gp, { slotId: 'm2', email: 'a1@example.test' }).ok).toBe(true);
    expect(signup(gp, { slotId: 'm2', email: 'a2@example.test' }).ok).toBe(true);
    expect(signup(gp, { slotId: 'm2', email: 'a3@example.test' }).ok).toBe(false);
  });
});

describe('apiCancel_', () => {
  it('cancels before the cutoff with a Cancellation notice to the organization leaders', () => {
    const gp = setup();
    signup(gp);
    const t = tokenFrom(gp.fakes.mail.sent[0].body);
    gp.fakes.mail.sent.length = 0;
    const r = plain(gp.apiCancel_({ t }));
    expect(r).toEqual({ ok: true, message: 'Your sign-up is cancelled. Thank you for letting us know.' });
    expect(gp.fakes.mail.sent.map((m) => [m.to, m.subject])).toEqual([['sister.example@example.test', 'Cancellation: Meals for the Sample family']]);
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups')[0]).toMatchObject({ Status: 'Cancelled', 'Cancelled at': '2026-12-01 10:00' });
    expect(gp.fakes.spreadsheet.rowsOf('Slots').find((s) => s['Slot id'] === 'm1').Filled).toBe(0);
    // The link no longer works once used.
    expect(plain(gp.apiCancel_({ t })).ok).toBe(false);
    // The role is open again.
    expect(signup(gp, { email: 'sister.other@example.test' }).ok).toBe(true);
  });

  it("after the cutoff tells leaders they're short", () => {
    const gp = setup();
    signup(gp);
    const t = tokenFrom(gp.fakes.mail.sent[0].body);
    gp.fakes.setNow('2026-12-02 17:00');
    gp.apiCancel_({ t });
    expect(gp.fakes.mail.sent.at(-1).subject).toBe("You're now short: Meals for the Sample family");
  });

  it('says already cancelled for a sign-up a leader removed', () => {
    const gp = setup();
    signup(gp);
    const t = tokenFrom(gp.fakes.mail.sent[0].body);
    const tab = gp.serviceTab_('Sign-ups');
    tab.update(tab.rows()[0], { Status: 'Removed' });
    expect(plain(gp.apiCancel_({ t }))).toEqual({ ok: true, message: 'This sign-up is already cancelled.' });
  });
});

describe('apiHelp_ and apiRequestLeaderLink_', () => {
  it('lists request categories that have a form', () => {
    const gp = setup();
    const form = gp.FormApp.create('Moving help');
    gp.systemTab_('Request files').append({ 'Category id': 'moving', 'Folder id': 'f', 'Form id': form.getId(), 'Sheet id': 's', Month: '2026-12' });
    const r = plain(gp.apiHelp_());
    expect(r.tiles).toEqual([{ id: 'moving', name: 'Moving help', icon: '🚚', url: form.getPublishedUrl() }]);
  });

  it('requestLeaderLink answers the same either way', () => {
    const gp = setup();
    expect(plain(gp.apiRequestLeaderLink_({ email: 'stranger@example.test' }))).toEqual(plain(gp.apiRequestLeaderLink_({ email: 'sister.example@example.test' })));
  });
});
