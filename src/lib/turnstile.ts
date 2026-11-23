// Cloudflare Turnstile server-side check for the public volunteer forms (they send email to
// any address typed in, so bots must not be able to use them).
import type { Env } from '../types';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(env: Env, token: string, ip: string | null): Promise<boolean> {
  const secret = (env.TURNSTILE_SECRET_KEY ?? '').trim();
  if (!secret || !token || token.length > 4096) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
