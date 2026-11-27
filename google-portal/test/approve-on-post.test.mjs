// 2.3.2: Approve / Decline on the post itself (decision 22). The same rule as the Waiting for
// approval tab (canApprove); a post-side decision names the sign-up, never an address.
import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');
const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const NEW = 'brother.new@example.test';
const LATE = 'sister.late@example.test';

function setup() {
  const gp = loadPortal({ seed: true });
  const ct = gp.serviceTab_('Categories');
  ct.update(ct.find('Id', 'meals'), { Coordinators: 'sister.coordinator@example.test' });
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03', Needed: 1 },
    { 'Slot id': 'm2', Date: '2026-12-04', Needed: 5 },
  ]);
  seedPost(gp, { 'Post id': 'p5', 'Public id': 'pubeq01', Title: 'Help the Example family move', Organization: 'Elders Quorum', Category: 'moving-help', 'Created by': 'brother.sample@example.test' }, [
    { 'Slot id': 'e1', Date: '2026-12-06', Needed: 6 },
  ]);
  // NEW: first signs up for the Relief Society meal, then the Elders Quorum move; confirms.
  gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
  gp.apiSignup_({ publicId: 'pubeq01', slotId: 'e1', name: 'Brother New', email: NEW });
  const t = tokenFrom(gp.fakes.mail.sent.find((m) => m.to === NEW).body, 'confirm');
  expect(plain(gp.apiConfirm_({ t })).ok).toBe(true);
  // LATE: signs up but has not clicked the email yet.
  gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Late', email: LATE });
  gp.fakes.mail.sent.length = 0;
  gp.gpBegin_();
  return gp;
}

function signupOn(gp, leader, postId, name) {
  const posts = plain(gp.apiListPosts_({ k: linkFor(gp, leader) })).posts;
  const p = posts.find((x) => x.postId === postId);
  return p ? { post: p, su: p.signups.find((s) => s.name === name) } : { post: null, su: null };
}

describe('Approve / Decline on the post (decision 22)', () => {
  it('an approver sees canDecide on the waiting sign-up; approving from there confirms all of that volunteer\'s waiting sign-ups', () => {
    const gp = setup();
    // Sister Example (Relief Society, ward council) can approve: NEW's first post is the RS meal.
    const { su } = signupOn(gp, 'sister.example@example.test', 'p1', 'Brother New');
    expect(su.status).toBe('Waiting-approval');
    expect(su.canDecide).toBe(true);
    const r = plain(gp.apiDecide_({ k: linkFor(gp, 'sister.example@example.test'), signupId: su.signupId, decision: 'approve' }));
    expect(r).toMatchObject({ ok: true });
    expect(r.message).toMatch(/^Approved\. 2 sign-ups now count\./);
    const rows = gp.fakes.spreadsheet.rowsOf('Sign-ups').filter((x) => x.Email === NEW);
    expect(rows.map((x) => x.Status)).toEqual(['Confirmed', 'Confirmed']);
    expect(gp.fakes.spreadsheet.rowsOf('Volunteers').find((v) => v.Email === NEW)).toMatchObject({ Status: 'Approved', 'Decided by': 'Sister Example' });
  });

  it('decline from the post works the same way', () => {
    const gp = setup();
    const { su } = signupOn(gp, 'bishop.example@example.test', 'p5', 'Brother New');
    expect(su.canDecide).toBe(true);
    const r = plain(gp.apiDecide_({ k: linkFor(gp, 'bishop.example@example.test'), signupId: su.signupId, decision: 'decline' }));
    expect(r.ok).toBe(true);
    expect(gp.fakes.spreadsheet.rowsOf('Volunteers').find((v) => v.Email === NEW).Status).toBe('Declined');
  });

  it('a leader who can\'t approve this volunteer gets canDecide false, and decide is still refused', () => {
    const gp = setup();
    // Elders Quorum president: NEW's FIRST post is the Relief Society's, so not his to approve.
    const eq = signupOn(gp, 'brother.sample@example.test', 'p5', 'Brother New');
    expect(eq.su.status).toBe('Waiting-approval');
    expect(eq.su.canDecide).toBe(false);
    const r = plain(gp.apiDecide_({ k: linkFor(gp, 'brother.sample@example.test'), signupId: eq.su.signupId, decision: 'approve' }));
    expect(r.ok).toBe(false);
    // The meal coordinator sees and edits the meal post but coordinators don't approve.
    const co = signupOn(gp, 'sister.coordinator@example.test', 'p1', 'Brother New');
    expect(co.su.canDecide).toBe(false);
    expect(plain(gp.apiDecide_({ k: linkFor(gp, 'sister.coordinator@example.test'), signupId: co.su.signupId, decision: 'approve' })).ok).toBe(false);
    expect(gp.fakes.spreadsheet.rowsOf('Volunteers').find((v) => v.Email === NEW).Status).toBe('Pending');
  });

  it('a sign-up still waiting for the email click has no decision', () => {
    const gp = setup();
    const { su } = signupOn(gp, 'bishop.example@example.test', 'p1', 'Sister Late');
    expect(su.status).toBe('Waiting-email');
    expect(su.canDecide).toBe(false);
    expect(plain(gp.apiDecide_({ k: linkFor(gp, 'bishop.example@example.test'), signupId: su.signupId, decision: 'approve' })).ok).toBe(false);
  });

  it('an unknown sign-up id is refused', () => {
    const gp = setup();
    expect(plain(gp.apiDecide_({ k: linkFor(gp, 'bishop.example@example.test'), signupId: 'snope', decision: 'approve' })).ok).toBe(false);
  });

  it('listPosts shows no address to a leader who could not see it before', () => {
    const gp = setup();
    // Sister Example (Relief Society) may approve NEW (first post: the RS meal) and sees the
    // Elders Quorum move, but can't edit it: she gets the buttons there, and still no addresses.
    const rs = signupOn(gp, 'sister.example@example.test', 'p5', 'Brother New');
    expect(rs.post.canEdit).toBe(false);
    expect(rs.su.canDecide).toBe(true);
    expect(JSON.stringify(rs.post)).not.toContain(NEW);
    for (const s of rs.post.signups) expect(s.email).toBeUndefined();
    expect(plain(gp.apiDecide_({ k: linkFor(gp, 'sister.example@example.test'), signupId: rs.su.signupId, decision: 'approve' })).ok).toBe(true);
    // The bishopric could edit it before and still sees them.
    const b = signupOn(gp, 'bishop.example@example.test', 'p1', 'Brother New');
    expect(b.post.canEdit).toBe(true);
    expect(b.su.email).toBe(NEW);
  });
});
