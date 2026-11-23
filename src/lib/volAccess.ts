// The permission module for volunteer posts, sign-ups and volunteers (volunteer spec §5, service
// spec 2026-11-22 §3). Every "may this person see / edit X" decision for them goes through here;
// category, delegate and request decisions live in its sibling serviceAccess.ts. Fail closed: an
// unknown, wrong-ward or missing anything -> false. Ward superadmin = Bishopric (break-glass,
// as in visibility.ts). space_shares grant nothing here: the spec lists the audiences exactly.
//
// A post belongs to one space (org, ward_council or bishopric) and one service category.
//   Bishopric (bishopric space member) or superadmin -> create/edit/delete/approve anything
//   Post creator                                      -> edit their post, approve on it
//   Whoever may create in the post's category         -> edit it (serviceAccess.canCreateInCategory:
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
import { canCreateInCategory, isBishopric, isCategoryDelegate, isCategoryManager } from './serviceAccess';

export { isBishopric };

export interface PostRef {
  id: string;
  ward_id: string;
  space_id: string;
  created_by_user_id: string | null;
}

async function wardRoleOf(env: Env, wardId: string, userId: string): Promise<string | null> {
  if (!wardId || !userId) return null;
  const r = await env.DB.prepare(`SELECT role FROM ward_memberships WHERE ward_id = ? AND user_id = ?`)
    .bind(wardId, userId)
    .first<{ role: string }>();
  return r?.role ?? null;
}

// Is `spaceId` an org space of `wardId`?
async function isOrgSpaceOf(env: Env, wardId: string, spaceId: string): Promise<boolean> {
  if (!spaceId) return false;
  const r = await env.DB.prepare(`SELECT 1 AS ok FROM spaces WHERE id = ? AND ward_id = ? AND kind = 'org'`)
    .bind(spaceId, wardId)
    .first();
  return r != null;
}

// Role in a space of this ward (null when not a member, or the space isn't in the ward).
async function spaceRoleIn(env: Env, wardId: string, spaceId: string, userId: string): Promise<string | null> {
  const r = await env.DB.prepare(
    `SELECT sm.role AS role FROM space_memberships sm JOIN spaces s ON s.id = sm.space_id
      WHERE sm.space_id = ? AND sm.user_id = ? AND s.ward_id = ?`,
  )
    .bind(spaceId, userId, wardId)
    .first<{ role: string }>();
  return r?.role ?? null;
}

async function inWardSpaceOfKind(env: Env, wardId: string, kind: 'bishopric' | 'ward_council', userId: string): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS ok FROM space_memberships sm JOIN spaces s ON s.id = sm.space_id
      WHERE s.ward_id = ? AND s.kind = ? AND sm.user_id = ? LIMIT 1`,
  )
    .bind(wardId, kind, userId)
    .first();
  return r != null;
}

interface StoredPost extends PostRef {
  category_id: string | null;
  kind: string;
}

// Re-read the post from D1 so a decision never rests on a caller-supplied ref. Its space must
// be an org, ward_council or bishopric space of the same ward, and its category (when set) a
// category of the same ward.
async function storedPost(env: Env, post: PostRef): Promise<StoredPost | null> {
  if (!post?.id || !post.ward_id) return null;
  const p = await env.DB.prepare(
    `SELECT p.id, p.ward_id, p.space_id, p.created_by_user_id, p.category_id, s.kind AS kind
       FROM vol_posts p JOIN spaces s ON s.id = p.space_id AND s.ward_id = p.ward_id
      WHERE p.id = ? AND p.ward_id = ? AND s.kind IN ('org','ward_council','bishopric')`,
  )
    .bind(post.id, post.ward_id)
    .first<StoredPost>();
  if (!p) return null;
  if (p.category_id) {
    const c = await env.DB.prepare(`SELECT 1 AS ok FROM service_categories WHERE id = ? AND ward_id = ?`)
      .bind(p.category_id, p.ward_id)
      .first();
    if (!c) return null;
  }
  return p;
}

// May create/edit/delete posts for this organization and approve volunteers on them.
export async function canManageOrg(env: Env, wardId: string, spaceId: string, userId: string): Promise<boolean> {
  if (!(await wardRoleOf(env, wardId, userId))) return false;
  if (!(await isOrgSpaceOf(env, wardId, spaceId))) return false;
  if (await isBishopric(env, wardId, userId)) return true;
  if ((await spaceRoleIn(env, wardId, spaceId, userId)) === 'owner') return true;
  const ed = await env.DB.prepare(
    `SELECT 1 AS ok FROM vol_editors WHERE ward_id = ? AND space_id = ? AND user_id = ?`,
  )
    .bind(wardId, spaceId, userId)
    .first();
  return ed != null;
}

export async function canEditPost(env: Env, userId: string, post: PostRef): Promise<boolean> {
  const p = await storedPost(env, post);
  if (!p) return false;
  if (!(await wardRoleOf(env, p.ward_id, userId))) return false;
  if (p.created_by_user_id && p.created_by_user_id === userId) return true;
  if (await isBishopric(env, p.ward_id, userId)) return true;
  if (!p.category_id) return p.kind === 'org' && canManageOrg(env, p.ward_id, p.space_id, userId);
  if (await canCreateInCategory(env, p.ward_id, p.category_id, userId)) return true;
  return isCategoryDelegate(env, p.ward_id, p.category_id, userId);
}

export async function canViewPost(env: Env, userId: string, post: PostRef): Promise<boolean> {
  const p = await storedPost(env, post);
  if (!p) return false;
  if (!(await wardRoleOf(env, p.ward_id, userId))) return false;
  if (await canEditPost(env, userId, p)) return true;
  if (p.category_id && (await isCategoryManager(env, p.ward_id, p.category_id, userId))) return true;
  if (p.kind === 'bishopric') return false; // Bishopric members could already edit it (above)
  if (await inWardSpaceOfKind(env, p.ward_id, 'ward_council', userId)) return true;
  if (p.kind === 'ward_council') return false;
  return (await spaceRoleIn(env, p.ward_id, p.space_id, userId)) != null;
}

// Bishopric, or anyone who can edit a post where this volunteer has a 'waiting' sign-up.
export async function canApproveVolunteer(env: Env, wardId: string, volunteerId: string, userId: string): Promise<boolean> {
  if (!(await wardRoleOf(env, wardId, userId))) return false;
  const v = await env.DB.prepare(`SELECT 1 AS ok FROM volunteers WHERE id = ? AND ward_id = ?`)
    .bind(volunteerId, wardId)
    .first();
  if (!v) return false;
  if (await isBishopric(env, wardId, userId)) return true;
  const posts = await env.DB.prepare(
    `SELECT DISTINCT p.id, p.ward_id, p.space_id, p.created_by_user_id
       FROM vol_signups s JOIN vol_posts p ON p.id = s.post_id AND p.ward_id = s.ward_id
      WHERE s.ward_id = ? AND s.volunteer_id = ? AND s.status = 'waiting'`,
  )
    .bind(wardId, volunteerId)
    .all<PostRef>();
  for (const p of posts.results ?? []) {
    if (await canEditPost(env, userId, p)) return true;
  }
  return false;
}

// Who may change an org's "Who can manage volunteer posts" list: its owners and the Bishopric.
export async function canManageEditorList(env: Env, wardId: string, spaceId: string, userId: string): Promise<boolean> {
  if (!(await wardRoleOf(env, wardId, userId))) return false;
  if (!(await isOrgSpaceOf(env, wardId, spaceId))) return false;
  if (await isBishopric(env, wardId, userId)) return true;
  return (await spaceRoleIn(env, wardId, spaceId, userId)) === 'owner';
}

// The ward-wide volunteers list (declined list, undo decline, revoke approval): Bishopric.
export async function canSeeWardVolunteers(env: Env, wardId: string, userId: string): Promise<boolean> {
  return isBishopric(env, wardId, userId);
}
