// The single permission module for volunteer sign-ups (spec §5). Every "may this person see /
// edit X" decision for posts, sign-ups and volunteers goes through here. Fail closed: an
// unknown, wrong-ward or missing anything -> false. Ward superadmin = Bishopric (break-glass,
// as in visibility.ts). space_shares grant nothing here: the spec lists the audiences exactly.
//
//   Bishopric (bishopric space member) or superadmin  -> create/edit/delete/approve anything
//   Org space owners + that org's vol_editors          -> create/edit/delete that org's posts, approve
//   Post creator                                       -> edit their post, approve on it
//   Other members of the org space                     -> view that org's posts (read-only)
//   Ward Council space members                         -> view every post (read-only)
import type { Env } from '../types';

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

// Re-read the post from D1 so a decision never rests on a caller-supplied ref.
async function storedPost(env: Env, post: PostRef): Promise<PostRef | null> {
  if (!post?.id || !post.ward_id) return null;
  const p = await env.DB.prepare(
    `SELECT id, ward_id, space_id, created_by_user_id FROM vol_posts WHERE id = ? AND ward_id = ?`,
  )
    .bind(post.id, post.ward_id)
    .first<PostRef>();
  if (!p) return null;
  if (!(await isOrgSpaceOf(env, p.ward_id, p.space_id))) return null;
  return p;
}

// Superadmin OR any member of the ward's Bishopric space.
export async function isBishopric(env: Env, wardId: string, userId: string): Promise<boolean> {
  const role = await wardRoleOf(env, wardId, userId);
  if (!role) return false;
  if (role === 'superadmin') return true;
  return inWardSpaceOfKind(env, wardId, 'bishopric', userId);
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
  return canManageOrg(env, p.ward_id, p.space_id, userId);
}

export async function canViewPost(env: Env, userId: string, post: PostRef): Promise<boolean> {
  const p = await storedPost(env, post);
  if (!p) return false;
  if (!(await wardRoleOf(env, p.ward_id, userId))) return false;
  if (await canEditPost(env, userId, p)) return true;
  if (await inWardSpaceOfKind(env, p.ward_id, 'ward_council', userId)) return true;
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
