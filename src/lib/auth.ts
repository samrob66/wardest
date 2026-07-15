import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv, Env, SessionUser } from '../types';
import { signToken, verifyToken } from './session';
import { getUserById } from './users';

const SESSION_COOKIE = 'wardest_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  uid: string;
  exp: number;
}

function isSecure(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

export async function setSession(c: Context<AppEnv>, userId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = await signToken({ uid: userId, exp }, c.env.SESSION_SECRET);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSession(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

async function getSessionUserId(c: Context<AppEnv>): Promise<string | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyToken<SessionPayload>(token, c.env.SESSION_SECRET);
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload.uid;
}

// Populates c.get('user') for every request (null when signed out). Loading from D1 confirms
// the account still exists.
export function loadUser(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const uid = await getSessionUserId(c);
    const user = uid ? await getUserById(c.env, uid) : null;
    c.set('user', user);
    await next();
  };
}

// Gate: redirects to Google sign-in (preserving returnTo) when signed out.
export function requireAuth(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!c.get('user')) {
      const returnTo = new URL(c.req.url).pathname + new URL(c.req.url).search;
      return c.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`, 302);
    }
    await next();
  };
}

export function isOperator(env: Env, user: SessionUser | null): boolean {
  if (!user) return false;
  const list = (env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(user.email.toLowerCase());
}
