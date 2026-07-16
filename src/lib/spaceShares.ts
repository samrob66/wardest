import type { Env } from '../types';
import { newId } from './ids';

export interface Share {
  space_id: string;
  name: string;
  kind: string;
}

// Spaces that `spaceId` is shared WITH (their members get read-only view of spaceId's portal).
export async function listSharedWith(env: Env, spaceId: string): Promise<Share[]> {
  const res = await env.DB.prepare(
    `SELECT s.id AS space_id, s.name AS name, s.kind AS kind
       FROM space_shares ss JOIN spaces s ON s.id = ss.shared_with_space_id
      WHERE ss.space_id = ? ORDER BY s.name ASC`,
  )
    .bind(spaceId)
    .all<Share>();
  return res.results ?? [];
}

export async function addShare(
  env: Env,
  wardId: string,
  spaceId: string,
  sharedWithSpaceId: string,
): Promise<void> {
  if (spaceId === sharedWithSpaceId) return;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO space_shares (id, ward_id, space_id, shared_with_space_id) VALUES (?, ?, ?, ?)`,
  )
    .bind(newId('shr'), wardId, spaceId, sharedWithSpaceId)
    .run();
}

export async function removeShare(env: Env, spaceId: string, sharedWithSpaceId: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM space_shares WHERE space_id = ? AND shared_with_space_id = ?`)
    .bind(spaceId, sharedWithSpaceId)
    .run();
}
