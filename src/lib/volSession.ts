// Volunteer links and session. Volunteers have no Google account: their email is their key.
//  - Signed link tokens (stateless, HMAC with SESSION_SECRET) for emailed links:
//      'vacc' = open My sign-ups, 'vcan' = cancel one sign-up, 'vwd' = withdraw an over-limit offer.
//    Each carries its type, so a cancel token can never be used as an access token.
//  - The email-confirmation token is different: single use, stored hashed in vol_tokens.
import type { Env } from '../types';
import { signToken, verifyToken } from './session';

export type LinkTyp = 'vacc' | 'vcan' | 'vwd';

interface LinkPayload {
  typ: LinkTyp;
  wid: string;
  id: string;
  exp: number;
}

const DEFAULT_DAYS: Record<LinkTyp, number> = { vacc: 30, vcan: 400, vwd: 400 };

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
