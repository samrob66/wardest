// The permission module for service categories, their delegates and members' requests (spec
// 2026-11-22 §3, §6). Sibling of volAccess.ts (posts), which builds on it. Every decision reads
// D1 afresh and is ward-scoped. Fail closed: an unknown, wrong-ward or missing anything -> false.
//
//   Manager of a category    owner of any of its owning spaces; any bishopric member; ward
//                            superadmin (break-glass). A CONFIDENTIAL category (Christmas, Other
//                            requests): only owners of its owning spaces (for the bishopric
//                            space, its owner = the bishop) and superadmins — NOT other
//                            bishopric members.
//   Delegate                 a service_delegates row AND a current ward_memberships row.
//   May create (opportunity  its delegates; or, while it has NO delegates, its managers and the
//   categories only, never   vol_editors of any owning org space; plus any member of the ward's
//   archived)                ward_council space when council_may_create; plus bishopric and
//                            superadmins. Nobody creates in a request category.
//   Sees / manages a request managers and delegates of its category (confidential: as above).
//   Messages                 a category's delegates; if none, its owning spaces' owners. New
//                            requests with no delegates: owning spaces' owners, else superadmins.
import type { Env } from '../types';
import { listCategories, type CategoryRow } from './serviceCategories';

interface CatInfo {
  id: string;
  ward_id: string;
  kind: string;
  confidential: number;
  council_may_create: number;
  archived: number;
}

async function wardRoleOf(env: Env, wardId: string, userId: string): Promise<string | null> {
  if (!wardId || !userId) return null;
  const r = await env.DB.prepare(`SELECT role FROM ward_memberships WHERE ward_id = ? AND user_id = ?`)
    .bind(wardId, userId)
    .first<{ role: string }>();
  return r?.role ?? null;
}

async function inWardSpaceOfKind(env: Env, wardId: string, kind: 'bishopric' | 'ward_council', userId: string): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS ok FROM space_memberships sm JOIN spaces s ON s.id = sm.space_id
      WHERE s.ward_id = ? AND s.kind = ? AND sm.user_id = ? AND sm.ward_id = s.ward_id LIMIT 1`,
  )
    .bind(wardId, kind, userId)
    .first();
  return r != null;
}

// Superadmin OR any member of the ward's Bishopric space. (Re-exported by volAccess.ts.)
export async function isBishopric(env: Env, wardId: string, userId: string): Promise<boolean> {
  const role = await wardRoleOf(env, wardId, userId);
  if (!role) return false;
  if (role === 'superadmin') return true;
  return inWardSpaceOfKind(env, wardId, 'bishopric', userId);
}

async function category(env: Env, wardId: string, categoryId: string): Promise<CatInfo | null> {
  if (!wardId || !categoryId) return null;
  return env.DB.prepare(
    `SELECT id, ward_id, kind, confidential, council_may_create, archived FROM service_categories WHERE id = ? AND ward_id = ?`,
  )
    .bind(categoryId, wardId)
    .first<CatInfo>();
}

// Owner of one of the category's owning spaces (spaces of this ward only).
async function ownsAnOwningSpace(env: Env, wardId: string, categoryId: string, userId: string): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS ok FROM service_category_spaces cs
       JOIN spaces s ON s.id = cs.space_id AND s.ward_id = cs.ward_id
       JOIN space_memberships sm ON sm.space_id = s.id AND sm.ward_id = s.ward_id
      WHERE cs.category_id = ? AND cs.ward_id = ? AND sm.user_id = ? AND sm.role = 'owner' LIMIT 1`,
  )
    .bind(categoryId, wardId, userId)
    .first();
  return r != null;
}

async function isVolEditorOfAnOwningOrg(env: Env, wardId: string, categoryId: string, userId: string): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS ok FROM service_category_spaces cs
       JOIN spaces s ON s.id = cs.space_id AND s.ward_id = cs.ward_id AND s.kind = 'org'
       JOIN vol_editors ve ON ve.space_id = s.id AND ve.ward_id = s.ward_id
      WHERE cs.category_id = ? AND cs.ward_id = ? AND ve.user_id = ? LIMIT 1`,
  )
    .bind(categoryId, wardId, userId)
    .first();
  return r != null;
}

// Delegates who still belong to the ward (a stale row counts for nothing).
async function activeDelegateCount(env: Env, wardId: string, categoryId: string): Promise<number> {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM service_delegates d JOIN ward_memberships wm ON wm.user_id = d.user_id AND wm.ward_id = d.ward_id
      WHERE d.category_id = ? AND d.ward_id = ?`,
  )
    .bind(categoryId, wardId)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

async function managerOf(env: Env, cat: CatInfo, userId: string, role: string): Promise<boolean> {
  if (role === 'superadmin') return true;
  if (await ownsAnOwningSpace(env, cat.ward_id, cat.id, userId)) return true;
  if (cat.confidential) return false;
  return inWardSpaceOfKind(env, cat.ward_id, 'bishopric', userId);
}

export async function isCategoryManager(env: Env, wardId: string, categoryId: string, userId: string): Promise<boolean> {
  const role = await wardRoleOf(env, wardId, userId);
  if (!role) return false;
  const cat = await category(env, wardId, categoryId);
  if (!cat) return false;
  return managerOf(env, cat, userId, role);
}

// Managers add categories, rename, archive, set audiences, manage delegates and warnings.
export const canManageCategory = isCategoryManager;

export async function isCategoryDelegate(env: Env, wardId: string, categoryId: string, userId: string): Promise<boolean> {
  if (!(await wardRoleOf(env, wardId, userId))) return false;
  if (!(await category(env, wardId, categoryId))) return false;
  const r = await env.DB.prepare(`SELECT 1 AS ok FROM service_delegates WHERE ward_id = ? AND category_id = ? AND user_id = ?`)
    .bind(wardId, categoryId, userId)
    .first();
  return r != null;
}

export async function canCreateInCategory(env: Env, wardId: string, categoryId: string, userId: string): Promise<boolean> {
  const role = await wardRoleOf(env, wardId, userId);
  if (!role) return false;
  const cat = await category(env, wardId, categoryId);
  if (!cat || cat.kind !== 'opportunity' || cat.archived) return false;
  if (await isBishopric(env, wardId, userId)) return true;
  if (await isCategoryDelegate(env, wardId, categoryId, userId)) return true;
  if (cat.council_may_create && (await inWardSpaceOfKind(env, wardId, 'ward_council', userId))) return true;
  if ((await activeDelegateCount(env, wardId, categoryId)) > 0) return false;
  if (await managerOf(env, cat, userId, role)) return true;
  return isVolEditorOfAnOwningOrg(env, wardId, categoryId, userId);
}

// Opportunity categories the user may create in (for the picker and the "Create" buttons).
export async function categoriesUserMayCreateIn(env: Env, wardId: string, userId: string): Promise<CategoryRow[]> {
  if (!(await wardRoleOf(env, wardId, userId))) return [];
  const out: CategoryRow[] = [];
  for (const c of await listCategories(env, wardId, { kind: 'opportunity' })) {
    if (await canCreateInCategory(env, wardId, c.id, userId)) out.push(c);
  }
  return out;
}

async function requestCategoryId(env: Env, wardId: string, requestId: string): Promise<string | null> {
  if (!wardId || !requestId) return null;
  const r = await env.DB.prepare(
    `SELECT r.category_id FROM service_requests r JOIN service_categories c ON c.id = r.category_id AND c.ward_id = r.ward_id
      WHERE r.id = ? AND r.ward_id = ? AND c.kind = 'request'`,
  )
    .bind(requestId, wardId)
    .first<{ category_id: string }>();
  return r?.category_id ?? null;
}

// May this person see a request category's requests (inbox, request pages, notifications)?
export async function canSeeRequestCategory(env: Env, wardId: string, categoryId: string, userId: string): Promise<boolean> {
  const cat = await category(env, wardId, categoryId);
  if (!cat || cat.kind !== 'request') return false;
  return (await isCategoryManager(env, wardId, categoryId, userId)) || (await isCategoryDelegate(env, wardId, categoryId, userId));
}

export async function canSeeRequest(env: Env, wardId: string, requestId: string, userId: string): Promise<boolean> {
  const cid = await requestCategoryId(env, wardId, requestId);
  if (!cid) return false;
  return canSeeRequestCategory(env, wardId, cid, userId);
}

// Status, private note, assignment, closing message: the same people who may see it.
export const canManageRequest = canSeeRequest;

async function emailsOf(env: Env, wardId: string, sql: string, binds: unknown[]): Promise<string[]> {
  const res = await env.DB.prepare(sql).bind(...binds).all<{ email: string }>();
  return [...new Set((res.results ?? []).map((r) => r.email.toLowerCase()))].sort();
}

export async function delegateEmails(env: Env, wardId: string, categoryId: string): Promise<string[]> {
  return emailsOf(
    env,
    wardId,
    `SELECT LOWER(u.email) AS email FROM service_delegates d
       JOIN users u ON u.id = d.user_id
       JOIN ward_memberships wm ON wm.user_id = d.user_id AND wm.ward_id = d.ward_id
      WHERE d.category_id = ? AND d.ward_id = ?`,
    [categoryId, wardId],
  );
}

export async function delegateUserIds(env: Env, wardId: string, categoryId: string): Promise<string[]> {
  const res = await env.DB.prepare(
    `SELECT d.user_id FROM service_delegates d JOIN ward_memberships wm ON wm.user_id = d.user_id AND wm.ward_id = d.ward_id
      WHERE d.category_id = ? AND d.ward_id = ?`,
  )
    .bind(categoryId, wardId)
    .all<{ user_id: string }>();
  return (res.results ?? []).map((r) => r.user_id);
}

async function owningSpaceOwnerEmails(env: Env, wardId: string, categoryId: string): Promise<string[]> {
  return emailsOf(
    env,
    wardId,
    `SELECT LOWER(u.email) AS email FROM service_category_spaces cs
       JOIN spaces s ON s.id = cs.space_id AND s.ward_id = cs.ward_id
       JOIN space_memberships sm ON sm.space_id = s.id AND sm.ward_id = s.ward_id AND sm.role = 'owner'
       JOIN users u ON u.id = sm.user_id
       JOIN ward_memberships wm ON wm.user_id = u.id AND wm.ward_id = cs.ward_id
      WHERE cs.category_id = ? AND cs.ward_id = ?`,
    [categoryId, wardId],
  );
}

// Who gets a category's messages: its delegates; if none, its owning spaces' owners.
// Lowercased, deduplicated, current ward members only.
export async function categoryMessageEmails(env: Env, wardId: string, categoryId: string): Promise<string[]> {
  if (!(await category(env, wardId, categoryId))) return [];
  const d = await delegateEmails(env, wardId, categoryId);
  if (d.length) return d;
  return owningSpaceOwnerEmails(env, wardId, categoryId);
}

// Who is told a new request came in: delegates; else owning spaces' owners; else superadmins.
export async function requestNotifyEmails(env: Env, wardId: string, categoryId: string): Promise<string[]> {
  const cat = await category(env, wardId, categoryId);
  if (!cat || cat.kind !== 'request') return [];
  const list = await categoryMessageEmails(env, wardId, categoryId);
  if (list.length) return list;
  return emailsOf(
    env,
    wardId,
    `SELECT LOWER(u.email) AS email FROM ward_memberships wm JOIN users u ON u.id = wm.user_id
      WHERE wm.ward_id = ? AND wm.role = 'superadmin'`,
    [wardId],
  );
}
