import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');

function setup() {
  const gp = loadPortal({ seed: true });
  seedPost(gp, {}, [{ 'Slot id': 'm1' }, { 'Slot id': 'm2', Date: '2026-12-04', Needed: 2 }]);
  seedPost(gp, { 'Post id': 'p2', 'Public id': 'pubprimary', Organization: 'Primary', Category: 'children', Title: 'Primary activity helpers', 'Private details': 'Gate code 1234', 'Created by': 'sister.helper@example.test' }, [{ 'Slot id': 'c1', Date: '2026-12-05', Needed: 3 }]);
  gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test', bringing: 'Soup' });
  gp.apiSignup_({ publicId: 'pubprimary', slotId: 'c1', name: 'Sister Volunteer', email: 'sister.volunteer@example.test' });
  gp.fakes.mail.sent.length = 0;
  return gp;
}
const signupId = (gp, email) => gp.fakes.spreadsheet.rowsOf('Sign-ups').find((r) => r.Email === email)['Sign-up id'];

const newPost = (over = {}) => ({
  organization: 'Relief Society',
  category: 'meals',
  title: 'Meals for the Example family',
  audiences: ['Sisters'],
  publicNote: 'Dinners for a week.',
  privateDetails: '9 Sample Road',
  cutoffHours: '',
  slots: [{ date: '2026-12-08', start: '17:00', end: '18:00', role: 'Bring a meal', needed: 1, roleNote: '', bringingPrompt: 'What are you bringing?' }],
  ...over,
});

describe('who am I', () => {
  it('names the leader and what they may do', () => {
    const gp = setup();
    const r = plain(gp.apiWhoami_({ k: linkFor(gp, 'sister.helper@example.test') }));
    expect(r.ok).toBe(true);
    expect(r.leader).toEqual({ name: 'Sister Helper', calling: 'Primary Secretary', organization: 'Primary' });
    expect(r.access).toEqual({ isBishopric: false, createOrgs: ['Primary'], editOrgs: ['Primary'] });
    expect(r.categories.map((c) => c.id)).toContain('meals');
    expect(r.categories.map((c) => c.id)).not.toContain('moving');
    expect(r.defaults).toEqual({ cutoffHours: 24 });
  });

  it('a removed leader is asked to get a new link', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.helper@example.test');
    const t = gp.serviceTab_('Leaders');
    t.remove(t.find('Email', 'sister.helper@example.test'));
    gp.gpBegin_();
    expect(plain(gp.apiWhoami_({ k }))).toEqual({ ok: false, error: 'This leader link has expired or is no longer valid. Ask for a new one.', relink: true });
    expect(plain(gp.apiListPosts_({ k })).relink).toBe(true);
    expect(plain(gp.apiWhoami_({})).relink).toBe(true);
  });
});

describe('org editor of Primary', () => {
  it('sees Primary posts with names and nothing of Relief Society', () => {
    const gp = setup();
    const r = plain(gp.apiListPosts_({ k: linkFor(gp, 'sister.helper@example.test') }));
    expect(r.posts.map((p) => p.postId)).toEqual(['p2']);
    expect(r.posts[0].canEdit).toBe(true);
    expect(r.posts[0].signups.map((s) => [s.name, s.email])).toEqual([['Sister Volunteer', 'sister.volunteer@example.test']]);
    expect(JSON.stringify(r)).not.toContain('Brother Volunteer');
  });

  it('cannot open, save or remove on a Relief Society post', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.helper@example.test');
    expect(plain(gp.apiGetPost_({ k, postId: 'p1' })).ok).toBe(false);
    expect(plain(gp.apiSavePost_({ k, action: 'publish', post: { ...newPost(), postId: 'p1' } })).ok).toBe(false);
    expect(plain(gp.apiSavePost_({ k, action: 'close', post: { postId: 'p1' } })).ok).toBe(false);
    expect(plain(gp.apiSavePost_({ k, action: 'draft', post: newPost() })).fields.organization).toBeTruthy();
    expect(plain(gp.apiRemoveSignup_({ k, signupId: signupId(gp, 'brother.volunteer@example.test') })).ok).toBe(false);
    expect(plain(gp.apiSendDetails_({ k, signupId: signupId(gp, 'brother.volunteer@example.test') })).ok).toBe(false);
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').every((s) => s.Status === 'Confirmed')).toBe(true);
    expect(gp.fakes.mail.sent).toHaveLength(0);
  });
});

describe('ward council member of Elders Quorum', () => {
  it("sees the Relief Society post's names but no emails, and cannot edit it", () => {
    const gp = setup();
    const r = plain(gp.apiListPosts_({ k: linkFor(gp, 'brother.sample@example.test') }));
    const rs = r.posts.find((p) => p.postId === 'p1');
    expect(rs.canEdit).toBe(false);
    expect(rs.signups[0].name).toBe('Brother Volunteer');
    expect(rs.signups[0].email).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('brother.volunteer@example.test');
    expect(JSON.stringify(r)).not.toContain('123 Example Lane');
    expect(plain(gp.apiGetPost_({ k: linkFor(gp, 'brother.sample@example.test'), postId: 'p1' })).ok).toBe(false);
  });
});

describe('bishopric', () => {
  it('edits any post and records the leader name', () => {
    const gp = setup();
    const k = linkFor(gp, 'brother.counselor@example.test');
    const got = plain(gp.apiGetPost_({ k, postId: 'p2' }));
    expect(got.post.privateDetails).toBe('Gate code 1234');
    gp.fakes.setNow('2026-12-01 11:00');
    const input = { ...got.post, title: 'Primary activity helpers needed' };
    const r = plain(gp.apiSavePost_({ k, action: 'publish', post: input }));
    expect(r.ok).toBe(true);
    const row = gp.fakes.spreadsheet.rowsOf('Posts').find((p) => p['Post id'] === 'p2');
    expect(row).toMatchObject({ Title: 'Primary activity helpers needed', 'Last changed by': 'Brother Counselor', 'Last changed at': '2026-12-01 11:00', 'Created by': 'sister.helper@example.test' });
  });
});

describe('saving posts', () => {
  it('a draft is not on serve; publishing puts it there', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    const d = plain(gp.apiSavePost_({ k, action: 'draft', post: newPost() }));
    expect(d.ok).toBe(true);
    expect(d.publicUrl).toBe(`https://script.example.test/macros/s/EXAMPLE/exec?page=post#p=${d.publicId}`);
    expect(plain(gp.apiServe_()).posts.map((p) => p.publicId)).not.toContain(d.publicId);
    const row = gp.fakes.spreadsheet.rowsOf('Posts').find((p) => p['Post id'] === d.postId);
    expect(row).toMatchObject({ Status: 'Draft', 'Created by': 'sister.example@example.test', 'Last changed by': 'Sister Example', 'Cancel cutoff hours': 24 });
    const got = plain(gp.apiGetPost_({ k, postId: d.postId })).post;
    const p = plain(gp.apiSavePost_({ k, action: 'publish', post: got }));
    expect(p.ok).toBe(true);
    expect(plain(gp.apiServe_()).posts.map((x) => x.publicId)).toContain(d.publicId);
  });

  it('publish with a past date names the field', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    const r = plain(gp.apiSavePost_({ k, action: 'publish', post: newPost({ slots: [{ date: '2026-11-20', role: 'Cook', needed: 1 }] }) }));
    expect(r.ok).toBe(false);
    expect(Object.keys(r.fields)).toEqual(['slots[0].date']);
  });

  it('adds, changes and deletes slots, but not one with people signed up', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    const got = plain(gp.apiGetPost_({ k, postId: 'p1' })).post;
    expect(got.slots.map((s) => s.slotId)).toEqual(['m1', 'm2']);
    const withoutM1 = { ...got, slots: got.slots.filter((s) => s.slotId !== 'm1') };
    expect(plain(gp.apiSavePost_({ k, action: 'publish', post: withoutM1 })).error).toBe('Remove the people signed up for this date first.');
    const changed = {
      ...got,
      slots: [got.slots[0], { date: '2026-12-09', role: 'Bring a meal', needed: 1 }],
    };
    expect(plain(gp.apiSavePost_({ k, action: 'publish', post: changed })).ok).toBe(true);
    const slots = gp.fakes.spreadsheet.rowsOf('Slots').filter((s) => s['Post id'] === 'p1');
    expect(slots.map((s) => s.Date)).toEqual(['2026-12-03', '2026-12-09']);
    const tooFew = { ...got, slots: [{ ...got.slots[0], needed: 0 }] };
    expect(plain(gp.apiSavePost_({ k, action: 'publish', post: tooFew })).ok).toBe(false);
  });

  it('closes a post', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    expect(plain(gp.apiSavePost_({ k, action: 'close', post: { postId: 'p1' } })).ok).toBe(true);
    expect(gp.fakes.spreadsheet.rowsOf('Posts').find((p) => p['Post id'] === 'p1').Status).toBe('Closed');
    expect(plain(gp.apiServe_()).posts.map((p) => p.publicId)).not.toContain('pubmeals01');
  });
});

describe('sign-ups on the leader page', () => {
  it('removing someone emails them and reopens the role', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    const id = signupId(gp, 'brother.volunteer@example.test');
    const r = plain(gp.apiRemoveSignup_({ k, signupId: id }));
    expect(r.ok).toBe(true);
    expect(gp.fakes.mail.sent.map((m) => [m.to, m.subject])).toEqual([['brother.volunteer@example.test', 'Your sign-up was removed: Meals for the Sample family']]);
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').find((s) => s['Sign-up id'] === id)).toMatchObject({ Status: 'Removed', 'Removed by': 'Sister Example' });
    expect(plain(gp.apiPost_('pubmeals01')).post.slots[0]).toMatchObject({ filled: 0, full: false });
    // Their cancel link no longer works.
    expect(gp.fakes.system.rowsOf('Tokens').some((t) => t.Subject === id)).toBe(false);
  });

  it('Send details emails the private details and stamps the row', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    const id = signupId(gp, 'brother.volunteer@example.test');
    const list = plain(gp.apiListPosts_({ k }));
    expect(list.posts.find((p) => p.postId === 'p1').signups[0].detailsSent).toBe(false);
    expect(plain(gp.apiSendDetails_({ k, signupId: id })).ok).toBe(true);
    expect(gp.fakes.mail.sent[0].body).toContain('123 Example Lane');
    const after = plain(gp.apiListPosts_({ k }));
    expect(after.posts.find((p) => p.postId === 'p1').signups[0].detailsSent).toBe(true);
  });

  it('sign out everywhere replaces the link', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    const r = plain(gp.apiSignOutEverywhere_({ k }));
    expect(r).toEqual({ ok: true, message: 'We emailed you a new leader link. The old one no longer works.' });
    expect(plain(gp.apiWhoami_({ k })).relink).toBe(true);
    const k2 = /#k=([0-9a-f]{64})/.exec(gp.fakes.mail.sent[0].body)[1];
    expect(plain(gp.apiWhoami_({ k: k2 })).ok).toBe(true);
  });

  it('lists Past posts only when asked', () => {
    const gp = setup();
    const t = gp.serviceTab_('Posts');
    t.update(t.find('Post id', 'p1'), { Status: 'Past' });
    const k = linkFor(gp, 'bishop.example@example.test');
    expect(plain(gp.apiListPosts_({ k })).posts.map((p) => p.postId)).toEqual(['p2']);
    expect(plain(gp.apiListPosts_({ k, past: true })).posts.map((p) => p.postId)).toEqual(['p1']);
  });
});
