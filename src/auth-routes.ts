import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv } from './types';
import { signToken, verifyToken, decodeJwtPayload } from './lib/session';
import { setSession, clearSession } from './lib/auth';
import { upsertGoogleUser } from './lib/users';
import { randomToken } from './lib/ids';

const OAUTH_COOKIE = 'wardest_oauth';
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

interface OAuthTx {
  state: string;
  nonce: string;
  returnTo: string;
  exp: number;
}

interface GoogleIdToken {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  nonce?: string;
  exp?: number;
}

// Only same-origin absolute paths — blocks open-redirect via returnTo.
function safeReturnTo(v: string | undefined | null): string {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : '/';
}

function isSecure(url: string): boolean {
  return new URL(url).protocol === 'https:';
}

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/login', async (c) => {
  const returnTo = safeReturnTo(c.req.query('returnTo'));
  const state = randomToken(16);
  const nonce = randomToken(16);
  const exp = Math.floor(Date.now() / 1000) + 600; // 10 min

  const tx = await signToken({ state, nonce, returnTo, exp } satisfies OAuthTx, c.env.SESSION_SECRET);
  setCookie(c, OAUTH_COOKIE, tx, {
    httpOnly: true,
    secure: isSecure(c.req.url),
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${c.env.APP_URL}/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    access_type: 'online',
    prompt: 'select_account',
  });
  return c.redirect(`${GOOGLE_AUTH}?${params.toString()}`, 302);
});

authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const txCookie = getCookie(c, OAUTH_COOKIE);
  deleteCookie(c, OAUTH_COOKIE, { path: '/' });

  if (!code || !state || !txCookie) return c.text('Sign-in failed: missing parameters.', 400);

  const tx = await verifyToken<OAuthTx>(txCookie, c.env.SESSION_SECRET);
  if (!tx || tx.exp < Math.floor(Date.now() / 1000)) return c.text('Sign-in expired. Try again.', 400);
  if (tx.state !== state) return c.text('Sign-in failed: state mismatch.', 400);

  // Exchange the authorization code for tokens (server-to-server).
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${c.env.APP_URL}/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return c.text('Sign-in failed: token exchange error.', 502);
  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) return c.text('Sign-in failed: no id_token.', 502);

  // The id_token came directly from Google over TLS, so decoding without local JWKS
  // verification is safe here; we still validate aud / iss / nonce / exp / email_verified.
  const claims = decodeJwtPayload<GoogleIdToken>(tokens.id_token);
  const now = Math.floor(Date.now() / 1000);
  if (
    !claims ||
    claims.aud !== c.env.GOOGLE_CLIENT_ID ||
    !(claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com') ||
    claims.nonce !== tx.nonce ||
    (claims.exp ?? 0) < now ||
    claims.email_verified === false ||
    !claims.email
  ) {
    return c.text('Sign-in failed: invalid token.', 400);
  }

  const userId = await upsertGoogleUser(c.env, {
    sub: claims.sub,
    email: claims.email,
    name: claims.name ?? null,
    picture: claims.picture ?? null,
  });
  await setSession(c, userId);
  return c.redirect(tx.returnTo, 302);
});

authRoutes.get('/logout', (c) => {
  clearSession(c);
  return c.redirect('/', 302);
});

// DEV ONLY — gated by env.DEV_LOGIN === '1'. 404s in production (flag never set there).
// Lets us exercise the whole app without real Google credentials.
authRoutes.get('/dev-login', async (c) => {
  if (c.env.DEV_LOGIN !== '1') return c.notFound();
  const email = c.req.query('email');
  if (!email) return c.text('dev-login: ?email= required', 400);
  const name = c.req.query('name') ?? email.split('@')[0] ?? null;
  const userId = await upsertGoogleUser(c.env, { sub: `dev:${email.toLowerCase()}`, email, name });
  await setSession(c, userId);
  return c.redirect(safeReturnTo(c.req.query('returnTo')), 302);
});

export default authRoutes;
