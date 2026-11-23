// The permission module for service categories, their delegates and members' requests (spec
// 2026-11-22 §3, §6). Sibling of volAccess.ts (posts), which builds on it. Every decision is
// ward-scoped and made from a per-request AccessSnapshot (loadAccess: one D1 batch). Fail
// closed: an unknown, wrong-ward or missing anything -> false.
// Loops (a page checking many categories or posts) build ONE snapshot with loadAccess and pass
// it to every check; never one snapshot per item, never one kept across requests.
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
//                            superadmins. Nobody creates in a request category. The same people
//                            keep managing EXISTING posts after the category is archived
//                            (mayManagePostsInCategory): archiving only stops new posts.
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

// ---------------------------------------------------------------- the per-request snapshot
//
// Everything a decision needs about one (ward, user), read in one D1 batch of five statements,
// however many categories or posts the ward has. Every decision is made from it in memory, by the
// same rules as the per-check queries it replaced (frozen in test/reference/serviceAccessRef.ts;
// test/accessEquivalence*.test.ts prove they agree). Build one per request; never keep one across
// requests or in module state (Workers isolates are shared between requests).
//
// Space membership comes in two strengths, as before: 'strict' (the membership row's own ward_id
// matches its space's) for this module's rules, 'loose' (the space is in the ward) for
// volAccess's view rules.

interface SnapSpace {
  kind: string;
  role: string | null; // this user's role in it; null when not a member
  strict: boolean; // the membership row is stamped with the space's ward
}

interface SnapCat extends CatInfo {
  owners: Array<{ id: string; kind: string }>; // its owning spaces in the same ward
}

export class AccessSnapshot {
  constructor(
    readonly wardId: string,
    readonly userId: string,
    readonly role: string | null, // ward role; null = not a member, and every decision is false
    private readonly spaces: ReadonlyMap<string, SnapSpace>, // every space of the ward
    private readonly cats: ReadonlyMap<string, SnapCat>, // every category of the ward
    private readonly delegates: ReadonlyMap<string, ReadonlySet<string>>, // category -> current delegates
    private readonly editorOf: ReadonlySet<string>, // spaces whose vol_editors list has this user
  ) {}

  // ---- facts (volAccess builds its post rules on these)

  hasCategory(categoryId: string): boolean {
    return this.cats.has(categoryId);
  }

  // The category's owning spaces in this ward (serviceCategories.categorySpaceIds, from memory).
  owningSpaceIds(categoryId: string): string[] {
    return (this.cats.get(categoryId)?.owners ?? []).map((o) => o.id);
  }

  spaceKind(spaceId: string): string | null {
    return this.spaces.get(spaceId)?.kind ?? null;
  }

  spaceRole(spaceId: string, mode: 'strict' | 'loose'): string | null {
    const sp = this.spaces.get(spaceId);
    if (!sp?.role || (mode === 'strict' && !sp.strict)) return null;
    return sp.role;
  }

  inSpaceOfKind(kind: 'bishopric' | 'ward_council', mode: 'strict' | 'loose'): boolean {
    for (const sp of this.spaces.values()) {
      if (sp.kind === kind && sp.role && (mode === 'loose' || sp.strict)) return true;
    }
    return false;
  }

  isVolEditorOf(spaceId: string): boolean {
    return this.editorOf.has(spaceId);
  }

  // ---- decisions (the async exports below answer through these)

  // Superadmin OR any member of the ward's Bishopric space.
  isBishopric(): boolean {
    if (!this.role) return false;
    if (this.role === 'superadmin') return true;
    return this.inSpaceOfKind('bishopric', 'strict');
  }

  private ownsAnOwningSpace(cat: SnapCat): boolean {
    return cat.owners.some((o) => this.spaceRole(o.id, 'strict') === 'owner');
  }

  private isVolEditorOfAnOwningOrg(cat: SnapCat): boolean {
    return cat.owners.some((o) => o.kind === 'org' && this.editorOf.has(o.id));
  }

  private managerOf(cat: SnapCat): boolean {
    if (this.role === 'superadmin') return true;
    if (this.ownsAnOwningSpace(cat)) return true;
    if (cat.confidential) return false;
    return this.inSpaceOfKind('bishopric', 'strict');
  }

  isCategoryManager(categoryId: string): boolean {
    if (!this.role) return false;
    const cat = this.cats.get(categoryId);
    if (!cat) return false;
    return this.managerOf(cat);
  }

  isCategoryDelegate(categoryId: string): boolean {
    if (!this.role) return false;
    if (!this.cats.has(categoryId)) return false;
    return this.delegates.get(categoryId)?.has(this.userId) ?? false;
  }

  canCreateInCategory(categoryId: string): boolean {
    const cat = this.cats.get(categoryId);
    if (!cat || cat.archived) return false;
    return this.mayManagePostsInCategory(categoryId);
  }

  mayManagePostsInCategory(categoryId: string): boolean {
    if (!this.role) return false;
    const cat = this.cats.get(categoryId);
    if (!cat || cat.kind !== 'opportunity') return false;
    if (this.isBishopric()) return true;
    if (this.isCategoryDelegate(categoryId)) return true;
    if (cat.council_may_create && this.inSpaceOfKind('ward_council', 'strict')) return true;
    if ((this.delegates.get(categoryId)?.size ?? 0) > 0) return false;
    if (this.managerOf(cat)) return true;
    return this.isVolEditorOfAnOwningOrg(cat);
  }

  canSeeRequestCategory(categoryId: string): boolean {
    const cat = this.cats.get(categoryId);
    if (!cat || cat.kind !== 'request') return false;
    return this.isCategoryManager(categoryId) || this.isCategoryDelegate(categoryId);
  }

  // Manages, coordinates or may create in any of these categories.
  hasServiceRoleIn(categoryIds: Iterable<string>): boolean {
    if (!this.role) return false;
    for (const id of categoryIds) {
      if (this.isCategoryManager(id) || this.isCategoryDelegate(id) || this.canCreateInCategory(id)) return true;
    }
    return false;
  }
}

type Row = Record<string, unknown>;

// The snapshot for (ward, user). Missing ids give an empty snapshot (not a member), with no query.
export async function loadAccess(env: Env, wardId: string, userId: string): Promise<AccessSnapshot> {
  if (!wardId || !userId) return new AccessSnapshot(wardId, userId, null, new Map(), new Map(), new Map(), new Set());
  const [role, spaces, cats, delegates, editors] = await env.DB.batch<Row>([
    env.DB.prepare(`SELECT role FROM ward_memberships WHERE ward_id = ? AND user_id = ?`).bind(wardId, userId),
    // Every space of the ward with this user's membership (UNIQUE(space_id, user_id): one row each).
    env.DB.prepare(
      `SELECT s.id, s.kind, sm.role AS role, sm.ward_id AS sm_ward
         FROM spaces s LEFT JOIN space_memberships sm ON sm.space_id = s.id AND sm.user_id = ?
        WHERE s.ward_id = ?`,
    ).bind(userId, wardId),
    // Every category of the ward (archived included), one row per owning space of the same ward.
    env.DB.prepare(
      `SELECT c.id, c.ward_id, c.kind, c.confidential, c.council_may_create, c.archived, s.id AS owner_id, s.kind AS owner_kind
         FROM service_categories c
         LEFT JOIN service_category_spaces cs ON cs.category_id = c.id AND cs.ward_id = c.ward_id
         LEFT JOIN spaces s ON s.id = cs.space_id AND s.ward_id = cs.ward_id
        WHERE c.ward_id = ?`,
    ).bind(wardId),
    // Delegates who still belong to the ward (a stale row counts for nothing).
    env.DB.prepare(
      `SELECT d.category_id, d.user_id FROM service_delegates d
         JOIN ward_memberships wm ON wm.user_id = d.user_id AND wm.ward_id = d.ward_id
        WHERE d.ward_id = ?`,
    ).bind(wardId),
    env.DB.prepare(`SELECT space_id FROM vol_editors WHERE ward_id = ? AND user_id = ?`).bind(wardId, userId),
  ]);
  const rows = (x: D1Result<Row> | undefined): Row[] => x?.results ?? [];

  const spaceMap = new Map<string, SnapSpace>();
  for (const r of rows(spaces)) {
    const memberRole = r.role == null ? null : String(r.role);
    spaceMap.set(String(r.id), { kind: String(r.kind), role: memberRole, strict: memberRole != null && r.sm_ward === wardId });
  }
  const catMap = new Map<string, SnapCat>();
  for (const r of rows(cats)) {
    const id = String(r.id);
    let cat = catMap.get(id);
    if (!cat) {
      cat = {
        id,
        ward_id: String(r.ward_id),
        kind: String(r.kind),
        confidential: Number(r.confidential),
        council_may_create: Number(r.council_may_create),
        archived: Number(r.archived),
        owners: [],
      };
      catMap.set(id, cat);
    }
    if (r.owner_id != null) cat.owners.push({ id: String(r.owner_id), kind: String(r.owner_kind) });
  }
  const delegateMap = new Map<string, Set<string>>();
  for (const r of rows(delegates)) {
    const cid = String(r.category_id);
    let set = delegateMap.get(cid);
    if (!set) delegateMap.set(cid, (set = new Set()));
    set.add(String(r.user_id));
  }
  const roleRow = rows(role)[0];
  return new AccessSnapshot(
    wardId,
    userId,
    roleRow?.role == null ? null : String(roleRow.role),
    spaceMap,
    catMap,
    delegateMap,
    new Set(rows(editors).map((r) => String(r.space_id))),
  );
}

// The caller's snapshot when it is for this ward and user, else a fresh one.
export async function accessFor(env: Env, wardId: string, userId: string, snap?: AccessSnapshot): Promise<AccessSnapshot> {
  return snap && snap.wardId === wardId && snap.userId === userId ? snap : loadAccess(env, wardId, userId);
}

// listCategories inserts any missing default first, so a list can hold categories newer than the
// snapshot: then a fresh snapshot decides them, as the per-check queries would have.
export async function coveringCategories(env: Env, s: AccessSnapshot, ids: string[]): Promise<AccessSnapshot> {
  return ids.every((id) => s.hasCategory(id)) ? s : loadAccess(env, s.wardId, s.userId);
}

// ---------------------------------------------------------------- the checks
//
// Each takes an optional snapshot (used when it is for the same ward and user; else one is
// loaded), so a single check costs one batch and a loop costs one batch in all.

// Superadmin OR any member of the ward's Bishopric space. (Re-exported by volAccess.ts.)
export async function isBishopric(env: Env, wardId: string, userId: string, snap?: AccessSnapshot): Promise<boolean> {
  return (await accessFor(env, wardId, userId, snap)).isBishopric();
}

export async function isCategoryManager(
  env: Env,
  wardId: string,
  categoryId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  return (await accessFor(env, wardId, userId, snap)).isCategoryManager(categoryId);
}

// Managers add categories, rename, archive, set audiences, manage delegates and warnings.
export const canManageCategory = isCategoryManager;

export async function isCategoryDelegate(
  env: Env,
  wardId: string,
  categoryId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  return (await accessFor(env, wardId, userId, snap)).isCategoryDelegate(categoryId);
}

// May create NEW posts in the category: an opportunity category that isn't archived, and the
// person may manage its posts (below).
export async function canCreateInCategory(
  env: Env,
  wardId: string,
  categoryId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  return (await accessFor(env, wardId, userId, snap)).canCreateInCategory(categoryId);
}

// The create rule without the archived check: who may edit (and approve on) EXISTING posts in
// the category. Archiving a category only stops new posts; its posts stay manageable.
export async function mayManagePostsInCategory(
  env: Env,
  wardId: string,
  categoryId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  return (await accessFor(env, wardId, userId, snap)).mayManagePostsInCategory(categoryId);
}

// Opportunity categories the user may create in (for the picker and the "Create" buttons).
export async function categoriesUserMayCreateIn(
  env: Env,
  wardId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<CategoryRow[]> {
  let s = await accessFor(env, wardId, userId, snap);
  if (!s.role) return [];
  const list = await listCategories(env, wardId, { kind: 'opportunity' });
  s = await coveringCategories(env, s, list.map((c) => c.id));
  return list.filter((c) => s.canCreateInCategory(c.id));
}

async function category(env: Env, wardId: string, categoryId: string): Promise<CatInfo | null> {
  if (!wardId || !categoryId) return null;
  return env.DB.prepare(
    `SELECT id, ward_id, kind, confidential, council_may_create, archived FROM service_categories WHERE id = ? AND ward_id = ?`,
  )
    .bind(categoryId, wardId)
    .first<CatInfo>();
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
export async function canSeeRequestCategory(
  env: Env,
  wardId: string,
  categoryId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  return (await accessFor(env, wardId, userId, snap)).canSeeRequestCategory(categoryId);
}

export async function canSeeRequest(
  env: Env,
  wardId: string,
  requestId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  const cid = await requestCategoryId(env, wardId, requestId);
  if (!cid) return false;
  return canSeeRequestCategory(env, wardId, cid, userId, snap);
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

// Shows the ward page's "Service" link: manages, coordinates or may create in a category.
export async function hasServiceRole(env: Env, wardId: string, userId: string, snap?: AccessSnapshot): Promise<boolean> {
  let s = await accessFor(env, wardId, userId, snap);
  if (!s.role) return false;
  const ids = (await listCategories(env, wardId, { includeArchived: true })).map((c) => c.id);
  s = await coveringCategories(env, s, ids);
  return s.hasServiceRoleIn(ids);
}
