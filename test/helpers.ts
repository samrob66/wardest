import { env as testEnv } from 'cloudflare:test';
import schemaSql from '../db/schema.sql?raw';
import type { Env } from '../src/types';
import { createWard } from '../src/lib/wards';
import { newId, randomToken } from '../src/lib/ids';
import { signToken } from '../src/lib/session';

// ---------------------------------------------------------------- schema

export function schemaStatements(sql: string): string[] {
  return sql
    .split(/\r?\n/)
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function applySchema(db: D1Database): Promise<void> {
  await db.batch(schemaStatements(schemaSql).map((s) => db.prepare(s)));
}

// ---------------------------------------------------------------- outbound fetch

export interface SentFetch {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

type Responder = (f: SentFetch) => Response | undefined | Promise<Response | undefined>;

const sent: SentFetch[] = [];
let override: Responder | null = null;

export function sentFetches(): SentFetch[] {
  return sent.slice();
}

export function resetFetches(): void {
  sent.length = 0;
  override = null;
}

// Answer outbound requests differently for the rest of this test (cleared by resetFetches).
// Return undefined from the responder to fall back to the default answer.
export function mockFetch(fn: Responder): void {
  override = fn;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

function defaultResponse(f: SentFetch): Response {
  const u = new URL(f.url);
  if (u.hostname === 'api.resend.com') return jsonResponse({ id: 'email_' + sent.length });
  if (u.hostname === 'challenges.cloudflare.com') {
    const b = f.body as Record<string, string> | null;
    return jsonResponse({ success: !!b && b.response !== 'fail' });
  }
  if (u.hostname === 'discord.com') {
    if (u.pathname.endsWith('/users/@me/channels')) return jsonResponse({ id: 'dm_channel_1' });
    if (/\/channels\/[^/]+\/messages$/.test(u.pathname)) return jsonResponse({ id: 'msg_1' });
    if (u.pathname.endsWith('/oauth2/token')) return jsonResponse({ access_token: 'tok', token_type: 'Bearer' });
    if (u.pathname.endsWith('/users/@me')) return jsonResponse({ id: '111222333444555666', username: 'tester' });
  }
  return jsonResponse({ error: 'unmocked' }, 500);
}

function parseBodyText(text: string, ct: string): unknown {
  if (!text) return null;
  if (ct.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function installFetchInterceptor(): void {
  const g = globalThis as unknown as { fetch: typeof fetch; __volFetchInstalled?: boolean };
  if (g.__volFetchInstalled) return;
  g.__volFetchInstalled = true;
  g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input as RequestInfo, init);
    let body: unknown;
    if (init?.body instanceof FormData) {
      body = Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, String(v)]));
    } else {
      body = parseBodyText(await req.clone().text(), req.headers.get('content-type') ?? '');
    }
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => (headers[k] = v));
    const f: SentFetch = { url: req.url, method: req.method, headers, body };
    sent.push(f);
    const o = override ? await override(f) : undefined;
    return o ?? defaultResponse(f);
  }) as typeof fetch;
}

// ---------------------------------------------------------------- fixtures

export const env = testEnv as unknown as Env;

function tag(): string {
  return randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, 'x');
}

export async function ensureUser(e: Env, email: string, name?: string): Promise<string> {
  const lower = email.toLowerCase();
  const existing = await e.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(lower).first<{ id: string }>();
  if (existing) return existing.id;
  const id = newId('usr');
  await e.DB.prepare(`INSERT INTO users (id, google_sub, email, name) VALUES (?, ?, ?, ?)`)
    .bind(id, 'test:' + lower, lower, name ?? lower.split('@')[0] ?? null)
    .run();
  return id;
}

export async function makeWard(
  e: Env,
  o: { prefix?: string; timezone?: string; name?: string } = {},
): Promise<{ wardId: string; prefix: string; founderId: string; spaces: Record<string, string> }> {
  const t = tag();
  const prefix = o.prefix ?? ('t' + t).slice(0, 12);
  const founderId = await ensureUser(e, `founder-${t}@example.test`, 'Founder');
  const wardId = await createWard(e, {
    name: o.name ?? `Test Ward ${t}`,
    unitNumber: `u-${t}-${Date.now()}`,
    prefix,
    creatorUserId: founderId,
  });
  if (o.timezone) {
    await e.DB.prepare(`UPDATE wards SET timezone = ? WHERE id = ?`).bind(o.timezone, wardId).run();
  }
  const rows = await e.DB.prepare(`SELECT id, slug FROM spaces WHERE ward_id = ?`)
    .bind(wardId)
    .all<{ id: string; slug: string }>();
  const spaces: Record<string, string> = {};
  for (const r of rows.results ?? []) spaces[r.slug] = r.id;
  return { wardId, prefix, founderId, spaces };
}

export async function makeLeader(
  e: Env,
  wardId: string,
  o: {
    email: string;
    name?: string;
    wardRole?: 'superadmin' | 'member';
    spaces?: Array<[slugOrId: string, role: 'owner' | 'member']>;
  },
): Promise<string> {
  const userId = await ensureUser(e, o.email, o.name);
  await e.DB.prepare(
    `INSERT INTO ward_memberships (id, ward_id, user_id, role) VALUES (?, ?, ?, ?)
     ON CONFLICT(ward_id, user_id) DO UPDATE SET role = excluded.role`,
  )
    .bind(newId('wm'), wardId, userId, o.wardRole ?? 'member')
    .run();
  for (const [slugOrId, role] of o.spaces ?? []) {
    const sp = await e.DB.prepare(`SELECT id FROM spaces WHERE ward_id = ? AND (slug = ? OR id = ?)`)
      .bind(wardId, slugOrId, slugOrId)
      .first<{ id: string }>();
    if (!sp) throw new Error(`makeLeader: no space ${slugOrId}`);
    await e.DB.prepare(
      `INSERT INTO space_memberships (id, ward_id, space_id, user_id, role) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(space_id, user_id) DO UPDATE SET role = excluded.role`,
    )
      .bind(newId('sm'), wardId, sp.id, userId, role)
      .run();
  }
  return userId;
}

// A Cookie header value that signs the request in as `userId` (leader Google session).
export async function asUser(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = await signToken({ uid: userId, exp }, env.SESSION_SECRET);
  return `wardest_session=${token}`;
}

export function uniqueEmail(label: string): string {
  return `${label}-${tag()}@example.test`;
}

// A D1 wrapper that holds every run() of a statement containing `marker` until `n` of them are
// waiting, then lets them all go. Used to force a real race (e.g. two sign-ups that have both
// passed the "is it full?" check before either inserts).
export function barrierDb(db: D1Database, marker: string, n: number): D1Database {
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const wrap = (st: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(st, {
      get(target, prop) {
        if (prop === 'bind') return (...args: unknown[]) => wrap(target.bind(...args));
        if (prop === 'run') {
          return async () => {
            arrived++;
            if (arrived >= n) release();
            await gate;
            return target.run();
          };
        }
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'prepare') {
        return (sql: string) => {
          const st = target.prepare(sql);
          return sql.includes(marker) ? wrap(st) : st;
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

// A D1 wrapper that runs `before()` once, just before the first run() of a statement containing
// `marker`. Used to slip a change in between a read and the write that depends on it.
export function hookDb(db: D1Database, marker: string, before: () => Promise<void>): D1Database {
  let done = false;
  const wrap = (st: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(st, {
      get(target, prop) {
        if (prop === 'bind') return (...args: unknown[]) => wrap(target.bind(...args));
        if (prop === 'run') {
          return async () => {
            if (!done) {
              done = true;
              await before();
            }
            return target.run();
          };
        }
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'prepare') {
        return (sql: string) => {
          const st = target.prepare(sql);
          return sql.includes(marker) ? wrap(st) : st;
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

// Polls until `check` returns truthy (or `ms` pass). For work a route hands to waitUntil, which
// SELF.fetch doesn't wait for.
export async function waitFor<T>(check: () => Promise<T> | T, ms = 4000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await check();
    if (v || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 15));
  }
}
