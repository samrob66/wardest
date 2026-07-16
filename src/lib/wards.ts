import type { Env } from '../types';
import { newId } from './ids';

export interface DefaultSpace {
  kind: 'public' | 'bishopric' | 'ward_council' | 'org';
  name: string;
  slug: string;
}

// The default space set every new ward gets (matches the M44 seed).
export const DEFAULT_SPACES: DefaultSpace[] = [
  { kind: 'public', name: 'Public', slug: 'public' },
  { kind: 'bishopric', name: 'Bishopric', slug: 'bishopric' },
  { kind: 'ward_council', name: 'Ward Council', slug: 'ward-council' },
  { kind: 'org', name: 'Elders Quorum', slug: 'elders-quorum' },
  { kind: 'org', name: 'Relief Society', slug: 'relief-society' },
  { kind: 'org', name: 'Young Women', slug: 'young-women' },
  { kind: 'org', name: 'Young Men', slug: 'young-men' },
  { kind: 'org', name: 'Primary', slug: 'primary' },
  { kind: 'org', name: 'Sunday School', slug: 'sunday-school' },
  { kind: 'org', name: 'Activities Committee', slug: 'activities-committee' },
  { kind: 'org', name: 'Ward Mission', slug: 'ward-mission' },
];

export const PREFIX_RE = /^[a-z0-9]{2,12}$/;

export interface WardRow {
  id: string;
  name: string;
  prefix: string;
  unit_number: string;
  status: string;
}

export async function getWardById(env: Env, id: string): Promise<WardRow | null> {
  return env.DB.prepare(`SELECT id, name, prefix, unit_number, status FROM wards WHERE id = ?`)
    .bind(id)
    .first<WardRow>();
}

export async function getWardByUnitNumber(env: Env, unit: string): Promise<WardRow | null> {
  return env.DB.prepare(`SELECT id, name, prefix, unit_number, status FROM wards WHERE unit_number = ?`)
    .bind(unit)
    .first<WardRow>();
}

export async function prefixTaken(env: Env, prefix: string): Promise<boolean> {
  const r = await env.DB.prepare(`SELECT 1 AS x FROM wards WHERE prefix = ?`).bind(prefix).first();
  return r != null;
}

export async function wardRole(env: Env, wardId: string, userId: string): Promise<string | null> {
  const r = await env.DB.prepare(
    `SELECT role FROM ward_memberships WHERE ward_id = ? AND user_id = ?`,
  )
    .bind(wardId, userId)
    .first<{ role: string }>();
  return r?.role ?? null;
}

// Atomically create a ward + its default spaces + the creator's superadmin membership + the
// public portal's go4.cc short link, then mirror the portal link into KV. Assumes prefix/unit
// availability already checked by the caller.
export async function createWard(
  env: Env,
  opts: { name: string; unitNumber: string; prefix: string; creatorUserId: string },
): Promise<string> {
  const wardId = newId('wrd');
  const publicSpaceId = newId('spc');
  const portalDest = `${env.APP_URL}/p/${opts.prefix}`;

  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO wards (id, name, unit_number, prefix, status, created_by_user_id)
       VALUES (?, ?, ?, ?, 'active', ?)`,
    ).bind(wardId, opts.name, opts.unitNumber, opts.prefix, opts.creatorUserId),
  ];

  DEFAULT_SPACES.forEach((s, i) => {
    const spaceId = s.kind === 'public' ? publicSpaceId : newId('spc');
    const isPublic = s.kind === 'public';
    stmts.push(
      env.DB.prepare(
        `INSERT INTO spaces (id, ward_id, kind, name, slug, portal_title, portal_published, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        spaceId,
        wardId,
        s.kind,
        s.name,
        s.slug,
        isPublic ? `${opts.name} Links` : null,
        isPublic ? 1 : 0,
        i,
      ),
    );
  });

  stmts.push(
    env.DB.prepare(
      `INSERT INTO ward_memberships (id, ward_id, user_id, role) VALUES (?, ?, ?, 'superadmin')`,
    ).bind(newId('wm'), wardId, opts.creatorUserId),
  );

  stmts.push(
    env.DB.prepare(
      `INSERT INTO short_links (id, ward_id, slug, destination_url, target_type, target_space_id, created_by_user_id)
       VALUES (?, ?, ?, ?, 'portal', ?, ?)`,
    ).bind(newId('sl'), wardId, opts.prefix, portalDest, publicSpaceId, opts.creatorUserId),
  );

  await env.DB.batch(stmts);
  await env.GO4_LINKS.put(opts.prefix, portalDest);
  return wardId;
}

// ---- workspace_requests ----

export interface WorkspaceRequest {
  id: string;
  kind: string;
  ward_name: string | null;
  unit_number: string;
  target_ward_id: string | null;
  requester_email: string;
  requester_name: string | null;
  requester_calling: string | null;
  status: string;
  note: string | null;
  created_at: string;
}

export async function createWorkspaceRequest(
  env: Env,
  r: {
    kind: 'create' | 'join';
    wardName: string | null;
    unitNumber: string;
    targetWardId: string | null;
    email: string;
    name: string | null;
    calling: string | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO workspace_requests
       (id, kind, ward_name, unit_number, target_ward_id, requester_email, requester_name, requester_calling)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId('wr'),
      r.kind,
      r.wardName,
      r.unitNumber,
      r.targetWardId,
      r.email.toLowerCase(),
      r.name,
      r.calling,
    )
    .run();
}

export async function getWorkspaceRequest(env: Env, id: string): Promise<WorkspaceRequest | null> {
  return env.DB.prepare(`SELECT * FROM workspace_requests WHERE id = ?`).bind(id).first<WorkspaceRequest>();
}

export async function listPendingCreateRequests(env: Env): Promise<WorkspaceRequest[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM workspace_requests WHERE kind = 'create' AND status = 'pending' ORDER BY created_at ASC`,
  ).all<WorkspaceRequest>();
  return res.results ?? [];
}

export async function listPendingJoinRequests(env: Env, wardId: string): Promise<WorkspaceRequest[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM workspace_requests
      WHERE kind = 'join' AND status = 'pending' AND target_ward_id = ?
      ORDER BY created_at ASC`,
  )
    .bind(wardId)
    .all<WorkspaceRequest>();
  return res.results ?? [];
}

export async function markRequest(
  env: Env,
  id: string,
  status: 'approved' | 'denied',
  reviewerId: string,
  createdWardId: string | null = null,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE workspace_requests
        SET status = ?, reviewed_by_user_id = ?, reviewed_at = datetime('now'), created_ward_id = ?
      WHERE id = ?`,
  )
    .bind(status, reviewerId, createdWardId, id)
    .run();
}

export interface SpaceRow {
  id: string;
  name: string;
  kind: string;
}

export interface SpaceFull {
  id: string;
  ward_id: string;
  kind: string;
  name: string;
}

export async function getSpaceById(env: Env, spaceId: string): Promise<SpaceFull | null> {
  return env.DB.prepare(`SELECT id, ward_id, kind, name FROM spaces WHERE id = ?`)
    .bind(spaceId)
    .first<SpaceFull>();
}

export interface SpaceMember {
  user_id: string;
  email: string;
  name: string | null;
}

export async function listSpaceMembers(env: Env, spaceId: string): Promise<SpaceMember[]> {
  const res = await env.DB.prepare(
    `SELECT sm.user_id AS user_id, u.email AS email, u.name AS name
       FROM space_memberships sm JOIN users u ON u.id = sm.user_id
      WHERE sm.space_id = ? ORDER BY u.email ASC`,
  )
    .bind(spaceId)
    .all<SpaceMember>();
  return res.results ?? [];
}

export async function spaceRole(env: Env, spaceId: string, userId: string): Promise<string | null> {
  const r = await env.DB.prepare(
    `SELECT role FROM space_memberships WHERE space_id = ? AND user_id = ?`,
  )
    .bind(spaceId, userId)
    .first<{ role: string }>();
  return r?.role ?? null;
}

export async function getWardSpaces(env: Env, wardId: string): Promise<SpaceRow[]> {
  const res = await env.DB.prepare(
    `SELECT id, name, kind FROM spaces WHERE ward_id = ? AND archived = 0 ORDER BY position ASC`,
  )
    .bind(wardId)
    .all<SpaceRow>();
  return res.results ?? [];
}

export async function addWardMembership(
  env: Env,
  wardId: string,
  userId: string,
  role: 'superadmin' | 'member',
): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO ward_memberships (id, ward_id, user_id, role) VALUES (?, ?, ?, ?)`,
  )
    .bind(newId('wm'), wardId, userId, role)
    .run();
}

export interface WardMember {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  calling_title: string | null;
}

export async function listWardMembers(env: Env, wardId: string): Promise<WardMember[]> {
  const res = await env.DB.prepare(
    `SELECT wm.user_id AS user_id, u.email AS email, u.name AS name, wm.role AS role,
            wm.calling_title AS calling_title
       FROM ward_memberships wm JOIN users u ON u.id = wm.user_id
      WHERE wm.ward_id = ?
      ORDER BY (wm.role = 'superadmin') DESC, u.email ASC`,
  )
    .bind(wardId)
    .all<WardMember>();
  return res.results ?? [];
}

export async function countSuperadmins(env: Env, wardId: string): Promise<number> {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ward_memberships WHERE ward_id = ? AND role = 'superadmin'`,
  )
    .bind(wardId)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

// Promote/demote a ward member. Refuses to remove the last superadmin. Returns an error
// string on refusal, or null on success.
export async function setWardMemberRole(
  env: Env,
  wardId: string,
  userId: string,
  role: 'superadmin' | 'member',
): Promise<string | null> {
  const current = await wardRole(env, wardId, userId);
  if (current == null) return 'That person is not a member of this ward.';
  if (current === role) return null;
  if (current === 'superadmin' && role === 'member' && (await countSuperadmins(env, wardId)) <= 1) {
    return 'A ward must always have at least one superadmin.';
  }
  await env.DB.prepare(`UPDATE ward_memberships SET role = ? WHERE ward_id = ? AND user_id = ?`)
    .bind(role, wardId, userId)
    .run();
  return null;
}
