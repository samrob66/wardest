import { describe, it, expect, beforeAll } from 'vitest';
import { env } from './helpers';
import { addDelegate, insertPost, makeServiceCast, type ServiceCast } from './serviceCast';
import {
  canCreateInCategory, canManageCategory, canManageRequest, canSeeRequest, categoriesUserMayCreateIn,
  categoryMessageEmails, isCategoryDelegate, isCategoryManager, requestNotifyEmails,
} from '../src/lib/serviceAccess';
import { canEditPost, canViewPost } from '../src/lib/volAccess';
import { approverEmails } from '../src/lib/volMessages';
import { addEditor } from '../src/lib/volEditors';

describe('serviceAccess: opportunity categories', () => {
  let c: ServiceCast;
  beforeAll(async () => {
    c = await makeServiceCast();
  });

  it('RS president manages meal and creates while it has no delegates; not once one exists (still views)', async () => {
    const meal = c.cat.meal!.id;
    expect(await isCategoryManager(env, c.wardId, meal, c.rsPres)).toBe(true);
    expect(await canManageCategory(env, c.wardId, meal, c.rsPres)).toBe(true);
    expect(await canCreateInCategory(env, c.wardId, meal, c.rsPres)).toBe(true);
    // An RS volunteer editor may create too, while there are no delegates.
    await addEditor(env, c.wardId, c.spaces['relief-society']!, c.rsSecretary, c.rsPres);
    expect(await canCreateInCategory(env, c.wardId, meal, c.rsSecretary)).toBe(true);
    const presPost = await insertPost(c.wardId, { spaceId: c.spaces['relief-society']!, categoryId: meal, createdBy: c.bishop, title: 'Meals for the Ortegas' });
    expect(await canEditPost(env, c.rsPres, { id: presPost, ward_id: c.wardId, space_id: '', created_by_user_id: null })).toBe(true);

    await addDelegate(c.wardId, meal, c.mealDelegate, c.rsPres);
    expect(await canCreateInCategory(env, c.wardId, meal, c.rsPres)).toBe(false);
    expect(await canCreateInCategory(env, c.wardId, meal, c.rsSecretary)).toBe(false);
    expect(await isCategoryManager(env, c.wardId, meal, c.rsPres)).toBe(true);
    const ref = { id: presPost, ward_id: c.wardId, space_id: '', created_by_user_id: null };
    expect(await canEditPost(env, c.rsPres, ref)).toBe(false);
    expect(await canViewPost(env, c.rsPres, ref)).toBe(true);
  });

  it('the meal delegate (a ward member with no spaces) creates, edits and sees every meal post, but not move', async () => {
    const meal = c.cat.meal!.id;
    await addDelegate(c.wardId, meal, c.mealDelegate, c.rsPres);
    expect(await isCategoryDelegate(env, c.wardId, meal, c.mealDelegate)).toBe(true);
    expect(await canCreateInCategory(env, c.wardId, meal, c.mealDelegate)).toBe(true);
    expect(await canCreateInCategory(env, c.wardId, c.cat.move!.id, c.mealDelegate)).toBe(false);
    const other = await insertPost(c.wardId, { spaceId: c.spaces['relief-society']!, categoryId: meal, createdBy: c.rsPres });
    const ref = { id: other, ward_id: c.wardId, space_id: '', created_by_user_id: null };
    expect(await canViewPost(env, c.mealDelegate, ref)).toBe(true);
    expect(await canEditPost(env, c.mealDelegate, ref)).toBe(true);
    const movePost = await insertPost(c.wardId, { spaceId: c.spaces['elders-quorum']!, categoryId: c.cat.move!.id, createdBy: c.eqPres });
    const moveRef = { id: movePost, ward_id: c.wardId, space_id: '', created_by_user_id: null };
    expect(await canViewPost(env, c.mealDelegate, moveRef)).toBe(false);
    expect(await canEditPost(env, c.mealDelegate, moveRef)).toBe(false);
    const mine = await categoriesUserMayCreateIn(env, c.wardId, c.mealDelegate);
    expect(mine.map((x) => x.slug)).toEqual(['meal']);
  });

  it('a ward council member creates helping-hand, not meal', async () => {
    expect(await canCreateInCategory(env, c.wardId, c.cat['helping-hand']!.id, c.wcMember)).toBe(true);
    expect(await canCreateInCategory(env, c.wardId, c.cat.meal!.id, c.wcMember)).toBe(false);
    expect(await isCategoryManager(env, c.wardId, c.cat['helping-hand']!.id, c.wcMember)).toBe(false);
  });

  it('bishopric and superadmins create anywhere (opportunities only)', async () => {
    for (const uid of [c.bishop, c.counselor, c.exec]) {
      expect(await canCreateInCategory(env, c.wardId, c.cat.meal!.id, uid)).toBe(true);
      expect(await canCreateInCategory(env, c.wardId, c.cat.move!.id, uid)).toBe(true);
    }
  });

  it('nobody creates in a request category or an archived one', async () => {
    for (const uid of [c.bishop, c.exec, c.eqPres, c.christmasDelegate]) {
      expect(await canCreateInCategory(env, c.wardId, c.cat['req-moving']!.id, uid)).toBe(false);
      expect(await canCreateInCategory(env, c.wardId, c.cat['req-christmas']!.id, uid)).toBe(false);
    }
    await env.DB.prepare(`UPDATE service_categories SET archived = 1 WHERE id = ?`).bind(c.cat['sub-primary']!.id).run();
    expect(await canCreateInCategory(env, c.wardId, c.cat['sub-primary']!.id, c.exec)).toBe(false);
    expect(await canCreateInCategory(env, c.wardId, c.cat['sub-primary']!.id, c.bishop)).toBe(false);
    expect((await categoriesUserMayCreateIn(env, c.wardId, c.exec)).map((x) => x.slug)).not.toContain('sub-primary');
    await env.DB.prepare(`UPDATE service_categories SET archived = 0 WHERE id = ?`).bind(c.cat['sub-primary']!.id).run();
  });

  it('someone from another ward is denied everywhere', async () => {
    for (const cat of Object.values(c.cat)) {
      expect(await isCategoryManager(env, c.wardId, cat.id, c.stranger)).toBe(false);
      expect(await isCategoryDelegate(env, c.wardId, cat.id, c.stranger)).toBe(false);
      expect(await canCreateInCategory(env, c.wardId, cat.id, c.stranger)).toBe(false);
    }
    for (const r of Object.values(c.requests)) expect(await canSeeRequest(env, c.wardId, r, c.stranger)).toBe(false);
    expect(await categoriesUserMayCreateIn(env, c.wardId, c.stranger)).toEqual([]);
  });

  it('a removed ward member who still has a delegate row is denied', async () => {
    const helpingHand = c.cat['helping-hand']!.id;
    const { makeLeader, uniqueEmail } = await import('./helpers');
    const gone = await makeLeader(env, c.wardId, { email: uniqueEmail('gone'), name: 'Gone' });
    await addDelegate(c.wardId, helpingHand, gone);
    expect(await canCreateInCategory(env, c.wardId, helpingHand, gone)).toBe(true);
    await env.DB.prepare(`DELETE FROM ward_memberships WHERE ward_id = ? AND user_id = ?`).bind(c.wardId, gone).run();
    expect(await isCategoryDelegate(env, c.wardId, helpingHand, gone)).toBe(false);
    expect(await canCreateInCategory(env, c.wardId, helpingHand, gone)).toBe(false);
    // ...and a stale delegate row doesn't take creating away from the managers.
    expect(await canCreateInCategory(env, c.wardId, helpingHand, c.wcMember)).toBe(true);
  });

  it('unknown or wrong-ward ids fail closed', async () => {
    expect(await isCategoryManager(env, c.wardId, 'scat_nope', c.exec)).toBe(false);
    expect(await canCreateInCategory(env, c.wardId, '', c.exec)).toBe(false);
    expect(await canSeeRequest(env, c.wardId, 'sreq_nope', c.exec)).toBe(false);
    expect(await isCategoryManager(env, c.wardId, c.cat.meal!.id, '')).toBe(false);
  });
});

describe('serviceAccess: request categories', () => {
  let c: ServiceCast;
  beforeAll(async () => {
    c = await makeServiceCast();
  });

  it('a bishopric counselor manages req-moving but can not see req-christmas or req-other', async () => {
    expect(await isCategoryManager(env, c.wardId, c.cat['req-moving']!.id, c.counselor)).toBe(true);
    expect(await canSeeRequest(env, c.wardId, c.requests['req-moving']!, c.counselor)).toBe(true);
    for (const slug of ['req-christmas', 'req-other']) {
      expect(await isCategoryManager(env, c.wardId, c.cat[slug]!.id, c.counselor), slug).toBe(false);
      expect(await canSeeRequest(env, c.wardId, c.requests[slug]!, c.counselor), slug).toBe(false);
      expect(await canManageRequest(env, c.wardId, c.requests[slug]!, c.counselor), slug).toBe(false);
    }
  });

  it('the bishop (bishopric owner) and superadmins see the confidential ones', async () => {
    for (const uid of [c.bishop, c.exec]) {
      for (const slug of ['req-christmas', 'req-other', 'req-moving']) {
        expect(await canSeeRequest(env, c.wardId, c.requests[slug]!, uid), slug).toBe(true);
        expect(await isCategoryManager(env, c.wardId, c.cat[slug]!.id, uid), slug).toBe(true);
      }
    }
  });

  it('the Christmas delegate sees only Christmas requests', async () => {
    expect(await canSeeRequest(env, c.wardId, c.requests['req-christmas']!, c.christmasDelegate)).toBe(true);
    expect(await canSeeRequest(env, c.wardId, c.requests['req-other']!, c.christmasDelegate)).toBe(false);
    expect(await canSeeRequest(env, c.wardId, c.requests['req-moving']!, c.christmasDelegate)).toBe(false);
    expect(await isCategoryManager(env, c.wardId, c.cat['req-christmas']!.id, c.christmasDelegate)).toBe(false);
  });

  it('EQ president sees moving requests, not Christmas; a plain member sees none', async () => {
    expect(await canSeeRequest(env, c.wardId, c.requests['req-moving']!, c.eqPres)).toBe(true);
    expect(await canSeeRequest(env, c.wardId, c.requests['req-christmas']!, c.eqPres)).toBe(false);
    for (const r of Object.values(c.requests)) expect(await canSeeRequest(env, c.wardId, r, c.plainMember)).toBe(false);
  });

  it('requestNotifyEmails: delegates; else owners of the owning spaces; else superadmins', async () => {
    expect(await requestNotifyEmails(env, c.wardId, c.cat['req-christmas']!.id)).toEqual([c.emails.christmasDelegate]);
    expect(await requestNotifyEmails(env, c.wardId, c.cat['req-other']!.id)).toEqual([c.emails.bishop]);
    expect(await requestNotifyEmails(env, c.wardId, c.cat['req-moving']!.id)).toEqual([c.emails.eqPres]);
    // No owner in the owning space: the ward's superadmins (founder + exec).
    await env.DB.prepare(`UPDATE space_memberships SET role = 'member' WHERE space_id = ?`).bind(c.spaces['elders-quorum']).run();
    const fallback = await requestNotifyEmails(env, c.wardId, c.cat['req-moving']!.id);
    expect(fallback).toContain(c.emails.exec);
    expect(fallback).not.toContain(c.emails.eqPres);
    await env.DB.prepare(`UPDATE space_memberships SET role = 'owner' WHERE space_id = ? AND user_id = ?`).bind(c.spaces['elders-quorum'], c.eqPres).run();
  });

  it('categoryMessageEmails: delegates when there are any, else the owning spaces owners', async () => {
    expect(await categoryMessageEmails(env, c.wardId, c.cat['req-christmas']!.id)).toEqual([c.emails.christmasDelegate]);
    expect(await categoryMessageEmails(env, c.wardId, c.cat.meal!.id)).toEqual([c.emails.rsPres]);
  });
});

describe('posts in ward-council and bishopric spaces', () => {
  let c: ServiceCast;
  beforeAll(async () => {
    c = await makeServiceCast();
  });

  it('a bishopric post: not for a ward-council member outside the bishopric; yes for its category delegate', async () => {
    const cb = c.cat['clean-building']!.id;
    const post = await insertPost(c.wardId, { spaceId: c.spaces.bishopric!, categoryId: cb, createdBy: c.bishop });
    const ref = { id: post, ward_id: c.wardId, space_id: '', created_by_user_id: null };
    expect(await canViewPost(env, c.wcMember, ref)).toBe(false);
    expect(await canViewPost(env, c.rsPres, ref)).toBe(false);
    expect(await canViewPost(env, c.counselor, ref)).toBe(true);
    expect(await canEditPost(env, c.counselor, ref)).toBe(true);
    expect(await canViewPost(env, c.plainMember, ref)).toBe(false);
    await addDelegate(c.wardId, cb, c.plainMember, c.bishop);
    expect(await canViewPost(env, c.plainMember, ref)).toBe(true);
    expect(await canEditPost(env, c.plainMember, ref)).toBe(true);
  });

  it('a ward-council post: ward council members view; a council member creates (flag) and edits only their own', async () => {
    const hh = c.cat['helping-hand']!.id;
    const byRs = await insertPost(c.wardId, { spaceId: c.spaces['ward-council']!, categoryId: hh, createdBy: c.rsPres });
    const ref = { id: byRs, ward_id: c.wardId, space_id: '', created_by_user_id: null };
    expect(await canViewPost(env, c.wcMember, ref)).toBe(true);
    expect(await canViewPost(env, c.rsSecretary, ref)).toBe(false);
    expect(await canEditPost(env, c.rsPres, ref)).toBe(true);
    // wcMember may create helping-hand posts, so may edit this one too (canCreateInCategory).
    expect(await canEditPost(env, c.wcMember, ref)).toBe(true);
    expect(await canEditPost(env, c.rsSecretary, ref)).toBe(false);
  });

  it('a post with no category in an org space keeps the old org rules', async () => {
    const post = await insertPost(c.wardId, { spaceId: c.spaces['elders-quorum']!, categoryId: null, createdBy: c.bishop });
    const ref = { id: post, ward_id: c.wardId, space_id: '', created_by_user_id: null };
    expect(await canEditPost(env, c.eqPres, ref)).toBe(true);
    expect(await canViewPost(env, c.rsPres, ref)).toBe(true); // ward council
    expect(await canEditPost(env, c.rsPres, ref)).toBe(false);
  });

  it('approverEmails: delegates + creator when delegates exist, the old list otherwise', async () => {
    const move = c.cat.move!.id;
    const post = await insertPost(c.wardId, { spaceId: c.spaces['elders-quorum']!, categoryId: move, createdBy: c.counselor });
    expect((await approverEmails(env, c.wardId, post)).sort()).toEqual([c.emails.counselor, c.emails.eqPres].sort());
    await addDelegate(c.wardId, move, c.plainMember, c.eqPres);
    expect((await approverEmails(env, c.wardId, post)).sort()).toEqual([c.emails.counselor, c.emails.plainMember].sort());
  });
});
