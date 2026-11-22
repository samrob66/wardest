// "Who can manage volunteer posts" per organization (spec §5). The org space's owners are
// always on the list (and manage it); they can add any Wardest member of the ward, typically
// their counselors. Kept separate from space ownership, which also controls the portal.
// Route handlers check canManageEditorList (volAccess.ts) before calling add/remove.
import type { Env } from '../types';
import { newId } from './ids';

export interface EditorRow {
  user_id: string;
  email: string;
  name: string | null;
  owner: boolean;
}

// Owners first (always shown, not removable), then added editors. Each person once.
export async function listEditors(env: Env, wardId: string, spaceId: string): Promise<EditorRow[]> {
  const owners = await env.DB.prepare(
    `SELECT u.id AS user_id, u.email AS email, u.name AS name
       FROM space_memberships sm
       JOIN spaces s ON s.id = sm.space_id
       JOIN users u ON u.id = sm.user_id
       JOIN ward_memberships wm ON wm.user_id = u.id AND wm.ward_id = s.ward_id
      WHERE sm.space_id = ? AND s.ward_id = ? AND s.kind = 'org' AND sm.role = 'owner'
      ORDER BY u.email`,
  )
    .bind(spaceId, wardId)
    .all<{ user_id: string; email: string; name: string | null }>();
  const added = await env.DB.prepare(
    `SELECT u.id AS user_id, u.email AS email, u.name AS name
       FROM vol_editors ve
       JOIN users u ON u.id = ve.user_id
       JOIN ward_memberships wm ON wm.user_id = u.id AND wm.ward_id = ve.ward_id
      WHERE ve.space_id = ? AND ve.ward_id = ?
      ORDER BY u.email`,
  )
    .bind(spaceId, wardId)
    .all<{ user_id: string; email: string; name: string | null }>();
  const out: EditorRow[] = [];
  const seen = new Set<string>();
  for (const r of owners.results ?? []) {
    seen.add(r.user_id);
    out.push({ ...r, owner: true });
  }
  for (const r of added.results ?? []) {
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    out.push({ ...r, owner: false });
  }
  return out;
}

export async function listEditorUserIds(env: Env, wardId: string, spaceId: string): Promise<string[]> {
  return (await listEditors(env, wardId, spaceId)).map((e) => e.user_id);
}

// Adds a ward member to an org's list. Throws when the space isn't an org space of this ward
// or the person isn't a member of the ward.
export async function addEditor(env: Env, wardId: string, spaceId: string, userId: string, byUserId: string): Promise<void> {
  const sp = await env.DB.prepare(`SELECT 1 AS ok FROM spaces WHERE id = ? AND ward_id = ? AND kind = 'org'`)
    .bind(spaceId, wardId)
    .first();
  if (!sp) throw new Error('Not an organization of this ward.');
  const wm = await env.DB.prepare(`SELECT 1 AS ok FROM ward_memberships WHERE ward_id = ? AND user_id = ?`)
    .bind(wardId, userId)
    .first();
  if (!wm) throw new Error('That person is not a member of this ward.');
  await env.DB.prepare(
    `INSERT OR IGNORE INTO vol_editors (id, ward_id, space_id, user_id, added_by_user_id) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(newId('ved'), wardId, spaceId, userId, byUserId)
    .run();
}

export async function removeEditor(env: Env, wardId: string, spaceId: string, userId: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM vol_editors WHERE ward_id = ? AND space_id = ? AND user_id = ?`)
    .bind(wardId, spaceId, userId)
    .run();
}
