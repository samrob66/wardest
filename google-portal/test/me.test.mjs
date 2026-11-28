// My sign-ups: one address's own sign-ups, other volunteers' first names, private details only
// while it counts, other ways to serve with fill levels only, and "Email me my link".
import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost } from './harness.mjs';
import { buildPage } from '../build.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const mailTo = (gp, to) => gp.fakes.mail.sent.filter((m) => m.to === to);
const LINK_ANSWER = 'If that address has signed up for something, a link to your sign-ups is on its way.';

function setup() {
  const gp = loadPortal({ seed: { settings: { hub_url: 'https://example.github.io/rb1links/' } } });
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03', Needed: 3 },
    { 'Slot id': 'm2', Date: '2026-12-04', Needed: 3 },
  ]);
  seedPost(gp, { 'Post id': 'p2', 'Public id': 'pubpast01', Title: 'Last week service', 'Private details': 'Old secret' }, [{ 'Slot id': 'x1', Date: '2026-12-10', Needed: 2 }]);
  seedPost(gp, { 'Post id': 'p3', 'Public id': 'pubother1', Title: 'Clean the building', Organization: 'Elders Quorum', 'Private details': 'Door code 42' }, [{ 'Slot id': 'o1', Date: '2026-12-12', Needed: 4 }]);
  const su = (body) => gp.apiSignup_({ publicId: 'pubmeals01', bringing: '', ...body });
  su({ slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
  su({ slotId: 'm1', name: 'Sister Other', email: 'sister.other@example.test' });
  su({ publicId: 'pubpast01', slotId: 'x1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
  su({ slotId: 'm2', name: 'Brother New', email: 'brother.new@example.test' });
  return gp;
}

/** The newest My sign-ups link emailed to the address (each new one replaces the last). */
const meLink = (gp, email) => tokenFrom(mailTo(gp, email).filter((m) => /me\.html#t=/.test(m.body)).at(-1).body, 'me');

describe('apiMe_', () => {
  it("shows one address's own sign-ups, others' first names, and details only while the post is on", () => {
    const gp = setup();
    const t = meLink(gp, 'brother.volunteer@example.test');
    const me = plain(gp.apiMe_({ t }));
    expect(me.ok).toBe(true);
    expect(me.upcoming.map((s) => [s.title, s.date, s.role, s.status])).toEqual([
      ['Meals for the Sample family', '2026-12-03', 'Bring a meal', 'Confirmed'],
      ['Last week service', '2026-12-10', 'Bring a meal', 'Confirmed'],
    ]);
    // Titles are skipped: "Sister Other" shows as "Other".
    expect(me.upcoming[0].others).toEqual(['Other']);
    expect(me.upcoming[0].privateDetails).toBe('123 Example Lane');
    const json = JSON.stringify(me);
    for (const bad of ['@example.test', 'Brother New', 'Brother Volunteer', 'cancelToken']) expect(json).not.toContain(bad);
    expect(me.otherWays.map((o) => o.title)).toEqual(['Clean the building']);
    expect(Object.keys(me.otherWays[0]).sort()).toEqual(['filled', 'needed', 'title', 'url']);
    expect(json).not.toContain('Door code 42');
    // After the date the sign-up is past and its details are gone.
    gp.fakes.setNow('2026-12-11 09:00');
    const later = plain(gp.apiMe_({ t }));
    expect(later.past.map((s) => s.title)).toEqual(['Meals for the Sample family', 'Last week service']);
    expect(JSON.stringify(later)).not.toContain('123 Example Lane');
    expect(JSON.stringify(later)).not.toContain('Old secret');
    expect(later.past[0].signupId).toBeUndefined();
  });

  it('a waiting volunteer sees their sign-up without details, names or other ways to serve, and can cancel it', () => {
    const gp = setup();
    const pending = gp.fakes.spreadsheet.rowsOf('Sign-ups').find((s) => s.Email === 'brother.new@example.test');
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiRequestMeLink_({ email: 'Brother.New@example.test' }))).toEqual({ ok: true, message: LINK_ANSWER });
    const t = meLink(gp, 'brother.new@example.test');
    const me = plain(gp.apiMe_({ t }));
    expect(me.upcoming).toHaveLength(1);
    expect(me.upcoming[0]).toMatchObject({ status: 'Waiting-email', others: [] });
    expect(me.upcoming[0].privateDetails).toBeUndefined();
    expect(me.otherWays).toEqual([]);
    expect(JSON.stringify(me)).not.toContain('123 Example Lane');
    expect(me.upcoming[0].canResend).toBe(true);
    // My sign-ups is read-only: no tokens are written by showing it.
    const tokens = gp.fakes.system.rowsOf('Tokens').length;
    gp.apiMe_({ t });
    expect(gp.fakes.system.rowsOf('Tokens')).toHaveLength(tokens);
    // Another address's sign-up can't be cancelled with this link.
    const other = gp.fakes.spreadsheet.rowsOf('Sign-ups').find((s) => s.Email === 'sister.other@example.test');
    expect(plain(gp.apiCancelMine_({ t, signupId: other['Sign-up id'] }))).toEqual({ ok: false, error: 'Not found.' });
    // "Send the confirm email again".
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiResendConfirm_({ t, signupId: me.upcoming[0].signupId })).ok).toBe(true);
    expect(gp.fakes.mail.sent.map((m) => m.subject)).toEqual(['Please confirm your email: Meals for the Sample family']);
    expect(plain(gp.apiCancelMine_({ t, signupId: me.upcoming[0].signupId })).ok).toBe(true);
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').find((s) => s['Sign-up id'] === pending['Sign-up id']).Status).toBe('Cancelled');
    expect(plain(gp.apiMe_({ t })).upcoming).toEqual([]);
  });

  it('a link for another kind, an old link or junk is refused', () => {
    const gp = setup();
    expect(plain(gp.apiMe_({ t: 'f'.repeat(64) })).ok).toBe(false);
    const first = meLink(gp, 'brother.volunteer@example.test');
    gp.fakes.mail.sent.length = 0;
    gp.apiRequestMeLink_({ email: 'brother.volunteer@example.test' });
    // A new link replaces the old one.
    expect(plain(gp.apiMe_({ t: first })).ok).toBe(false);
    expect(plain(gp.apiMe_({ t: meLink(gp, 'brother.volunteer@example.test') })).ok).toBe(true);
  });
});

describe('apiRequestMeLink_', () => {
  it('answers the same for an unknown address and sends nothing; at most 3 a day', () => {
    const gp = setup();
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiRequestMeLink_({ email: 'nobody@example.test' }))).toEqual({ ok: true, message: LINK_ANSWER });
    expect(plain(gp.apiRequestMeLink_({ email: 'not an email' }))).toEqual({ ok: true, message: LINK_ANSWER });
    expect(gp.fakes.mail.sent).toEqual([]);
    for (let i = 0; i < 4; i++) expect(plain(gp.apiRequestMeLink_({ email: 'sister.other@example.test' }))).toEqual({ ok: true, message: LINK_ANSWER });
    expect(mailTo(gp, 'sister.other@example.test')).toHaveLength(3);
    const logs = gp.fakes.system.rowsOf('Log').filter((l) => l.What === 'me link requested');
    expect(logs.map((l) => l.Detail).join(' ')).not.toContain('sister');
  });
});

describe('me.html and confirm.html', () => {
  it('the My sign-ups page is built and served like the others', () => {
    const html = buildPage('me');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain("GP.call('me'");
    expect(html).toContain("'requestMeLink'");
    const gp = loadPortal({ seed: true });
    const out = gp.doGet({ parameter: { page: 'me' } });
    expect(out.title).toBe('My Sign-ups · Riverbend 1st Ward (example)');
  });

  it('the confirm page has a button for each kind of link', () => {
    const html = buildPage('confirm');
    for (const s of ["'confirm'", "'withdraw'", "'cancel'", 'Confirm my email', 'Withdraw my offer', 'Cancel my sign-up']) expect(html).toContain(s);
  });
});
