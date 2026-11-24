import { describe, it, expect } from 'vitest';
import { loadPortal, LEADERS } from './harness.mjs';

const gp = loadPortal();
const ORGS = ['Bishopric', 'Elders Quorum', 'Relief Society', 'Primary'];
const plain = (x) => JSON.parse(JSON.stringify(x));

const goodInput = (over = {}) => ({
  organization: 'Relief Society',
  category: 'meals',
  title: 'Meals for the Sample family',
  audiences: ['Sisters', 'Brothers'],
  publicNote: 'Dinner drop-off.',
  privateDetails: '123 Example Lane',
  cutoffHours: 24,
  slots: [
    { date: '2026-12-03', start: '17:00', end: '18:00', role: 'Bring a meal', needed: 1, roleNote: '', bringingPrompt: 'What are you bringing?' },
    { date: '2026-12-04', start: '', end: '', role: 'Bring a meal', needed: 1, roleNote: '', bringingPrompt: '' },
  ],
  ...over,
});
const ctx = (over = {}) => ({ allowedOrgs: ['Relief Society'], categoryIds: ['meals', 'activity'], todayLocal: '2026-12-01', publish: true, ...over });

describe('validatePost', () => {
  it('accepts a good post and normalizes it', () => {
    const r = plain(gp.validatePost(goodInput(), ctx()));
    expect(r.ok).toBe(true);
    expect(r.post.title).toBe('Meals for the Sample family');
    expect(r.slots).toHaveLength(2);
    expect(r.slots[0].needed).toBe(1);
  });
  it('refuses a past date on publish but accepts it in a draft', () => {
    const input = goodInput({ slots: [{ date: '2026-11-30', role: 'Cook', needed: 1 }] });
    const pub = plain(gp.validatePost(input, ctx()));
    expect(pub.ok).toBe(false);
    expect(pub.errors['slots[0].date']).toBeTruthy();
    expect(gp.validatePost(input, ctx({ publish: false })).ok).toBe(true);
  });
  it('keeps an existing slot whose date has passed when republishing', () => {
    const input = goodInput({ slots: [{ slotId: 'sl1', date: '2026-11-30', role: 'Cook', needed: 1 }] });
    expect(gp.validatePost(input, ctx({ keepDates: { sl1: '2026-11-30' } })).ok).toBe(true);
  });
  it('checks needed, times, roles and keys errors by slot', () => {
    const r = plain(
      gp.validatePost(
        goodInput({
          slots: [
            { date: '2026-12-03', role: 'Cook', needed: 0 },
            { date: '2026-12-03', role: '', needed: 1 },
            { date: '2026-12-03', role: 'Cook', needed: 201 },
            { date: '2026-12-03', start: '10:00', end: '09:00', role: 'Cook', needed: 2 },
            { date: '2026-12-03', start: '9am', role: 'Cook', needed: 2.5 },
          ],
        }),
        ctx()
      )
    );
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(['slots[0].needed', 'slots[1].role', 'slots[2].needed', 'slots[3].end', 'slots[4].needed', 'slots[4].start'].sort());
  });
  it('checks the post fields', () => {
    const r = plain(
      gp.validatePost(
        goodInput({ title: '', organization: 'Primary', audiences: [], category: 'nope', cutoffHours: 200, publicNote: 'x'.repeat(2001), privateDetails: 'y'.repeat(1001), slots: [] }),
        ctx()
      )
    );
    expect(r.errors.title).toBeTruthy();
    expect(r.errors.organization).toBeTruthy();
    expect(r.errors.audiences).toBe('Pick at least one audience');
    expect(r.errors.category).toBeTruthy();
    expect(r.errors.cutoffHours).toBeTruthy();
    expect(r.errors.publicNote).toBeTruthy();
    expect(r.errors.privateDetails).toBeTruthy();
    expect(r.errors.slots).toBeTruthy();
    expect(gp.validatePost(goodInput({ audiences: ['Elders'] }), ctx()).ok).toBe(false);
    expect(gp.validatePost(goodInput({ category: '' }), ctx()).ok).toBe(true);
    // A new post must have one (review round 2); an old post saved without one may stay so.
    expect(plain(gp.validatePost(goodInput({ category: '' }), ctx({ requireCategory: true }))).errors.category).toBe('Pick a category');
    expect(gp.validatePost(goodInput({ cutoffHours: '' }), ctx()).ok).toBe(true);
  });
  it('allows at most 100 slots', () => {
    const slots = Array.from({ length: 101 }, () => ({ date: '2026-12-03', role: 'Cook', needed: 1 }));
    expect(plain(gp.validatePost(goodInput({ slots }), ctx())).errors.slots).toBeTruthy();
  });
});

const SLOT = (over = {}) => ({ 'Slot id': 'sl1', 'Post id': 'p1', Date: '2026-12-03', Start: '00:30', End: '', Role: 'Cook', Needed: 2, ...over });
const POST = (over = {}) => ({ 'Post id': 'p1', 'Public id': 'pub1', Organization: 'Relief Society', Title: 'Meals', Audiences: 'Sisters', 'Public note': 'n', 'Private details': '123 Example Lane', 'Cancel cutoff hours': 24, Status: 'Open', 'Created by': 'sister.example@example.test', ...over });
const SU = (over = {}) => ({ 'Sign-up id': 'su1', 'Post id': 'p1', 'Slot id': 'sl1', Email: 'a@example.test', Name: 'Brother Volunteer', Status: 'Confirmed', 'Reminded at': '', ...over });

describe('counts and summaries', () => {
  it('counts Confirmed sign-ups per slot', () => {
    const c = plain(gp.countsBySlot([SU(), SU({ 'Sign-up id': 'su2', Status: 'Cancelled' }), SU({ 'Sign-up id': 'su3', 'Slot id': 'sl2' })]));
    expect(c).toEqual({ sl1: { filled: 1, waiting: 0 }, sl2: { filled: 1, waiting: 0 } });
  });
  it('slotStart uses 00:00 without a start time', () => {
    expect(gp.slotStart(SLOT())).toBe('2026-12-03 00:30');
    expect(gp.slotStart(SLOT({ Start: '' }))).toBe('2026-12-03 00:00');
  });
  it('postSummary counts only today and later', () => {
    const slots = [SLOT({ Date: '2026-11-30' }), SLOT({ 'Slot id': 'sl2' }), SLOT({ 'Slot id': 'sl3', Date: '2026-12-05', Needed: 1 })];
    const counts = { sl1: { filled: 2 }, sl2: { filled: 2 }, sl3: { filled: 0 } };
    const s = plain(gp.postSummary(POST(), slots, counts, '2026-12-01'));
    expect(s).toMatchObject({ publicId: 'pub1', needed: 3, filled: 2, full: false, firstDate: '2026-12-03', lastDate: '2026-12-05' });
    expect(gp.postSummary(POST(), slots, { ...counts, sl3: { filled: 1 } }, '2026-12-01').full).toBe(true);
  });
  it('publicPost carries no names, emails or private details', () => {
    const p = plain(gp.publicPost(POST(), [SLOT()], { sl1: { filled: 1 } }, '2026-12-01'));
    const json = JSON.stringify(p);
    for (const bad of ['Email', 'Name', 'Private details', 'privateDetails', '123 Example Lane', 'sister.example@example.test']) {
      expect(json).not.toContain(bad);
    }
    expect(p.slots[0]).toEqual({ slotId: 'sl1', date: '2026-12-03', start: '00:30', end: '', role: 'Cook', needed: 2, filled: 1, roleNote: '', bringingPrompt: '', full: false, past: false });
    expect(Object.keys(p).sort()).toEqual(['audiences', 'cutoffHours', 'organization', 'publicId', 'publicNote', 'slots', 'status', 'title']);
  });
});

describe('checkSignup', () => {
  const base = { post: POST(), slot: SLOT({ Start: '17:00' }), counts: {}, existing: [], email: 'sister.example@example.test', todayLocal: '2026-12-01', nowLocal: '2026-12-01 10:00' };
  it('accepts an open slot', () => expect(gp.checkSignup(base).ok).toBe(true));
  it('refuses closed posts, foreign slots, past dates and full roles', () => {
    expect(gp.checkSignup({ ...base, post: POST({ Status: 'Closed' }) }).error).toBe('This opportunity is not open.');
    expect(gp.checkSignup({ ...base, slot: SLOT({ 'Post id': 'p2' }) }).ok).toBe(false);
    expect(gp.checkSignup({ ...base, nowLocal: '2026-12-03 17:01' }).error).toBe('That date has passed.');
    expect(gp.checkSignup({ ...base, counts: { sl1: { filled: 2 } } }).error).toBe('This role is full.');
  });
  it('a slot without a start time stays open all of its day', () => {
    expect(gp.checkSignup({ ...base, slot: SLOT({ Start: '' }), nowLocal: '2026-12-03 15:00' }).ok).toBe(true);
    expect(gp.checkSignup({ ...base, slot: SLOT({ Start: '' }), nowLocal: '2026-12-04 00:00' }).ok).toBe(false);
  });
  it('detects a duplicate whatever the case and spaces', () => {
    const existing = [SU({ Email: 'sister.example@example.test' })];
    expect(gp.checkSignup({ ...base, existing, email: 'Sister.Example@Example.test ' }).error).toBe("You're already signed up for this role.");
    expect(gp.checkSignup({ ...base, existing: [SU({ Email: 'sister.example@example.test', Status: 'Cancelled' })], email: 'Sister.Example@Example.test ' }).ok).toBe(true);
  });
});

describe('cancelIsLate', () => {
  it('flips exactly at the cutoff for a 00:30 slot', () => {
    const slot = SLOT({ Date: '2026-12-02', Start: '00:30' });
    expect(gp.cancelIsLate(slot, 24, '2026-12-01 00:29')).toBe(false);
    expect(gp.cancelIsLate(slot, 24, '2026-12-01 00:30')).toBe(true);
    expect(gp.cancelIsLate(SLOT({ Date: '2026-12-03', Start: '23:30' }), 0, '2026-12-03 23:29')).toBe(false);
  });
});

describe('remindersDue', () => {
  const slotsById = { sl1: SLOT({ Date: '2026-12-02', Start: '09:00' }), sl9: SLOT({ 'Slot id': 'sl9', Date: '2026-12-03' }) };
  const postsById = {
    p1: POST(),
    p2: POST({ 'Post id': 'p2', Status: 'Past' }),
    p3: POST({ 'Post id': 'p3', Status: 'Closed' }),
    p4: POST({ 'Post id': 'p4', Status: 'Draft' }),
    p5: POST({ 'Post id': 'p5', Status: 'Cancelled' }),
  };
  const signups = [
    SU(),
    SU({ 'Sign-up id': 'su2', Status: 'Cancelled' }),
    SU({ 'Sign-up id': 'su3', 'Reminded at': '2026-12-01 18:00' }),
    SU({ 'Sign-up id': 'su4', 'Slot id': 'sl9' }),
    SU({ 'Sign-up id': 'su5', 'Post id': 'p2' }),
    SU({ 'Sign-up id': 'su7', 'Post id': 'p3' }),
    SU({ 'Sign-up id': 'su8', 'Post id': 'p4' }),
    SU({ 'Sign-up id': 'su9', 'Post id': 'p5' }),
  ];
  it('waits for the reminder hour and skips cancelled, reminded, other days, Past and Cancelled posts', () => {
    expect(plain(gp.remindersDue(signups, slotsById, postsById, '2026-12-01 17:59', 18))).toEqual([]);
    // Closed and Draft posts only stop new sign-ups: people already signed up still get reminded (D1).
    expect(plain(gp.remindersDue(signups, slotsById, postsById, '2026-12-01 18:00', 18))).toEqual(['su1', 'su7', 'su8']);
  });
  it('still reminds a sign-up made at 21:00 at the 22:00 run', () => {
    const late = [SU({ 'Sign-up id': 'su6', 'Signed up at': '2026-12-01 21:00' })];
    expect(plain(gp.remindersDue(late, slotsById, postsById, '2026-12-01 22:00', 18))).toEqual(['su6']);
  });
});

describe('postsToMarkPast', () => {
  it('marks Open and Closed posts whose every date is before today', () => {
    const posts = [POST(), POST({ 'Post id': 'p2', Status: 'Closed' }), POST({ 'Post id': 'p3', Status: 'Draft' }), POST({ 'Post id': 'p4' })];
    const slotsByPost = {
      p1: [SLOT({ Date: '2026-11-29' }), SLOT({ Date: '2026-11-30' })],
      p2: [SLOT({ Date: '2026-11-30' })],
      p3: [SLOT({ Date: '2026-11-30' })],
      p4: [SLOT({ Date: '2026-11-30' }), SLOT({ Date: '2026-12-01' })],
    };
    expect(plain(gp.postsToMarkPast(posts, slotsByPost, '2026-12-01'))).toEqual(['p1', 'p2']);
  });
});

describe('leader access', () => {
  const L = (name) => LEADERS.find((l) => l.Name === name);
  const rsPost = POST();
  const primaryPost = POST({ 'Post id': 'p2', Organization: 'Primary', 'Created by': 'sister.helper@example.test' });
  it('bishopric sees, edits and creates everywhere', () => {
    const a = plain(gp.leaderAccess(L('Bishop Example'), ORGS));
    expect(a).toEqual({ isBishopric: true, seeAllNames: true, editOrgs: ORGS, createOrgs: ORGS, baseCreateOrgs: ORGS, categories: [], catOrgs: {}, catIds: [] });
  });
  it('an Org editor of Primary cannot see or edit a Relief Society post but its creator can', () => {
    const a = gp.leaderAccess(L('Sister Helper'), ORGS);
    expect(gp.canSeePost(a, rsPost)).toBe(false);
    expect(gp.canEditPost(a, 'sister.helper@example.test', rsPost)).toBe(false);
    expect(gp.canEditPost(a, 'sister.helper@example.test', primaryPost)).toBe(true);
    const creator = gp.leaderAccess(L('Sister Coordinator'), ORGS);
    expect(gp.canEditPost(creator, 'Sister.Example@example.test', rsPost)).toBe(true);
  });
  it('a ward council member of Elders Quorum sees Relief Society names but cannot edit', () => {
    const a = gp.leaderAccess(L('Brother Sample'), ORGS);
    expect(a.seeAllNames).toBe(true);
    expect(gp.canSeePost(a, rsPost)).toBe(true);
    expect(gp.canEditPost(a, 'brother.sample@example.test', rsPost)).toBe(false);
    expect(plain(a.createOrgs)).toEqual(['Elders Quorum']);
  });
  it('a coordinator listed in no category gets nothing', () => {
    expect(plain(gp.leaderAccess(L('Sister Coordinator'), ORGS))).toEqual({ isBishopric: false, seeAllNames: false, editOrgs: [], createOrgs: [], baseCreateOrgs: [], categories: [], catOrgs: {}, catIds: [] });
  });
  it('noticeRecipients: creator on the Leaders tab plus the org editors, de-duplicated', () => {
    const leaders = [...LEADERS, { Name: 'Sister Two', Email: 'Sister.Example@example.test ', Organization: 'Relief Society', 'Org editor': true }];
    expect(plain(gp.noticeRecipients(rsPost, leaders))).toEqual(['sister.example@example.test']);
    const byCounselor = POST({ 'Created by': 'brother.counselor@example.test' });
    expect(plain(gp.noticeRecipients(byCounselor, LEADERS))).toEqual(['brother.counselor@example.test', 'sister.example@example.test']);
    const byFormer = POST({ 'Created by': 'former.leader@example.test' });
    expect(plain(gp.noticeRecipients(byFormer, LEADERS))).toEqual(['sister.example@example.test']);
  });
});

describe('rateCheck', () => {
  const limits = { perAddress: 3, perDay: 40, perPostMinute: 10, leaderLinks: 3 };
  it('passes under every limit and names the limit that was reached', () => {
    expect(gp.rateCheck({ addressToday: 2, totalToday: 39, postMinute: 9, leaderLinksToday: 2 }, limits)).toBeNull();
    expect(gp.rateCheck({ addressToday: 3 }, limits)).toBe('perAddress');
    expect(gp.rateCheck({ totalToday: 40 }, limits)).toBe('perDay');
    expect(gp.rateCheck({ postMinute: 10 }, limits)).toBe('perPostMinute');
    expect(gp.rateCheck({ leaderLinksToday: 3 }, limits)).toBe('leaderLinks');
  });
});
