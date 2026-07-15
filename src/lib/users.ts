import type { Env, SessionUser } from '../types';
import { newId } from './ids';

export interface UserWard {
  id: string;
  name: string;
  prefix: string;
  role: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

// Upsert on the stable google_sub, refreshing email/name/avatar on every login.
// Returns the canonical user id (the existing one on conflict).
export async function upsertGoogleUser(env: Env, p: GoogleProfile): Promise<string> {
  const row = await env.DB.prepare(
    `INSERT INTO users (id, google_sub, email, name, avatar_url, last_login_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(google_sub) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       avatar_url = excluded.avatar_url,
       last_login_at = datetime('now')
     RETURNING id`,
  )
    .bind(newId('usr'), p.sub, p.email.toLowerCase(), p.name ?? null, p.picture ?? null)
    .first<{ id: string }>();
  if (!row) throw new Error('upsertGoogleUser: no id returned');
  return row.id;
}

export async function getUserById(env: Env, id: string): Promise<SessionUser | null> {
  return env.DB.prepare(`SELECT id, email, name FROM users WHERE id = ?`)
    .bind(id)
    .first<SessionUser>();
}

export async function getUserByEmail(env: Env, email: string): Promise<SessionUser | null> {
  return env.DB.prepare(`SELECT id, email, name FROM users WHERE email = ?`)
    .bind(email.toLowerCase())
    .first<SessionUser>();
}

export async function getUserWards(env: Env, userId: string): Promise<UserWard[]> {
  const res = await env.DB.prepare(
    `SELECT w.id AS id, w.name AS name, w.prefix AS prefix, wm.role AS role
       FROM ward_memberships wm
       JOIN wards w ON w.id = wm.ward_id
      WHERE wm.user_id = ?
      ORDER BY w.name ASC`,
  )
    .bind(userId)
    .all<UserWard>();
  return res.results ?? [];
}
