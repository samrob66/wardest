// Phase 2 leader page API: approvals with records, bishopric undo/revoke, waiting counts,
// coordinators, Needs help soon, and the end of Send details.
import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');
const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const rows = (gp, tab = 'Sign-ups') => gp.fakes.spreadsheet.rowsOf(tab);
const mailTo = (gp, to) => gp.fakes.mail.sent.filter((m) => m.to === to);
const NEW = 'brother.new@example.test';

function setup() {
  const gp = loadPortal({ seed: true });
  const ct = gp.serviceTab_('Categories');
  ct.update(ct.find('Id', 'meals'), { Coordinators: 'sister.coordinator@example.test' });
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03', Needed: 1 },
    { 'Slot id': 'm2', Date: '2026-12-04', Needed: 5 },
  ]);
  seedPost(gp, { 'Post id': 'p5', 'Public id': 'pubeq01', Title: 'Help the Example family move', Organization: 'Elders Quorum', Category: 'moving-help', 'Created by': 'brother.sample@example.test', 'Private details': '9 Sample Road' }, [
    { 'Slot id': 'e1', Date: '2026-12-06', Needed: 6 },
  ]);
  seedPost(gp, { 'Post id': 'p6', 'Public id': 'pubeqmeal', Title: 'Elders quorum meal', Organization: 'Elders Quorum', Category: 'meals', 'Created by': 'brother.sample@example.test' }, [
    { 'Slot id': 'q1', Date: '2026-12-08', Needed: 2 },
  ]);
  return gp;
}

/** A new address signs up for RS's meals (m2) and EQ's move (e1), then confirms: both wait for approval. */
function waitingVolunteer(gp) {
  gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
  gp.apiSignup_({ publicId: 'pubeq01', slotId: 'e1', name: 'Brother New', email: NEW });
  const t = tokenFrom(mailTo(gp, NEW)[0].body, 'confirm');
  expect(plain(gp.apiConfirm_({ t })).ok).toBe(true);
  gp.fakes.mail.sent.length = 0;
}

describe('Waiting for approval', () => {
  it('only the first post organization and the bishopric see and decide', () => {
    const gp = setup();
    waitingVolunteer(gp);
    const eq = linkFor(gp, 'brother.sample@example.test');
    expect(plain(gp.apiWaiting_({ k: eq }))).toEqual({ ok: true, volunteers: [] });
    expect(plain(gp.apiDecide_({ k: eq, email: NEW, decision: 'approve' }))).toEqual({ ok: false, error: "You can't approve or decline this person." });
    expect(rows(gp, 'Volunteers').find((v) => v.Email === NEW).Status).toBe('Pending');
    const rs = linkFor(gp, 'sister.example@example.test');
    const w = plain(gp.apiWaiting_({ k: rs }));
    expect(w.volunteers).toHaveLength(1);
    expect(w.volunteers[0]).toMatchObject({ email: NEW, name: 'Brother New', firstPost: 'Meals for the Sample family' });
    expect(w.volunteers[0].signups.map((s) => s.title).sort()).toEqual(['Help the Example family move', 'Meals for the Sample family']);
    const bishop = plain(gp.apiWaiting_({ k: linkFor(gp, 'brother.counselor@example.test') }));
    expect(bishop.volunteers).toHaveLength(1);
    // A coordinator of meals manages meals posts but doesn't approve.
    expect(plain(gp.apiWaiting_({ k: linkFor(gp, 'sister.coordinator@example.test') })).volunteers).toEqual([]);
  });

  it('approving records the leader, counts every waiting sign-up and emails each with details', () => {
    const gp = setup();
    waitingVolunteer(gp);
    const r = plain(gp.apiDecide_({ k: linkFor(gp, 'sister.example@example.test'), email: NEW, decision: 'approve' }));
    expect(r.ok).toBe(true);
    expect(rows(gp, 'Volunteers').find((v) => v.Email === NEW)).toMatchObject({ Status: 'Approved', 'Decided by': 'Sister Example', 'Decided at': '2026-12-01 10:00' });
    expect(rows(gp).filter((s) => s.Email === NEW).map((s) => s.Status)).toEqual(['Confirmed', 'Confirmed']);
    const mails = mailTo(gp, NEW);
    expect(mails.map((m) => m.subject)).toEqual([
      "You're approved to serve: Riverbend 1st Ward (example)",
      "You're signed up: Meals for the Sample family",
      "You're signed up: Help the Example family move",
    ]);
    expect(mails[1].body).toContain('123 Example Lane');
    expect(mails[2].body).toContain('9 Sample Road');
    // One My sign-ups link for the batch: both emails carry the same, working link.
    const me1 = tokenFrom(mails[1].body, 'me');
    expect(tokenFrom(mails[2].body, 'me')).toBe(me1);
    expect(rows(gp, 'Slots').find((s) => s['Slot id'] === 'm2')).toMatchObject({ Filled: 1, Waiting: 0 });
    expect(plain(gp.apiDecide_({ k: linkFor(gp, 'sister.example@example.test'), email: NEW, decision: 'approve' })).ok).toBe(false);
  });

  it('declining lapses the waiting sign-ups and sends a polite email', () => {
    const gp = setup();
    waitingVolunteer(gp);
    expect(plain(gp.apiDecide_({ k: linkFor(gp, 'bishop.example@example.test'), email: NEW, decision: 'decline' })).ok).toBe(true);
    expect(rows(gp, 'Volunteers').find((v) => v.Email === NEW)).toMatchObject({ Status: 'Declined', 'Decided by': 'Bishop Example' });
    expect(rows(gp).filter((s) => s.Email === NEW).map((s) => s.Status)).toEqual(['Lapsed', 'Lapsed']);
    const [m] = mailTo(gp, NEW);
    expect(m.subject).toBe('About your sign-up');
    expect(m.body).not.toContain('123 Example Lane');
  });

  it('the bishopric undoes a decline and revokes an approval; a revoked address is blocked', () => {
    const gp = setup();
    waitingVolunteer(gp);
    const bishop = linkFor(gp, 'bishop.example@example.test');
    gp.apiDecide_({ k: bishop, email: NEW, decision: 'decline' });
    expect(plain(gp.apiBishopric_({ k: linkFor(gp, 'sister.example@example.test'), email: NEW, decision: 'undo' })).ok).toBe(false);
    expect(plain(gp.apiBishopric_({ k: bishop, email: NEW, decision: 'undo' })).ok).toBe(true);
    expect(rows(gp, 'Volunteers').find((v) => v.Email === NEW)).toMatchObject({ Status: 'Pending', 'Decided by': 'Bishop Example' });
    // Pending again with a confirmed address: the next sign-up waits for approval.
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother New', email: NEW });
    expect(rows(gp).at(-1).Status).toBe('Waiting-approval');
    gp.apiDecide_({ k: bishop, email: NEW, decision: 'approve' });
    const rev = plain(gp.apiBishopric_({ k: bishop, email: NEW, decision: 'revoke' }));
    expect(rev).toEqual({ ok: true, message: "Revoked. They can't sign up again. 1 upcoming sign-up stays; remove it on My opportunities if needed." });
    expect(rows(gp, 'Volunteers').find((v) => v.Email === NEW).Status).toBe('Revoked');
    const before = rows(gp).length;
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
    expect(rows(gp)).toHaveLength(before);
    const list = plain(gp.apiVolunteers_({ k: bishop }));
    expect(list.volunteers.find((v) => v.email === NEW)).toMatchObject({ status: 'Revoked', decidedBy: 'Bishop Example' });
    expect(plain(gp.apiVolunteers_({ k: linkFor(gp, 'sister.example@example.test') })).ok).toBe(false);
  });
});

describe('My opportunities with phase 2', () => {
  it('shows waiting counts and every active sign-up with its status; children as "Ana (signed up by …)"', () => {
    const gp = setup();
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
    const ps = gp.serviceTab_('Posts');
    ps.update(ps.find('Post id', 'p1'), { Audiences: 'Sisters, Children' });
    gp.gpBegin_();
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother Volunteer', email: 'brother.volunteer@example.test', childName: 'Ana' });
    const res = plain(gp.apiListPosts_({ k: linkFor(gp, 'sister.example@example.test') }));
    const p1 = res.posts.find((p) => p.postId === 'p1');
    expect(p1.slots.find((s) => s.slotId === 'm2')).toMatchObject({ filled: 2, waiting: 1, needed: 5 });
    expect(p1.signups.map((s) => [s.label, s.status])).toEqual([
      ['Brother New', 'Waiting-email'],
      ['Brother Volunteer', 'Confirmed'],
      ['Ana (signed up by Brother Volunteer)', 'Confirmed'],
    ]);
    expect(JSON.stringify(p1)).not.toContain('detailsDue');
    expect(JSON.stringify(p1)).not.toContain('detailsSent');
  });

  it('a coordinator of meals sees and edits an Elders Quorum meals post but not its other posts', () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.coordinator@example.test');
    const who = plain(gp.apiWhoami_({ k }));
    expect(who.categories.map((c) => c.id)).toEqual(['meals']);
    expect(who.access.catOrgs).toEqual({ meals: ['Relief Society'] });
    const posts = plain(gp.apiListPosts_({ k })).posts;
    expect(posts.map((p) => p.postId).sort()).toEqual(['p1', 'p6']);
    expect(posts.find((p) => p.postId === 'p6').canEdit).toBe(true);
    expect(plain(gp.apiGetPost_({ k, postId: 'p5' })).ok).toBe(false);
    // Creating: only in meals, for its organization.
    const input = { organization: 'Relief Society', category: 'meals', title: 'Coordinator meals', audiences: ['Sisters'], slots: [{ date: '2026-12-10', role: 'Cook', needed: 2 }] };
    expect(plain(gp.apiSavePost_({ k, mode: 'publish', post: input })).ok).toBe(true);
    const other = plain(gp.apiSavePost_({ k, mode: 'publish', post: { ...input, category: 'service-project' } }));
    expect(other.ok).toBe(false);
    expect(other.fields.organization).toBeTruthy();
    // Editing the EQ meals post: the category must stay theirs.
    const edit = plain(gp.apiGetPost_({ k, postId: 'p6' })).post;
    const moved = plain(gp.apiSavePost_({ k, mode: 'publish', post: { ...edit, category: 'service-project' } }));
    expect(moved.ok).toBe(false);
    expect(moved.fields.category).toBeTruthy();
  });

  it('cancelling a post lapses its waiting sign-ups without an email to them', () => {
    const gp = setup();
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiCancelPost_({ k: linkFor(gp, 'sister.example@example.test'), postId: 'p1' })).ok).toBe(true);
    expect(rows(gp).find((s) => s.Email === NEW).Status).toBe('Lapsed');
    expect(mailTo(gp, NEW)).toEqual([]);
  });
});

describe('Needs help soon and the end of Send details', () => {
  it('ward council and bishopric only', () => {
    const gp = setup();
    const ok = plain(gp.apiNeedsHelp_({ k: linkFor(gp, 'brother.sample@example.test') }));
    expect(ok.ok).toBe(true);
    expect(ok.rows.map((r) => [r.title, r.date, r.filled, r.needed])).toEqual([
      ['Meals for the Sample family', '2026-12-03', 0, 1],
      ['Meals for the Sample family', '2026-12-04', 0, 5],
      ['Help the Example family move', '2026-12-06', 0, 6],
      ['Elders quorum meal', '2026-12-08', 0, 2],
    ]);
    expect(ok.rows[0].publicUrl).toContain('#p=pubmeals01');
    expect(plain(gp.apiNeedsHelp_({ k: linkFor(gp, 'sister.helper@example.test') }))).toEqual({ ok: false, error: "Needs help soon is for the ward council and the bishopric." });
  });

  it('sendDetails is gone', () => {
    const gp = setup();
    expect(gp.apiSendDetails_).toBeUndefined();
    expect(gp.detailsDue).toBeUndefined();
    const post = (body) => JSON.parse(gp.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
    expect(post({ action: 'sendDetails', k: linkFor(gp, 'sister.example@example.test'), signupId: 'x' })).toEqual({ ok: false, error: 'Not found.' });
  });
});
