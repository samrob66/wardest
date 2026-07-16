import type { Env } from '../types';
import { newId } from './ids';

export interface PortalBlock {
  id: string;
  ward_id: string;
  space_id: string;
  title: string | null;
  body: string | null;
  position: number;
}

export async function listBlocks(env: Env, spaceId: string): Promise<PortalBlock[]> {
  const res = await env.DB.prepare(
    `SELECT id, ward_id, space_id, title, body, position
       FROM portal_blocks WHERE space_id = ? ORDER BY position ASC, created_at ASC`,
  )
    .bind(spaceId)
    .all<PortalBlock>();
  return res.results ?? [];
}

export async function getBlock(env: Env, id: string): Promise<PortalBlock | null> {
  return env.DB.prepare(`SELECT id, ward_id, space_id, title, body, position FROM portal_blocks WHERE id = ?`)
    .bind(id)
    .first<PortalBlock>();
}

export async function createBlock(
  env: Env,
  o: { wardId: string; spaceId: string; title: string | null; body: string | null },
): Promise<void> {
  const pos = await env.DB.prepare(
    `SELECT COALESCE(MAX(position), -1) + 1 AS p FROM portal_blocks WHERE space_id = ?`,
  )
    .bind(o.spaceId)
    .first<{ p: number }>();
  await env.DB.prepare(
    `INSERT INTO portal_blocks (id, ward_id, space_id, kind, title, body, position)
     VALUES (?, ?, ?, 'richtext', ?, ?, ?)`,
  )
    .bind(newId('blk'), o.wardId, o.spaceId, o.title, o.body, pos?.p ?? 0)
    .run();
}

export async function updateBlock(
  env: Env,
  id: string,
  title: string | null,
  body: string | null,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE portal_blocks SET title = ?, body = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(title, body, id)
    .run();
}

export async function deleteBlock(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM portal_blocks WHERE id = ?`).bind(id).run();
}

// Swap this block's position with its neighbour in the given direction.
export async function moveBlock(env: Env, block: PortalBlock, dir: 'up' | 'down'): Promise<void> {
  const cmp = dir === 'up' ? '<' : '>';
  const order = dir === 'up' ? 'DESC' : 'ASC';
  const neighbour = await env.DB.prepare(
    `SELECT id, position FROM portal_blocks
      WHERE space_id = ? AND position ${cmp} ? ORDER BY position ${order} LIMIT 1`,
  )
    .bind(block.space_id, block.position)
    .first<{ id: string; position: number }>();
  if (!neighbour) return;
  await env.DB.batch([
    env.DB.prepare(`UPDATE portal_blocks SET position = ? WHERE id = ?`).bind(neighbour.position, block.id),
    env.DB.prepare(`UPDATE portal_blocks SET position = ? WHERE id = ?`).bind(block.position, neighbour.id),
  ]);
}
