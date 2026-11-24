// Phase 2 volunteer rules: approval states, waiting, over-limit, children, nudges, lapses,
// fill warnings, Needs help soon, coordinators.
import { describe, it, expect } from 'vitest';
import { loadPortal, LEADERS } from './harness.mjs';

const gp = loadPortal();
const ORGS = ['Bishopric', 'Elders Quorum', 'Relief Society', 'Primary'];
const plain = (x) => JSON.parse(JSON.stringify(x));
const L = (name) => LEADERS.find((l) => l.Name === name);

const POST = (over = {}) => ({ 'Post id': 'p1', 'Public id': 'pub1', Organization: 'Relief Society', Category: 'meals', Title: 'Meals', Status: 'Open', 'Created by': 'sister.example@example.test', ...over });
const SLOT = (over = {}) => ({ 'Slot id': 'sl1', 'Post id': 'p1', Date: '2026-12-03', Start: '17:00', End: '18:00', Role: 'Bring a meal', Needed: 1, ...over });
const SU = (over = {}) => ({ 'Sign-up id': 'su1', 'Post id': 'p1', 'Slot id': 'sl1', Email: 'brother.volunteer@example.test', Name: 'Brother Volunteer', 'Child first name': '', Status: 'Confirmed', ...over });
const CATS = [
  { Id: 'meals', Name: 'Meals', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', Coordinators: 'sister.coordinator@example.test' },
  { Id: 'service-project', Name: 'Service project', Kind: 'Opportunity', 'Owning organizations': '' },
  { Id: 'activity', Name: 'Activity help', Kind: 'Opportunity', 'Owning organizations': 'Elders Quorum', 'Any ward council may create': true },
  { Id: 'moving', Name: 'Moving help', Kind: 'Request', 'Owning organizations': 'Elders Quorum', Coordinators: 'sister.coordinator@example.test' },
];

describe('volunteerState and signupStatusFor', () => {
  const vols = {
    'approved@example.test': { Email: 'approved@example.test', Status: 'Approved' },
    'declined@example.test': { Email: 'declined@example.test', Status: 'Declined' },
    'revoked@example.test': { Email: 'revoked@example.test', Status: 'Revoked' },
    'pending@example.test': { Email: 'pending@example.test', Status: 'Pending', 'Email confirmed at': '' },
    'confirmed@example.test': { Email: 'confirmed@example.test', Status: 'Pending', 'Email confirmed at': '2026-11-30 10:00' },
    'sister.example@example.test': { Email: 'sister.example@example.test', Status: 'Declined' },
  };
  const leaders = ['Sister.Example@example.test'];
  it('names each state', () => {
    expect(gp.volunteerState('sister.example@example.test', vols, leaders)).toBe('leader');
    expect(gp.volunteerState(' Approved@Example.test', vols, leaders)).toBe('approved');
    expect(gp.volunteerState('confirmed@example.test', vols, leaders)).toBe('pending-confirmed');
    expect(gp.volunteerState('pending@example.test', vols, leaders)).toBe('pending-new');
    expect(gp.volunteerState('stranger@example.test', vols, leaders)).toBe('new');
    expect(gp.volunteerState('declined@example.test', vols, leaders)).toBe('blocked');
    expect(gp.volunteerState('revoked@example.test', vols, leaders)).toBe('blocked');
  });
  it('maps states to sign-up statuses; blocked stores nothing', () => {
    expect(gp.signupStatusFor('leader')).toBe('Confirmed');
    expect(gp.signupStatusFor('approved')).toBe('Confirmed');
    expect(gp.signupStatusFor('pending-confirmed')).toBe('Waiting-approval');
    expect(gp.signupStatusFor('pending-new')).toBe('Waiting-email');
    expect(gp.signupStatusFor('new')).toBe('Waiting-email');
    expect(gp.signupStatusFor('blocked')).toBe(null);
  });
});

describe('countsBySlot and checkSignup (phase 2)', () => {
  const post = POST();
  const slot = SLOT({ Needed: 1 });
  const full = [SU()];
  const base = { post, slot, todayLocal: '2026-12-01', nowLocal: '2026-12-01 10:00' };
  it('counts waiting sign-ups apart from filled ones', () => {
    const c = plain(gp.countsBySlot([SU(), SU({ Status: 'Waiting-email' }), SU({ Status: 'Waiting-approval' }), SU({ Status: 'Withdrawn' }), SU({ Status: 'Lapsed' })]));
    expect(c.sl1).toEqual({ filled: 1, waiting: 2 });
  });
  it('a full role lets a not-yet-approved address wait but refuses an approved one', () => {
    const counts = gp.countsBySlot(full);
    expect(gp.checkSignup({ ...base, counts, existing: full, email: 'new@example.test', state: 'new' }).ok).toBe(true);
    expect(gp.checkSignup({ ...base, counts, existing: full, email: 'conf@example.test', state: 'pending-confirmed' }).ok).toBe(true);
    expect(plain(gp.checkSignup({ ...base, counts, existing: full, email: 'ok@example.test', state: 'approved' }))).toEqual({ ok: false, error: 'This role is full.' });
    expect(plain(gp.checkSignup({ ...base, counts, existing: full, email: 'sister.example@example.test', state: 'leader' }))).toEqual({ ok: false, error: 'This role is full.' });
  });
  it('a parent and two children are three sign-ups; a second Ana is a duplicate', () => {
    const big = SLOT({ Needed: 10 });
    const existing = [];
    const email = 'parent@example.test';
    for (const child of ['', 'Ana', 'Ben']) {
      const r = gp.checkSignup({ ...base, slot: big, counts: gp.countsBySlot(existing), existing, email, childName: child, state: 'approved' });
      expect(r.ok).toBe(true);
      existing.push(SU({ 'Sign-up id': 's' + existing.length, Email: email, 'Child first name': child }));
    }
    expect(gp.countsBySlot(existing).sl1.filled).toBe(3);
    expect(plain(gp.checkSignup({ ...base, slot: big, counts: gp.countsBySlot(existing), existing, email: 'Parent@Example.test', childName: ' ana ', state: 'approved' }))).toEqual({
      ok: false,
      error: "You're already signed up for this role.",
    });
    // A waiting sign-up is active too; a lapsed one is not.
    const waiting = [SU({ Email: email, Status: 'Waiting-email' })];
    expect(gp.checkSignup({ ...base, slot: big, counts: gp.countsBySlot(waiting), existing: waiting, email, state: 'new' }).ok).toBe(false);
    const lapsed = [SU({ Email: email, Status: 'Lapsed' })];
    expect(gp.checkSignup({ ...base, slot: big, counts: gp.countsBySlot(lapsed), existing: lapsed, email, state: 'new' }).ok).toBe(true);
  });
  it('overLimitOnConfirm is true once the role already has its number', () => {
    const s = SLOT({ Needed: 10 });
    expect(gp.overLimitOnConfirm(s, { sl1: { filled: 10, waiting: 0 } })).toBe(true);
    expect(gp.overLimitOnConfirm(s, { sl1: { filled: 9, waiting: 3 } })).toBe(false);
    expect(gp.overLimitOnConfirm(s, {})).toBe(false);
  });
});

describe('canApprove and approversFor', () => {
  const rsPost = POST();
  const vol = { Email: 'new@example.test', Status: 'Pending', 'First post': 'p1' };
  it('only the first post organization leaders and the bishopric may approve', () => {
    const eq = gp.leaderAccess(L('Brother Sample'), ORGS, CATS);
    expect(gp.canApprove(eq, 'brother.sample@example.test', vol, rsPost)).toBe(false);
    const bishop = gp.leaderAccess(L('Brother Counselor'), ORGS, CATS);
    expect(gp.canApprove(bishop, 'brother.counselor@example.test', vol, rsPost)).toBe(true);
    const rs = gp.leaderAccess(L('Sister Example'), ORGS, CATS);
    expect(gp.canApprove(rs, 'sister.example@example.test', vol, rsPost)).toBe(true);
    // A coordinator of meals edits meals posts but does not approve.
    const coord = gp.leaderAccess(L('Sister Coordinator'), ORGS, CATS);
    expect(gp.canApprove(coord, 'sister.coordinator@example.test', vol, rsPost)).toBe(false);
    // No first post: the bishopric only.
    expect(gp.canApprove(rs, 'sister.example@example.test', vol, null)).toBe(false);
    expect(gp.canApprove(bishop, 'brother.counselor@example.test', vol, null)).toBe(true);
  });
  it('approversFor: the organization editors and ward council leaders plus the bishopric', () => {
    expect(plain(gp.approversFor(rsPost, LEADERS))).toEqual(['bishop.example@example.test', 'brother.counselor@example.test', 'brother.clerk@example.test', 'sister.example@example.test']);
    expect(plain(gp.approversFor(POST({ Organization: 'Primary' }), LEADERS))).toEqual(['bishop.example@example.test', 'brother.counselor@example.test', 'brother.clerk@example.test', 'sister.helper@example.test']);
    expect(plain(gp.approversFor(null, LEADERS))).toEqual(['bishop.example@example.test', 'brother.counselor@example.test', 'brother.clerk@example.test']);
  });
});

describe('nudgesDue and lapsesDue', () => {
  const posts = { p1: POST() };
  const slots = { sl1: SLOT({ Date: '2026-12-03', Start: '17:00' }) };
  const waiting = [SU({ Status: 'Waiting-approval' })];
  it('nudges once per post and date when a waiting sign-up starts within 48 hours', () => {
    expect(plain(gp.nudgesDue(waiting, slots, posts, '2026-12-01 18:00', {}))).toEqual([{ postId: 'p1', date: '2026-12-03', key: 'p1|2026-12-03' }]);
    expect(plain(gp.nudgesDue(waiting, slots, posts, '2026-12-01 16:00', {}))).toEqual([]);
    expect(plain(gp.nudgesDue(waiting, slots, posts, '2026-12-01 18:00', { 'p1|2026-12-03': '2026-12-01' }))).toEqual([]);
    const two = [SU({ Status: 'Waiting-approval' }), SU({ 'Sign-up id': 'su2', Status: 'Waiting-approval', Email: 'b@example.test' })];
    expect(gp.nudgesDue(two, slots, posts, '2026-12-01 18:00', {})).toHaveLength(1);
    // Waiting for the email click is not waiting for approval; a cancelled post nudges nobody.
    expect(gp.nudgesDue([SU({ Status: 'Waiting-email' })], slots, posts, '2026-12-01 18:00', {})).toHaveLength(0);
    expect(gp.nudgesDue(waiting, slots, { p1: POST({ Status: 'Cancelled' }) }, '2026-12-01 18:00', {})).toHaveLength(0);
  });
  it('lapses waiting sign-ups whose date has passed, not today', () => {
    const rows = [
      SU({ 'Sign-up id': 'a', Status: 'Waiting-email', 'Slot id': 'y' }),
      SU({ 'Sign-up id': 'b', Status: 'Waiting-approval', 'Slot id': 't' }),
      SU({ 'Sign-up id': 'c', Status: 'Confirmed', 'Slot id': 'y' }),
      SU({ 'Sign-up id': 'd', Status: 'Waiting-approval', 'Slot id': 'gone' }),
    ];
    const bySlot = { y: SLOT({ 'Slot id': 'y', Date: '2026-11-30' }), t: SLOT({ 'Slot id': 't', Date: '2026-12-01' }) };
    expect(plain(gp.lapsesDue(rows, bySlot, '2026-12-01'))).toEqual(['a', 'd']);
  });
});

describe('warningsDue and needsHelpSoon', () => {
  const cats = { meals: { Id: 'meals', 'Warn hours': 72 } };
  const slotsByPost = { p1: [SLOT({ 'Slot id': 'a', Date: '2026-12-04', Start: '16:00', Needed: 2 }), SLOT({ 'Slot id': 'b', Date: '2026-12-04', Start: '18:00', Needed: 1 })] };
  it('warns once per post date when a role is short within the warn hours', () => {
    const counts = { a: { filled: 1, waiting: 0 }, b: { filled: 1, waiting: 0 } };
    const due = plain(gp.warningsDue([POST()], slotsByPost, counts, cats, '2026-12-01 18:00', {}));
    expect(due).toEqual([{ postId: 'p1', date: '2026-12-04', key: 'p1|2026-12-04', short: [{ slotId: 'a', role: 'Bring a meal', start: '16:00', filled: 1, needed: 2 }] }]);
    expect(gp.warningsDue([POST()], slotsByPost, counts, cats, '2026-12-01 18:00', { 'p1|2026-12-04': '2026-12-01' })).toHaveLength(0);
    // 74 hours ahead: not yet. Nothing short: nothing.
    expect(gp.warningsDue([POST()], slotsByPost, counts, cats, '2026-12-01 14:00', {})).toHaveLength(0);
    expect(gp.warningsDue([POST()], slotsByPost, { a: { filled: 2 }, b: { filled: 1 } }, cats, '2026-12-01 18:00', {})).toHaveLength(0);
    // Warn hours blank → 48; 0 → off.
    expect(gp.warningsDue([POST()], slotsByPost, counts, { meals: { Id: 'meals' } }, '2026-12-01 18:00', {})).toHaveLength(0);
    expect(gp.warningsDue([POST()], slotsByPost, counts, { meals: { Id: 'meals' } }, '2026-12-02 17:00', {})).toHaveLength(1);
    expect(gp.warningsDue([POST()], slotsByPost, counts, { meals: { Id: 'meals', 'Warn hours': 0 } }, '2026-12-02 17:00', {})).toHaveLength(0);
  });
  it('Needs help soon lists short roles of Open posts in the next 14 days', () => {
    const posts = [POST(), POST({ 'Post id': 'p2', Title: 'Far away' }), POST({ 'Post id': 'p3', Title: 'Full' }), POST({ 'Post id': 'p4', Title: 'Draft', Status: 'Draft' })];
    const byPost = {
      p1: [SLOT({ 'Slot id': 'a', Date: '2026-12-15', Needed: 3 })],
      p2: [SLOT({ 'Slot id': 'b', 'Post id': 'p2', Date: '2026-12-16' })],
      p3: [SLOT({ 'Slot id': 'c', 'Post id': 'p3', Date: '2026-12-03' })],
      p4: [SLOT({ 'Slot id': 'd', 'Post id': 'p4', Date: '2026-12-03' })],
    };
    const counts = { a: { filled: 1 }, c: { filled: 1 } };
    const rows = plain(gp.needsHelpSoon(posts, byPost, counts, '2026-12-01'));
    expect(rows).toEqual([
      { postId: 'p1', publicId: 'pub1', title: 'Meals', organization: 'Relief Society', category: 'meals', date: '2026-12-15', start: '17:00', end: '18:00', role: 'Bring a meal', filled: 1, needed: 3 },
    ]);
  });
});

describe('coordinators and categories in leaderAccess', () => {
  const eqMeals = POST({ 'Post id': 'p9', Organization: 'Elders Quorum', Category: 'meals', 'Created by': 'brother.sample@example.test' });
  const eqProject = POST({ 'Post id': 'p8', Organization: 'Elders Quorum', Category: 'service-project', 'Created by': 'brother.sample@example.test' });
  it('a coordinator of meals sees and edits meals posts of any organization, not service-project posts', () => {
    const a = gp.leaderAccess(L('Sister Coordinator'), ORGS, CATS);
    expect(plain(a.categories)).toEqual(['meals']);
    expect(gp.canSeePost(a, eqMeals)).toBe(true);
    expect(gp.canEditPost(a, 'sister.coordinator@example.test', eqMeals)).toBe(true);
    expect(gp.canSeePost(a, eqProject)).toBe(false);
    expect(gp.canEditPost(a, 'sister.coordinator@example.test', eqProject)).toBe(false);
    // They create only in their categories, for the category's organizations.
    expect(plain(a.createOrgs)).toEqual(['Relief Society']);
    expect(plain(gp.allowedOrgsFor_(a, 'meals'))).toEqual(['Relief Society']);
    expect(plain(gp.allowedOrgsFor_(a, 'service-project'))).toEqual([]);
    // A request category's coordinators get nothing on the leader page.
    expect(a.categories).not.toContain('moving');
  });
  it('Q3: creating in a category follows the service spec', () => {
    const rs = gp.leaderAccess(L('Sister Example'), ORGS, CATS);
    const eq = gp.leaderAccess(L('Brother Sample'), ORGS, CATS);
    const helper = gp.leaderAccess(L('Sister Helper'), ORGS, CATS);
    const bishop = gp.leaderAccess(L('Bishop Example'), ORGS, CATS);
    // Meals has coordinators: only they, the bishopric (and ward council with the flag, unset here).
    expect(plain(gp.allowedOrgsFor_(rs, 'meals'))).toEqual([]);
    expect(plain(gp.allowedOrgsFor_(bishop, 'meals'))).toEqual(ORGS);
    // Activity: no coordinators, owned by Elders Quorum, "Any ward council may create" ticked.
    expect(plain(gp.allowedOrgsFor_(eq, 'activity'))).toEqual(['Elders Quorum']);
    expect(plain(gp.allowedOrgsFor_(rs, 'activity'))).toEqual(['Elders Quorum']);
    expect(plain(gp.allowedOrgsFor_(helper, 'activity'))).toEqual([]);
    // Service project: no coordinators, no owners: anyone with create rights, for their own organization.
    expect(plain(gp.allowedOrgsFor_(helper, 'service-project'))).toEqual(['Primary']);
    expect(plain(gp.allowedOrgsFor_(rs, 'service-project'))).toEqual(['Relief Society']);
    // No category: the base organization rights, as in phase 1.
    expect(plain(gp.allowedOrgsFor_(helper, ''))).toEqual(['Primary']);
  });

  it('Q3: editing follows the same rule plus the creator; coordinators edit their categories in any organization', () => {
    const rs = gp.leaderAccess(L('Sister Example'), ORGS, CATS);
    const rsMeals = POST({ 'Created by': 'brother.counselor@example.test' });
    expect(gp.canEditPost(rs, 'sister.example@example.test', rsMeals)).toBe(false);
    expect(gp.canEditPost(rs, 'sister.example@example.test', POST())).toBe(true); // her own post
    expect(gp.canEditPost(gp.leaderAccess(L('Bishop Example'), ORGS, CATS), 'bishop.example@example.test', rsMeals)).toBe(true);
    const coord = gp.leaderAccess(L('Sister Coordinator'), ORGS, CATS);
    expect(gp.canEditPost(coord, 'sister.coordinator@example.test', POST({ Organization: 'Elders Quorum', 'Created by': 'x@example.test' }))).toBe(true);
    // A category without coordinators: its owning organization's leaders edit.
    const cats2 = CATS.map((c) => (c.Id === 'meals' ? { ...c, Coordinators: '' } : c));
    const rs2 = gp.leaderAccess(L('Sister Example'), ORGS, cats2);
    expect(gp.canEditPost(rs2, 'sister.example@example.test', rsMeals)).toBe(true);
    const helper2 = gp.leaderAccess(L('Sister Helper'), ORGS, cats2);
    expect(gp.canEditPost(helper2, 'sister.helper@example.test', rsMeals)).toBe(false);
  });

  it('item 11: a coordinator of a category with no owning organization may pick any organization', () => {
    const cats = [...CATS, { Id: 'hall', Name: 'Clean the building', Kind: 'Opportunity', 'Owning organizations': '', Coordinators: 'building.helper@example.test' }];
    const a = gp.leaderAccess({ Name: 'Building Helper', Email: 'building.helper@example.test', Organization: '', Coordinator: true }, ORGS, cats);
    expect(plain(gp.allowedOrgsFor_(a, 'hall'))).toEqual(ORGS);
    expect(plain(a.categories)).toEqual(['hall']);
  });
});
