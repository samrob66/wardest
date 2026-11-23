// The permission module for volunteer posts, sign-ups and volunteers (volunteer spec §5, service
// spec 2026-11-22 §3). Every "may this person see / edit X" decision for them goes through here;
// category, delegate and request decisions live in its sibling serviceAccess.ts. Fail closed: an
// unknown, wrong-ward or missing anything -> false. Ward superadmin = Bishopric (break-glass,
// as in visibility.ts). space_shares grant nothing here: the spec lists the audiences exactly.
// Decisions are made from serviceAccess's per-request AccessSnapshot; a page checking many posts
// loads them with loadPosts and decides each with canEditStored / canViewStored on ONE snapshot.
//
// A post belongs to one space (org, ward_council or bishopric) and one service category.
//   Bishopric (bishopric space member) or superadmin -> create/edit/delete/approve anything
//   Post creator                                      -> edit their post, approve on it
//   Whoever may create in the post's category         -> edit it, even once the category is archived
//                                                       (serviceAccess.mayManagePostsInCategory:
//                                                        its delegates; or, with no delegates, its
//                                                        managers + the owning orgs' vol_editors;
//                                                        ward council members when flagged)
//   The category's delegates                          -> see and manage every post of the category
//   The category's managers                           -> view (e.g. a president whose category
//                                                        now has delegates)
//   org post:          org space members, Ward Council -> view (read-only)
//   ward_council post: Ward Council members            -> view
//   bishopric post:    Bishopric members               -> (edit, above)
//   A post with no category yet (an upgraded DB before its backfill): the old org rule, org
//   owners + vol_editors edit.
import type { Env } from '../types';
import { accessFor, isBishopric, loadAccess, type AccessSnapshot } from './serviceAccess';

export { isBishopric };

export interface PostRef {
  id: string;
  ward_id: string;
  space_id: string;
  created_by_user_id: string | null;
}

// A post as stored: its space is an org, ward_council or bishopric space of the same ward, and
// its category (when set) a category of the same ward. Decisions never rest on a caller's ref.
export interface StoredPost extends PostRef {
  category_id: string | null;
  kind: string;
}

const STORED_POST_SQL = `SELECT p.id, p.ward_id, p.space_id, p.created_by_user_id, p.category_id, s.kind AS kind
       FROM vol_posts p JOIN spaces s ON s.id = p.space_id AND s.ward_id = p.ward_id
       LEFT JOIN service_categories c ON c.id = p.category_id AND c.ward_id = p.ward_id
      WHERE p.ward_id = ? AND s.kind IN ('org','ward_council','bishopric')
        AND (p.category_id IS NULL OR p.category_id = '' OR c.id IS NOT NULL)`;

// Re-read the post from D1 so a decision never rests on a caller-supplied ref.
async function storedPost(env: Env, post: PostRef): Promise<StoredPost | null> {
  if (!post?.id || !post.ward_id) return null;
  return env.DB.prepare(`${STORED_POST_SQL} AND p.id = ?`).bind(post.ward_id, post.id).first<StoredPost>();
}

// Many posts of one ward at once (for lists): id -> stored post. Ids that aren't a valid post of
// the ward are missing from the map (deny).
export async function loadPosts(env: Env, wardId: string, ids: string[]): Promise<Map<string, StoredPost>> {
  const out = new Map<string, StoredPost>();
  const want = [...new Set(ids.filter(Boolean))];
  if (!wardId || !want.length) return out;
  const CHUNK = 90; // D1 allows 100 bound parameters per statement
  const stmts: D1PreparedStatement[] = [];
  for (let i = 0; i < want.length; i += CHUNK) {
    const part = want.slice(i, i + CHUNK);
    stmts.push(env.DB.prepare(`${STORED_POST_SQL} AND p.id IN (${part.map(() => '?').join(',')})`).bind(wardId, ...part));
  }
  for (const res of await env.DB.batch<StoredPost>(stmts)) for (const p of res.results ?? []) out.set(p.id, p);
  return out;
}

// ---------------------------------------------------------------- decisions on a snapshot

// May create/edit/delete posts for this organization and approve volunteers on them.
export function canManageOrgIn(s: AccessSnapshot, spaceId: string): boolean {
  if (!s.role) return false;
  if (!spaceId || s.spaceKind(spaceId) !== 'org') return false;
  if (s.isBishopric()) return true;
  if (s.spaceRole(spaceId, 'loose') === 'owner') return true;
  return s.isVolEditorOf(spaceId);
}

// Who may change an org's "Who can manage volunteer posts" list: its owners and the Bishopric.
export function canManageEditorListIn(s: AccessSnapshot, spaceId: string): boolean {
  if (!s.role) return false;
  if (!spaceId || s.spaceKind(spaceId) !== 'org') return false;
  if (s.isBishopric()) return true;
  return s.spaceRole(spaceId, 'loose') === 'owner';
}

// The snapshot's user may edit this stored post (a snapshot of another ward: no).
export function canEditStored(s: AccessSnapshot, p: StoredPost): boolean {
  if (p.ward_id !== s.wardId) return false;
  if (!s.role) return false;
  if (p.created_by_user_id && p.created_by_user_id === s.userId) return true;
  if (s.isBishopric()) return true;
  if (!p.category_id) return p.kind === 'org' && canManageOrgIn(s, p.space_id);
  // Archive-agnostic: archiving a category stops new posts, not the management of these.
  if (s.mayManagePostsInCategory(p.category_id)) return true;
  return s.isCategoryDelegate(p.category_id);
}

export function canViewStored(s: AccessSnapshot, p: StoredPost): boolean {
  if (p.ward_id !== s.wardId) return false;
  if (!s.role) return false;
  if (canEditStored(s, p)) return true;
  if (p.category_id && s.isCategoryManager(p.category_id)) return true;
  if (p.kind === 'bishopric') return false; // Bishopric members could already edit it (above)
  if (s.inSpaceOfKind('ward_council', 'loose')) return true;
  if (p.kind === 'ward_council') return false;
  return s.spaceRole(p.space_id, 'loose') != null;
}

// ---------------------------------------------------------------- the async checks
//
// Same names, arguments and answers as before; each takes an optional snapshot (used when it is
// for the same ward and user, else one is loaded).

export async function canManageOrg(
  env: Env,
  wardId: string,
  spaceId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  return canManageOrgIn(await accessFor(env, wardId, userId, snap), spaceId);
}

export async function canEditPost(env: Env, userId: string, post: PostRef, snap?: AccessSnapshot): Promise<boolean> {
  const p = await storedPost(env, post);
  if (!p) return false;
  return canEditStored(await accessFor(env, p.ward_id, userId, snap), p);
}

export async function canViewPost(env: Env, userId: string, post: PostRef, snap?: AccessSnapshot): Promise<boolean> {
  const p = await storedPost(env, post);
  if (!p) return false;
  return canViewStored(await accessFor(env, p.ward_id, userId, snap), p);
}

// Bishopric, or anyone who can edit a post where this volunteer has a 'waiting' sign-up.
export async function canApproveVolunteer(
  env: Env,
  wardId: string,
  volunteerId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  const s = await accessFor(env, wardId, userId, snap);
  if (!s.role) return false;
  const v = await env.DB.prepare(`SELECT 1 AS ok FROM volunteers WHERE id = ? AND ward_id = ?`)
    .bind(volunteerId, wardId)
    .first();
  if (!v) return false;
  if (s.isBishopric()) return true;
  const posts = await env.DB.prepare(
    `SELECT DISTINCT p.id FROM vol_signups s JOIN vol_posts p ON p.id = s.post_id AND p.ward_id = s.ward_id
      WHERE s.ward_id = ? AND s.volunteer_id = ? AND s.status = 'waiting'`,
  )
    .bind(wardId, volunteerId)
    .all<{ id: string }>();
  const stored = await loadPosts(env, wardId, (posts.results ?? []).map((p) => p.id));
  for (const p of stored.values()) if (canEditStored(s, p)) return true;
  return false;
}

export async function canManageEditorList(
  env: Env,
  wardId: string,
  spaceId: string,
  userId: string,
  snap?: AccessSnapshot,
): Promise<boolean> {
  return canManageEditorListIn(await accessFor(env, wardId, userId, snap), spaceId);
}

// The ward-wide volunteers list (declined list, undo decline, revoke approval): Bishopric.
export async function canSeeWardVolunteers(env: Env, wardId: string, userId: string, snap?: AccessSnapshot): Promise<boolean> {
  return isBishopric(env, wardId, userId, snap);
}

