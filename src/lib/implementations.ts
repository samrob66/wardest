import type { Env } from '../types';
import { newId } from './ids';

export interface Implementation {
  id: string;
  ward_id: string;
  space_id: string | null;
  solution_id: string;
  visibility: string;
  status: string;
  owner_user_id: string | null;
  notes: string | null;
}

export const IMPL_STATUSES = ['not_started', 'in_progress', 'implemented'] as const;
export type ImplStatus = (typeof IMPL_STATUSES)[number];

// Ward-level implementation of a solution (space_id NULL). Used for ward_singleton solutions.
export async function getWardImplementation(
  env: Env,
  wardId: string,
  solutionId: string,
): Promise<Implementation | null> {
  return env.DB.prepare(
    `SELECT * FROM implementations WHERE ward_id = ? AND solution_id = ? AND space_id IS NULL`,
  )
    .bind(wardId, solutionId)
    .first<Implementation>();
}

// Org-level implementation (space_id set). Used for per_space solutions.
export async function getSpaceImplementation(
  env: Env,
  solutionId: string,
  spaceId: string,
): Promise<Implementation | null> {
  return env.DB.prepare(
    `SELECT * FROM implementations WHERE solution_id = ? AND space_id = ?`,
  )
    .bind(solutionId, spaceId)
    .first<Implementation>();
}

export async function getImplementationById(env: Env, id: string): Promise<Implementation | null> {
  return env.DB.prepare(`SELECT * FROM implementations WHERE id = ?`).bind(id).first<Implementation>();
}

// Create or update an implementation's status/owner/notes. spaceId NULL => ward-level
// (visibility 'ward'); spaceId set => org-level (visibility 'restricted', default fail-closed).
export async function upsertImplementation(
  env: Env,
  o: {
    wardId: string;
    solutionId: string;
    spaceId: string | null;
    status: ImplStatus;
    ownerUserId: string;
    notes: string | null;
  },
): Promise<string> {
  const existing = o.spaceId
    ? await getSpaceImplementation(env, o.solutionId, o.spaceId)
    : await getWardImplementation(env, o.wardId, o.solutionId);

  const implementedAt = o.status === 'implemented' ? "datetime('now')" : 'NULL';

  if (existing) {
    await env.DB.prepare(
      `UPDATE implementations SET status = ?, owner_user_id = ?, notes = ?,
         implemented_at = CASE WHEN ? = 'implemented' AND implemented_at IS NULL THEN datetime('now')
                               WHEN ? = 'implemented' THEN implemented_at ELSE NULL END,
         updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(o.status, o.ownerUserId, o.notes, o.status, o.status, existing.id)
      .run();
    return existing.id;
  }

  const id = newId('impl');
  const visibility = o.spaceId ? 'restricted' : 'ward';
  await env.DB.prepare(
    `INSERT INTO implementations
       (id, ward_id, space_id, solution_id, visibility, status, owner_user_id, notes, implemented_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${implementedAt})`,
  )
    .bind(id, o.wardId, o.spaceId, o.solutionId, visibility, o.status, o.ownerUserId, o.notes)
    .run();
  return id;
}

export async function setImplementationVisibility(
  env: Env,
  implId: string,
  visibility: 'ward' | 'restricted',
): Promise<void> {
  await env.DB.prepare(
    `UPDATE implementations SET visibility = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(visibility, implId)
    .run();
}

export async function listImplGrants(env: Env, implId: string): Promise<string[]> {
  const res = await env.DB.prepare(
    `SELECT space_id FROM implementation_visibility WHERE implementation_id = ?`,
  )
    .bind(implId)
    .all<{ space_id: string }>();
  return (res.results ?? []).map((r) => r.space_id);
}

// Replace the full set of grant spaces for an implementation.
export async function setImplGrants(
  env: Env,
  implId: string,
  wardId: string,
  spaceIds: string[],
): Promise<void> {
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(`DELETE FROM implementation_visibility WHERE implementation_id = ?`).bind(implId),
  ];
  for (const sid of spaceIds) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO implementation_visibility (id, ward_id, implementation_id, space_id) VALUES (?, ?, ?, ?)`,
      ).bind(newId('iv'), wardId, implId, sid),
    );
  }
  await env.DB.batch(stmts);
}

// Map of solutionId -> ward-level implementation, for the catalog status column.
export async function wardImplementationMap(
  env: Env,
  wardId: string,
): Promise<Map<string, Implementation>> {
  const res = await env.DB.prepare(
    `SELECT * FROM implementations WHERE ward_id = ? AND space_id IS NULL`,
  )
    .bind(wardId)
    .all<Implementation>();
  const map = new Map<string, Implementation>();
  for (const r of res.results ?? []) map.set(r.solution_id, r);
  return map;
}
