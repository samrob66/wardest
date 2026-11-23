// The equivalence harness's cast, decision tables and comparisons (plan 2026-11-23-access-
// batching, Task 1), shared by test/accessEquivalence*.test.ts (split in three so the slow
// reference side runs in parallel workers): every permission decision the current
// src/lib/serviceAccess.ts + src/lib/volAccess.ts make must equal the frozen reference copies of
// those modules (test/reference/*, main @ b44a212), for a cast built to hit every rule and every
// fail-closed edge: a former member with leftover rows, an outsider from another ward, rows whose
// ward_id disagrees with their space's, archived / confidential / owner-less categories, a
// stale-only delegate, legacy NULL-category posts, cross-ward ids. Invented people only
// (@example.test).
import { expect } from 'vitest';
import { env, makeWard, makeLeader, uniqueEmail } from './helpers';
import { addDelegate, insertPost, insertRequest } from './serviceCast';
import { newId } from '../src/lib/ids';
import { listCategories } from '../src/lib/serviceCategories';
import * as curS from '../src/lib/serviceAccess';
import * as curV from '../src/lib/volAccess';
import * as refS from './reference/serviceAccessRef';
import * as refV from './reference/volAccessRef';
import { loadAccess, type AccessSnapshot } from '../src/lib/serviceAccess';
import {
  canEditStored, canManageEditorListIn, canManageOrgIn, canViewStored, loadPosts, type PostRef, type StoredPost,
} from '../src/lib/volAccess';

type SImpl = typeof refS;
type VImpl = typeof refV;
const IMPLS: Array<{ name: string; s: SImpl; v: VImpl }> = [
  { name: 'reference', s: refS, v: refV },
  { name: 'current', s: curS as unknown as SImpl, v: curV as unknown as VImpl },
];
export const SLOW = 120_000;

export interface Cast {
  w1: string;
  w2: string;
  users: Record<string, string>; // key -> user id ('' and an unknown id included)
  cats: Record<string, string>; // label -> category id (ward 1, ward 2, bogus)
  reqs: Record<string, string>;
  posts: Record<string, PostRef>;
  legacyPosts: string[];
  spaces: Record<string, string>;
  vols: Record<string, string>;
}

async function spaceOf(wardId: string, slug: string): Promise<string> {
  const r = await env.DB.prepare(`SELECT id FROM spaces WHERE ward_id = ? AND slug = ?`).bind(wardId, slug).first<{ id: string }>();
  if (!r) throw new Error(`no space ${slug}`);
  return r.id;
}

async function addCategory(
  wardId: string,
  o: { slug: string; kind: 'opportunity' | 'request'; confidential?: number; council?: number; archived?: number; owners: string[] },
): Promise<string> {
  const id = newId('scat');
  await env.DB.prepare(
    `INSERT INTO service_categories (id, ward_id, kind, slug, name, confidential, council_may_create, archived, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 50)`,
  )
    .bind(id, wardId, o.kind, o.slug, o.slug, o.confidential ?? 0, o.council ?? 0, o.archived ?? 0)
    .run();
  for (const sid of o.owners) {
    await env.DB.prepare(`INSERT INTO service_category_spaces (id, ward_id, category_id, space_id) VALUES (?, ?, ?, ?)`)
      .bind(newId('scs'), wardId, id, sid)
      .run();
  }
  return id;
}

async function waitingVolunteer(wardId: string, postId: string): Promise<string> {
  const dateId = newId('vd');
  const roleId = newId('vr');
  const volId = newId('vv');
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO vol_dates (id, ward_id, post_id, date) VALUES (?, ?, ?, '2026-12-06')`).bind(dateId, wardId, postId),
    env.DB.prepare(`INSERT INTO vol_roles (id, ward_id, post_id, date_id, name, needed) VALUES (?, ?, ?, ?, 'Helpers', 2)`).bind(roleId, wardId, postId, dateId),
    env.DB.prepare(
      `INSERT INTO volunteers (id, ward_id, email, name, approval, email_verified_at) VALUES (?, ?, ?, 'V', 'pending', datetime('now'))`,
    ).bind(volId, wardId, uniqueEmail('vol')),
    env.DB.prepare(`INSERT INTO vol_signups (id, ward_id, post_id, role_id, volunteer_id, status) VALUES (?, ?, ?, ?, ?, 'waiting')`).bind(
      newId('vs'), wardId, postId, roleId, volId,
    ),
  ]);
  return volId;
}

export async function makeEquivCast(): Promise<Cast> {
  const a = await makeWard(env);
  const b = await makeWard(env);
  const w1 = a.wardId;
  const w2 = b.wardId;
  const mk = (key: string, o: { wardRole?: 'superadmin' | 'member'; spaces?: Array<[string, 'owner' | 'member']> } = {}, ward = w1) =>
    makeLeader(env, ward, { email: uniqueEmail(key), name: key, ...o });

  const users: Record<string, string> = { founder: a.founderId };
  users.superadmin = await mk('superadmin', { wardRole: 'superadmin' });
  users.bishop = await mk('bishop', { spaces: [['bishopric', 'owner']] });
  users.counselor = await mk('counselor', { spaces: [['bishopric', 'member'], ['ward-council', 'member']] });
  users.rsPres = await mk('rsPres', { spaces: [['relief-society', 'owner'], ['ward-council', 'member']] });
  users.rsMember = await mk('rsMember', { spaces: [['relief-society', 'member']] });
  users.rsEditor = await mk('rsEditor');
  users.eqPres = await mk('eqPres', { spaces: [['elders-quorum', 'owner'], ['ward-council', 'member']] });
  users.wcMember = await mk('wcMember', { spaces: [['ward-council', 'member']] });
  users.mealDelegate = await mk('mealDelegate');
  users.christmasDelegate = await mk('christmasDelegate');
  users.plainMember = await mk('plainMember');
  users.former = await mk('former', { spaces: [['relief-society', 'owner'], ['bishopric', 'member'], ['ward-council', 'member']] });
  users.crossRow = await mk('crossRow');
  users.outsider = await mk('outsider', { wardRole: 'superadmin', spaces: [['relief-society', 'owner'], ['bishopric', 'owner']] }, w2);
  users.noRows = newId('usr'); // no users row, no membership
  users.empty = '';

  const sp: Record<string, string> = {};
  for (const slug of Object.keys(a.spaces)) sp[slug] = a.spaces[slug]!;
  const w2rs = await spaceOf(w2, 'relief-society');
  const w2eq = await spaceOf(w2, 'elders-quorum');

  const all = await listCategories(env, w1, { includeArchived: true });
  const c1 = Object.fromEntries(all.map((c) => [c.slug, c.id])) as Record<string, string>;
  const all2 = await listCategories(env, w2, { includeArchived: true });
  const c2 = Object.fromEntries(all2.map((c) => [c.slug, c.id])) as Record<string, string>;

  // Extra categories: archived default, a confidential opportunity, an owner-less council one,
  // an archived request category.
  await env.DB.prepare(`UPDATE service_categories SET archived = 1 WHERE id = ?`).bind(c1['clean-temple']).run();
  const confOpp = await addCategory(w1, { slug: 'conf-opp', kind: 'opportunity', confidential: 1, owners: [sp['relief-society']!] });
  const orphan = await addCategory(w1, { slug: 'orphan', kind: 'opportunity', council: 1, owners: [] });
  const archReq = await addCategory(w1, { slug: 'arch-req', kind: 'request', archived: 1, owners: [sp['elders-quorum']!] });
  // A ward-1 category row linked to a ward-2 space (must count for nothing).
  await env.DB.prepare(`INSERT INTO service_category_spaces (id, ward_id, category_id, space_id) VALUES (?, ?, ?, ?)`)
    .bind(newId('scs'), w1, c1.move, w2eq)
    .run();

  // Delegates: live, stale (former member), and a row stamped with the other ward.
  await addDelegate(w1, c1.meal!, users.mealDelegate);
  await addDelegate(w1, c1['req-christmas']!, users.christmasDelegate);
  for (const cid of [c1.meal!, c1.activity!, c1['req-moving']!, orphan]) await addDelegate(w1, cid, users.former);
  await addDelegate(w2, c1.move!, users.crossRow);
  await addDelegate(w2, c2.meal!, users.outsider);

  // Volunteer editors: live, stale, and a row stamped with the other ward.
  const editor = (wardId: string, spaceId: string, userId: string) =>
    env.DB.prepare(`INSERT INTO vol_editors (id, ward_id, space_id, user_id) VALUES (?, ?, ?, ?)`).bind(newId('ve'), wardId, spaceId, userId).run();
  await editor(w1, sp['relief-society']!, users.rsEditor);
  await editor(w1, sp['elders-quorum']!, users.former);
  await editor(w2, sp['sunday-school']!, users.crossRow);

  // crossRow: space memberships in ward-1 spaces, but stamped ward 2.
  for (const [slug, role] of [['ward-council', 'member'], ['primary', 'owner'], ['bishopric', 'member']] as const) {
    await env.DB.prepare(`INSERT INTO space_memberships (id, ward_id, space_id, user_id, role) VALUES (?, ?, ?, ?, ?)`)
      .bind(newId('sm'), w2, sp[slug], users.crossRow, role)
      .run();
  }

  // The former member leaves the ward, keeping every other row.
  await env.DB.prepare(`DELETE FROM ward_memberships WHERE ward_id = ? AND user_id = ?`).bind(w1, users.former).run();

  const cats: Record<string, string> = {};
  for (const [slug, id] of Object.entries(c1)) cats[slug] = id;
  cats['conf-opp'] = confOpp;
  cats.orphan = orphan;
  cats['arch-req'] = archReq;
  cats['w2:meal'] = c2.meal!;
  cats['w2:req-christmas'] = c2['req-christmas']!;
  cats.bogus = newId('scat');
  cats.empty = '';

  const reqs: Record<string, string> = {};
  for (const slug of ['req-moving', 'req-christmas', 'req-other']) reqs[slug] = await insertRequest(w1, c1[slug]!);
  reqs['arch-req'] = await insertRequest(w1, archReq);
  reqs['w2:req-moving'] = await insertRequest(w2, c2['req-moving']!);
  reqs.bogus = newId('sreq');

  const ref = (id: string, wardId: string): PostRef => ({ id, ward_id: wardId, space_id: '', created_by_user_id: users.superadmin! });
  const p = async (spaceId: string, categoryId: string | null, createdBy: string | null, wardId = w1) =>
    insertPost(wardId, { spaceId, categoryId, createdBy });
  const posts: Record<string, PostRef> = {};
  const ids: Record<string, string> = {
    org: await p(sp['relief-society']!, c1.meal!, users.rsMember!),
    orgByFormer: await p(sp['elders-quorum']!, c1.move!, users.former!),
    wc: await p(sp['ward-council']!, c1['helping-hand']!, users.wcMember!),
    bish: await p(sp.bishopric!, c1['clean-building']!, users.bishop!),
    legacyEq: await p(sp['elders-quorum']!, null, null),
    legacyRs: await p(sp['relief-society']!, null, users.rsMember!),
    legacyWc: await p(sp['ward-council']!, null, null),
    archived: await p(sp['elders-quorum']!, c1['clean-temple']!, null),
    activity: await p(sp['activities-committee']!, c1.activity!, null),
    conf: await p(sp['relief-society']!, confOpp, null),
    orphan: await p(sp['ward-council']!, orphan, null),
    mismatch: await p(sp['relief-society']!, c1.move!, null),
    primary: await p(sp.primary!, c1['sub-primary']!, null),
    sundaySchool: await p(sp['sunday-school']!, c1['sub-sunday-school']!, null),
    public: await p(sp.public!, c1['helping-hand']!, null),
    w2: await p(w2rs, c2.meal!, null, w2),
  };
  for (const [k, id] of Object.entries(ids)) posts[k] = ref(id, k === 'w2' ? w2 : w1);
  posts['w2-as-w1'] = ref(ids.w2!, w1);
  posts['org-as-w2'] = ref(ids.org!, w2);
  posts.bogus = ref(newId('vp'), w1);
  posts.empty = { id: '', ward_id: w1, space_id: '', created_by_user_id: null };

  const vols: Record<string, string> = {
    archived: await waitingVolunteer(w1, ids.archived!),
    legacy: await waitingVolunteer(w1, ids.legacyEq!),
    org: await waitingVolunteer(w1, ids.org!),
    w2: await waitingVolunteer(w2, ids.w2!),
    bogus: newId('vv'),
  };

  const spaces: Record<string, string> = { ...sp, 'w2:relief-society': w2rs, empty: '' };
  return { w1, w2, users, cats, reqs, posts, legacyPosts: [ids.legacyEq!, ids.legacyRs!, ids.legacyWc!], spaces, vols };
}

// Legacy (NULL-category) posts get a category the first time anything calls listCategories (its
// backfill), so the post tests put them back first.
export async function renullLegacy(c: Cast): Promise<void> {
  for (const id of c.legacyPosts) await env.DB.prepare(`UPDATE vol_posts SET category_id = NULL WHERE id = ?`).bind(id).run();
}

export type Table = Record<string, unknown>;

export async function postTable(impl: { s: SImpl; v: VImpl }, c: Cast, uid: string): Promise<Table> {
  const jobs: Array<[string, Promise<unknown>]> = [];
  for (const [k, ref] of Object.entries(c.posts)) {
    jobs.push([`edit ${k}`, impl.v.canEditPost(env, uid, ref)]);
    jobs.push([`view ${k}`, impl.v.canViewPost(env, uid, ref)]);
  }
  for (const [k, sid] of Object.entries(c.spaces)) {
    jobs.push([`manageOrg ${k}`, impl.v.canManageOrg(env, c.w1, sid, uid)]);
    jobs.push([`editorList ${k}`, impl.v.canManageEditorList(env, c.w1, sid, uid)]);
  }
  for (const [k, vid] of Object.entries(c.vols)) jobs.push([`approve ${k}`, impl.v.canApproveVolunteer(env, c.w1, vid, uid)]);
  jobs.push(['wardVolunteers', impl.v.canSeeWardVolunteers(env, c.w1, uid)]);
  jobs.push(['wardVolunteers w2', impl.v.canSeeWardVolunteers(env, c.w2, uid)]);
  return settleAll(jobs);
}

export async function categoryTable(impl: { s: SImpl; v: VImpl }, c: Cast, uid: string): Promise<Table> {
  const jobs: Array<[string, Promise<unknown>]> = [];
  for (const [k, cid] of Object.entries(c.cats)) {
    jobs.push([`manager ${k}`, impl.s.isCategoryManager(env, c.w1, cid, uid)]);
    jobs.push([`delegate ${k}`, impl.s.isCategoryDelegate(env, c.w1, cid, uid)]);
    jobs.push([`create ${k}`, impl.s.canCreateInCategory(env, c.w1, cid, uid)]);
    jobs.push([`managePosts ${k}`, impl.s.mayManagePostsInCategory(env, c.w1, cid, uid)]);
    jobs.push([`seeRequestCat ${k}`, impl.s.canSeeRequestCategory(env, c.w1, cid, uid)]);
  }
  for (const k of ['w2:meal', 'w2:req-christmas']) {
    jobs.push([`w2 manager ${k}`, impl.s.isCategoryManager(env, c.w2, c.cats[k]!, uid)]);
    jobs.push([`w2 create ${k}`, impl.s.canCreateInCategory(env, c.w2, c.cats[k]!, uid)]);
    jobs.push([`w2 delegate ${k}`, impl.s.isCategoryDelegate(env, c.w2, c.cats[k]!, uid)]);
    jobs.push([`w2 seeRequestCat ${k}`, impl.s.canSeeRequestCategory(env, c.w2, c.cats[k]!, uid)]);
  }
  for (const [k, rid] of Object.entries(c.reqs)) {
    jobs.push([`seeRequest ${k}`, impl.s.canSeeRequest(env, c.w1, rid, uid)]);
  }
  jobs.push(['seeRequest w2 own', impl.s.canSeeRequest(env, c.w2, c.reqs['w2:req-moving']!, uid)]);
  jobs.push(['bishopric', impl.s.isBishopric(env, c.w1, uid)]);
  jobs.push(['bishopric w2', impl.s.isBishopric(env, c.w2, uid)]);
  return settleAll(jobs);
}

export async function listTable(impl: { s: SImpl; v: VImpl }, c: Cast, uid: string): Promise<Table> {
  return {
    mayCreateIn: (await impl.s.categoriesUserMayCreateIn(env, c.w1, uid)).map((x) => x.id),
    'mayCreateIn w2': (await impl.s.categoriesUserMayCreateIn(env, c.w2, uid)).map((x) => x.id),
    hasServiceRole: await impl.s.hasServiceRole(env, c.w1, uid),
    'hasServiceRole w2': await impl.s.hasServiceRole(env, c.w2, uid),
  };
}

export async function recipientTable(impl: { s: SImpl; v: VImpl }, c: Cast): Promise<Table> {
  const jobs: Array<[string, Promise<unknown>]> = [];
  for (const [k, cid] of Object.entries(c.cats)) {
    for (const [wk, w] of [['w1', c.w1], ['w2', c.w2]] as const) {
      jobs.push([`${wk} messageEmails ${k}`, impl.s.categoryMessageEmails(env, w, cid)]);
      jobs.push([`${wk} notifyEmails ${k}`, impl.s.requestNotifyEmails(env, w, cid)]);
      jobs.push([`${wk} delegateUserIds ${k}`, impl.s.delegateUserIds(env, w, cid).then((x) => [...x].sort())]);
      jobs.push([`${wk} delegateEmails ${k}`, impl.s.delegateEmails(env, w, cid)]);
    }
  }
  return settleAll(jobs);
}

// Read-only decisions, run side by side (D1 round trips overlap; the answers can't interfere).
async function settleAll(jobs: Array<[string, Promise<unknown>]>): Promise<Table> {
  const values = await Promise.all(jobs.map(([, p]) => p));
  return Object.fromEntries(jobs.map(([k], i) => [k, values[i]]));
}

// The reference answers, computed once per table and user (the snapshot tests reuse them).
const refCache = new Map<string, Promise<Table>>();
export function reference(key: string, fn: (impl: { s: SImpl; v: VImpl }) => Promise<Table>): Promise<Table> {
  if (!refCache.has(key)) refCache.set(key, fn(IMPLS[0]!));
  return refCache.get(key)!;
}

export async function compare(key: string, fn: (impl: { s: SImpl; v: VImpl }) => Promise<Table>): Promise<void> {
  const ref = await reference(key, fn);
  const cur = await fn(IMPLS[1]!);
  expect(Object.keys(ref).length).toBeGreaterThan(0);
  expect(cur).toEqual(ref);
}

// ---- the snapshot path the listing routes use: one snapshot per (ward, user), posts batch-read
// with loadPosts, decisions made in memory. Compared key by key with the reference tables.

async function snaps(c: Cast, uid: string): Promise<Record<string, AccessSnapshot>> {
  return { [c.w1]: await loadAccess(env, c.w1, uid), [c.w2]: await loadAccess(env, c.w2, uid) };
}

export async function snapPostTable(c: Cast, uid: string): Promise<Table> {
  const s = await snaps(c, uid);
  const t: Table = {};
  const byWard = new Map<string, Map<string, StoredPost>>();
  for (const w of [c.w1, c.w2]) {
    byWard.set(w, await loadPosts(env, w, Object.values(c.posts).filter((r) => r.ward_id === w).map((r) => r.id)));
  }
  for (const [k, ref] of Object.entries(c.posts)) {
    const p = byWard.get(ref.ward_id)?.get(ref.id);
    t[`edit ${k}`] = p ? canEditStored(s[ref.ward_id]!, p) : false;
    t[`view ${k}`] = p ? canViewStored(s[ref.ward_id]!, p) : false;
  }
  for (const [k, sid] of Object.entries(c.spaces)) {
    t[`manageOrg ${k}`] = canManageOrgIn(s[c.w1]!, sid);
    t[`editorList ${k}`] = canManageEditorListIn(s[c.w1]!, sid);
  }
  for (const [k, vid] of Object.entries(c.vols)) t[`approve ${k}`] = await curV.canApproveVolunteer(env, c.w1, vid, uid, s[c.w1]);
  t.wardVolunteers = s[c.w1]!.isBishopric();
  t['wardVolunteers w2'] = s[c.w2]!.isBishopric();
  return t;
}

export async function snapCategoryTable(c: Cast, uid: string): Promise<Table> {
  const s = await snaps(c, uid);
  const t: Table = {};
  for (const [k, cid] of Object.entries(c.cats)) {
    const x = s[c.w1]!;
    t[`manager ${k}`] = x.isCategoryManager(cid);
    t[`delegate ${k}`] = x.isCategoryDelegate(cid);
    t[`create ${k}`] = x.canCreateInCategory(cid);
    t[`managePosts ${k}`] = x.mayManagePostsInCategory(cid);
    t[`seeRequestCat ${k}`] = x.canSeeRequestCategory(cid);
  }
  for (const k of ['w2:meal', 'w2:req-christmas']) {
    const x = s[c.w2]!;
    t[`w2 manager ${k}`] = x.isCategoryManager(c.cats[k]!);
    t[`w2 create ${k}`] = x.canCreateInCategory(c.cats[k]!);
    t[`w2 delegate ${k}`] = x.isCategoryDelegate(c.cats[k]!);
    t[`w2 seeRequestCat ${k}`] = x.canSeeRequestCategory(c.cats[k]!);
  }
  for (const [k, rid] of Object.entries(c.reqs)) t[`seeRequest ${k}`] = await curS.canSeeRequest(env, c.w1, rid, uid, s[c.w1]);
  t['seeRequest w2 own'] = await curS.canSeeRequest(env, c.w2, c.reqs['w2:req-moving']!, uid, s[c.w2]);
  t.bishopric = s[c.w1]!.isBishopric();
  t['bishopric w2'] = s[c.w2]!.isBishopric();
  return t;
}

export async function snapListTable(c: Cast, uid: string): Promise<Table> {
  const s = await snaps(c, uid);
  return {
    mayCreateIn: (await curS.categoriesUserMayCreateIn(env, c.w1, uid, s[c.w1])).map((x) => x.id),
    'mayCreateIn w2': (await curS.categoriesUserMayCreateIn(env, c.w2, uid, s[c.w2])).map((x) => x.id),
    hasServiceRole: await curS.hasServiceRole(env, c.w1, uid, s[c.w1]),
    'hasServiceRole w2': await curS.hasServiceRole(env, c.w2, uid, s[c.w2]),
  };
}

export const USERS = [
  'founder', 'superadmin', 'bishop', 'counselor', 'rsPres', 'rsMember', 'rsEditor', 'eqPres', 'wcMember', 'mealDelegate',
  'christmasDelegate', 'plainMember', 'former', 'crossRow', 'outsider', 'noRows', 'empty',
];
