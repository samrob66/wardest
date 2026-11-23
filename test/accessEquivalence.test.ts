// Equivalence harness, part 3 of 3: lists, recipients, and checks that the cast exercises the
// rules (see test/accessEquivalenceKit.ts; parts 1 and 2 are accessEquivalencePosts and
// accessEquivalenceCategories).
import { describe, it, expect, beforeAll } from 'vitest';
import { env } from './helpers';
import * as curS from '../src/lib/serviceAccess';
import * as curV from '../src/lib/volAccess';
import * as refS from './reference/serviceAccessRef';
import * as refV from './reference/volAccessRef';
import { loadAccess } from '../src/lib/serviceAccess';
import { canEditStored, canViewStored, loadPosts } from '../src/lib/volAccess';
import {
  SLOW, USERS, compare, listTable, makeEquivCast, recipientTable, reference, renullLegacy, snapListTable, type Cast,
} from './accessEquivalenceKit';

let c: Cast;
beforeAll(async () => {
  c = await makeEquivCast();
}, SLOW);

describe('access equivalence: lists', () => {
  for (const key of USERS) {
    it(`${key}`, async () => compare(`lists ${key}`, (impl) => listTable(impl, c, c.users[key]!)), SLOW);
    it(`${key} (one snapshot)`, async () => {
      expect(await snapListTable(c, c.users[key]!)).toEqual(await reference(`lists ${key}`, (impl) => listTable(impl, c, c.users[key]!)));
    }, SLOW);
  }
  it('recipients', async () => compare('recipients', (impl) => recipientTable(impl, c)), SLOW);
});

describe('access equivalence: the cast exercises every rule', () => {
  // Guards against a harness that "agrees" because everything is false: each line is a rule the
  // reference grants (or denies) for a reason the cast was built to hit.
  it('spot checks against the reference', async () => {
    const s = refS;
    const v = refV;
    const u = c.users;
    expect(await s.isCategoryManager(env, c.w1, c.cats['req-christmas']!, u.counselor!)).toBe(false);
    expect(await s.isCategoryManager(env, c.w1, c.cats['req-christmas']!, u.bishop!)).toBe(true);
    expect(await s.isCategoryManager(env, c.w1, c.cats['req-christmas']!, u.superadmin!)).toBe(true);
    expect(await s.canCreateInCategory(env, c.w1, c.cats.meal!, u.rsPres!)).toBe(false); // has delegates
    expect(await s.canCreateInCategory(env, c.w1, c.cats.meal!, u.mealDelegate!)).toBe(true);
    expect(await s.canCreateInCategory(env, c.w1, c.cats.activity!, u.superadmin!)).toBe(true);
    expect(await s.canCreateInCategory(env, c.w1, c.cats.move!, u.eqPres!)).toBe(true);
    expect(await s.canCreateInCategory(env, c.w1, c.cats['helping-hand']!, u.wcMember!)).toBe(true);
    expect(await s.canCreateInCategory(env, c.w1, c.cats['helping-hand']!, u.crossRow!)).toBe(false);
    expect(await s.canCreateInCategory(env, c.w1, c.cats['clean-temple']!, u.rsPres!)).toBe(false); // archived
    expect(await s.mayManagePostsInCategory(env, c.w1, c.cats['clean-temple']!, u.rsPres!)).toBe(true);
    expect(await s.canCreateInCategory(env, c.w1, c.cats.meal!, u.rsEditor!)).toBe(false);
    expect(await s.canCreateInCategory(env, c.w1, c.cats['conf-opp']!, u.rsEditor!)).toBe(true);
    expect(await s.isCategoryDelegate(env, c.w1, c.cats.meal!, u.former!)).toBe(false);
    expect(await s.isBishopric(env, c.w1, u.former!)).toBe(false);
    expect(await s.isBishopric(env, c.w1, u.outsider!)).toBe(false);
    expect(await s.canSeeRequest(env, c.w1, c.reqs['req-christmas']!, u.christmasDelegate!)).toBe(true);
    expect(await s.canSeeRequest(env, c.w1, c.reqs['req-moving']!, u.counselor!)).toBe(true);
    await renullLegacy(c);
    expect(await v.canEditPost(env, u.eqPres!, c.posts.legacyEq!)).toBe(true);
    expect(await v.canEditPost(env, u.crossRow!, c.posts.primary!)).toBe(false);
    expect(await v.canViewPost(env, u.crossRow!, c.posts.wc!)).toBe(true); // volAccess's own looser join
    expect(await v.canManageOrg(env, c.w1, c.spaces.primary!, u.crossRow!)).toBe(true);
    expect(await v.canEditPost(env, u.former!, c.posts.orgByFormer!)).toBe(false);
    expect(await v.canViewPost(env, u.counselor!, c.posts['w2-as-w1']!)).toBe(false);
    expect(await v.canApproveVolunteer(env, c.w1, c.vols.archived!, u.eqPres!)).toBe(true);
    expect(await v.canApproveVolunteer(env, c.w1, c.vols.legacy!, u.eqPres!)).toBe(true);
    expect(await s.requestNotifyEmails(env, c.w1, c.cats['req-moving']!)).toHaveLength(1); // stale delegate -> EQ owner
  }, SLOW);

  it("a snapshot for someone else, or another ward, is never used for a decision", async () => {
    const u = c.users;
    const bishops = await loadAccess(env, c.w1, u.bishop!);
    expect(await curS.isBishopric(env, c.w1, u.counselor!, bishops)).toBe(await refS.isBishopric(env, c.w1, u.counselor!));
    expect(await curS.isBishopric(env, c.w1, u.plainMember!, bishops)).toBe(false);
    expect(await curS.isCategoryManager(env, c.w1, c.cats['req-other']!, u.counselor!, bishops)).toBe(false);
    expect(await curV.canEditPost(env, u.plainMember!, c.posts.bish!, bishops)).toBe(false);
    const outsiders = await loadAccess(env, c.w2, u.outsider!);
    expect(await curS.isBishopric(env, c.w1, u.outsider!, outsiders)).toBe(false);
    // A stored post of ward 1 against a ward-2 snapshot: deny.
    const p = (await loadPosts(env, c.w1, [c.posts.org!.id])).get(c.posts.org!.id)!;
    expect(canViewStored(outsiders, p)).toBe(false);
    expect(canEditStored(outsiders, p)).toBe(false);
  }, SLOW);
});
