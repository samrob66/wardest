import { env as testEnv } from 'cloudflare:test';
import { waitForGlobalWaitUntil } from 'cloudflare:test-internal';
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
  sentMail.length = 0;
  emailOverride = null;
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
  if (u.hostname === 'challenges.cloudflare.com') {
    const b = f.body as Record<string, string> | null;
    return jsonResponse({ success: !!b && b.response !== 'fail' });
  }
  if (u.hostname === 'discord.com') {
    if (/^\/api\/webhooks\//.test(u.pathname)) return new Response(null, { status: 204 });
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

// ---------------------------------------------------------------- outbound email

// Exactly the object src/lib/mail.ts passed to EMAIL.send (one recipient, so `to` is a string).
export interface SentEmail {
  to: string;
  from: { email: string; name: string };
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
}

type EmailResponder = (e: SentEmail) => void | Promise<void>;

const sentMail: SentEmail[] = [];
let emailOverride: EmailResponder | null = null;

export function sentEmails(): SentEmail[] {
  return sentMail.slice();
}

// Run `fn` on every send for the rest of this test (cleared by resetFetches). Throw from it to
// simulate a binding error, e.g. Object.assign(new Error('x'), { code: 'E_RATE_LIMIT_EXCEEDED' }).
// A send that throws is still recorded (it was attempted).
export function mockEmail(fn: EmailResponder): void {
  emailOverride = fn;
}

const fakeEmail = {
  async send(message: unknown) {
    const e = message as SentEmail;
    sentMail.push(e);
    if (emailOverride) await emailOverride(e);
    return { messageId: `msg_${sentMail.length}` };
  },
} as SendEmail;

// Swaps the EMAIL binding (the local Email Service simulator) for the recording fake, on the
// env the tests and the worker under SELF both read.
export function installEmailFake(): void {
  (testEnv as unknown as { EMAIL: SendEmail }).EMAIL = fakeEmail;
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
  return `wardforward_session=${token}`;
}

export function uniqueEmail(label: string): string {
  return `${label}-${tag()}@example.test`;
}

// A D1 wrapper that holds every run() or batch() involving a statement containing `marker`
// until `n` of them are waiting, then lets them all go. Used to force a real race (e.g. two
// sign-ups that have both passed the "is it full?" check before either inserts).
export function barrierDb(db: D1Database, marker: string, n: number): D1Database {
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const wait = async () => {
    arrived++;
    if (arrived >= n) release();
    await gate;
  };
  const marked = new WeakSet<object>();
  // bind() hands back the real bound statement (batch needs real ones), remembered as marked.
  const track = (st: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(st, {
      get(target, prop) {
        if (prop === 'bind') {
          return (...args: unknown[]) => {
            const bound = target.bind(...args);
            marked.add(bound);
            const run = bound.run.bind(bound);
            (bound as { run: () => Promise<D1Result> }).run = async () => (await wait(), run());
            return bound;
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
          return sql.includes(marker) ? track(st) : st;
        };
      }
      if (prop === 'batch') {
        return async (stmts: D1PreparedStatement[]) => {
          if (stmts.some((x) => marked.has(x))) await wait();
          return target.batch(stmts);
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

// A D1 wrapper that runs `before()` once, just before the first batch() after a statement
// containing `marker` is prepared. Used to slip a change in between a read and the batched
// write that depends on it.
export function hookDb(db: D1Database, marker: string, before: () => Promise<void>): D1Database {
  let armed = false;
  let done = false;
  const fire = async () => {
    if (armed && !done) {
      done = true;
      await before();
    }
  };
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'prepare') {
        return (sql: string) => {
          if (sql.includes(marker)) armed = true;
          return target.prepare(sql);
        };
      }
      if (prop === 'batch') {
        return async (stmts: D1PreparedStatement[]) => {
          await fire();
          return target.batch(stmts);
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

// Waits until every promise the worker under SELF handed to ctx.waitUntil has settled (the public
// sign-up finished after the response, sendLater deliveries, the invitation kick), including
// any waitUntil work those start. SELF.fetch resolves as soon as the response is ready, and the
// test pool never waits for that work on its own: @cloudflare/vitest-plugin (pinned 1.5.1)
// records each promise in a global list but nothing drains it. So a test that needs the result
// calls settle() instead of polling against a deadline, and test/setup.ts calls it after every
// test so no test's background work runs on into the next one. A rejected promise rethrows
// here. `cloudflare:test-internal` is the plugin's own module (`cloudflare:test` re-exports
// from it); if an upgrade drops this export, every test file fails to import, never silently.
export async function settle(): Promise<void> {
  await waitForGlobalWaitUntil();
}

// A D1 wrapper that runs hooks around the FIRST run()/first()/all() of a statement whose SQL
// contains `marker`: `before` (awaited) just before it executes, `after` right after. A hook can
// also make that execution fail (`fail: true`). For forcing one exact interleaving between two
// requests, or a failure at one exact step. (Not for statements that go to batch().)
export function interceptDb(
  db: D1Database,
  marker: string,
  hooks: { before?: () => Promise<void>; after?: () => void; fail?: boolean },
): D1Database {
  let done = false;
  const once = async <T>(exec: () => Promise<T>): Promise<T> => {
    if (done) return exec();
    done = true;
    if (hooks.before) await hooks.before();
    if (hooks.fail) throw new Error(`interceptDb: forced failure at "${marker}"`);
    try {
      return await exec();
    } finally {
      hooks.after?.();
    }
  };
  const wrap = (st: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(st, {
      get(target, prop) {
        if (prop === 'bind') return (...args: unknown[]) => wrap(target.bind(...args));
        if (prop === 'run') return () => once(() => target.run());
        if (prop === 'first') return (col?: string) => once(() => (col ? target.first(col) : target.first()));
        if (prop === 'all') return () => once(() => target.all());
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

// A promise you can resolve from outside.
export function gate(): { promise: Promise<void>; open: () => void } {
  let open!: () => void;
  const promise = new Promise<void>((r) => (open = r));
  return { promise, open };
}
