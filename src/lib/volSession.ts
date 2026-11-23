// Volunteer links and session. Volunteers have no Google account: their email is their key.
//  - Signed link tokens (stateless, HMAC with SESSION_SECRET) for emailed links:
//      'vacc' = open My sign-ups, 'vcan' = cancel one sign-up, 'vwd' = withdraw an over-limit offer,
//      'unsub' = stop a ward's service invitations (id = hash of the address).
//    Each carries its type, so a cancel token can never be used as an access token.
//  - The email-confirmation token is different: single use, stored hashed in vol_tokens.
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv, Env } from '../types';
import { signToken, verifyToken } from './session';

export type LinkTyp = 'vacc' | 'vcan' | 'vwd' | 'unsub';

interface LinkPayload {
  typ: LinkTyp;
  wid: string;
  id: string;
  exp: number;
}

// 'unsub' (id = the address's SHA-256) must keep working from old invitations: ~10 years.
const DEFAULT_DAYS: Record<LinkTyp, number> = { vacc: 30, vcan: 400, vwd: 400, unsub: 3650 };

export async function makeLinkToken(
  env: Env,
  p: { typ: LinkTyp; wardId: string; id: string; days?: number },
  now: Date = new Date(),
): Promise<string> {
  const days = p.days ?? DEFAULT_DAYS[p.typ];
  const exp = Math.floor(now.getTime() / 1000) + Math.round(days * 86_400);
  return signToken({ typ: p.typ, wid: p.wardId, id: p.id, exp } satisfies LinkPayload, env.SESSION_SECRET);
}

// Valid signature, the expected type, and not expired -> { wardId, id }; else null.
// (Cancel/withdraw routes also check the sign-up's date isn't over.)
export async function readLinkToken(
  env: Env,
  typ: LinkTyp,
  token: string,
  now: Date = new Date(),
): Promise<{ wardId: string; id: string } | null> {
  if (!token || token.length > 2048) return null;
  const p = await verifyToken<LinkPayload>(token, env.SESSION_SECRET);
  if (!p || p.typ !== typ || typeof p.wid !== 'string' || typeof p.id !== 'string') return null;
  if (typeof p.exp !== 'number' || p.exp < Math.floor(now.getTime() / 1000)) return null;
  return { wardId: p.wid, id: p.id };
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- volunteer session cookie
// `wardforward_vol` is separate from the leaders' `wardforward_session` and scoped to /vol, so it's
// never even sent to /w/* (and loadUser never reads it). It names one volunteer in one ward.

export const VOL_COOKIE = 'wardforward_vol';
const VOL_MAX_AGE = 14 * 86_400;

interface VolSessionPayload {
  typ: 'vsess';
  vid: string;
  wid: string;
  exp: number;
}

export interface VolunteerSessionRow {
  id: string;
  ward_id: string;
  email: string;
  name: string;
  approval: string;
  email_verified_at: string | null;
  discord_user_id: string | null;
}

export interface VolunteerSession {
  volunteer: VolunteerSessionRow;
  ward: { id: string; name: string; prefix: string; timezone: string };
}

export async function setVolunteerSession(c: Context<AppEnv>, volunteerId: string, wardId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + VOL_MAX_AGE;
  const token = await signToken({ typ: 'vsess', vid: volunteerId, wid: wardId, exp } satisfies VolSessionPayload, c.env.SESSION_SECRET);
  setCookie(c, VOL_COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/vol',
    maxAge: VOL_MAX_AGE,
  });
}

export function clearVolunteerSession(c: Context<AppEnv>): void {
  deleteCookie(c, VOL_COOKIE, { path: '/vol' });
}

// Re-reads the volunteer on every request: null unless the address is verified and the
// volunteer isn't declined (a revoked approval signs them out at once).
export async function getVolunteerSession(c: Context<AppEnv>): Promise<VolunteerSession | null> {
  const token = getCookie(c, VOL_COOKIE);
  if (!token) return null;
  const p = await verifyToken<VolSessionPayload>(token, c.env.SESSION_SECRET);
  if (!p || p.typ !== 'vsess' || typeof p.exp !== 'number' || p.exp < Math.floor(Date.now() / 1000)) return null;
  const row = await c.env.DB.prepare(
    `SELECT v.id, v.ward_id, v.email, v.name, v.approval, v.email_verified_at, v.discord_user_id,
            w.name AS ward_name, w.prefix AS prefix, w.timezone AS tz
       FROM volunteers v JOIN wards w ON w.id = v.ward_id
      WHERE v.id = ? AND v.ward_id = ? AND w.status = 'active'`,
  )
    .bind(p.vid, p.wid)
    .first<VolunteerSessionRow & { ward_name: string; prefix: string; tz: string }>();
  if (!row || !row.email_verified_at || row.approval === 'declined') return null;
  const { ward_name, prefix, tz, ...volunteer } = row;
  return { volunteer, ward: { id: row.ward_id, name: ward_name, prefix, timezone: tz } };
}
