// Runs before every test file, inside the Workers runtime.
// 1. Applies db/schema.sql to the test D1 once (idempotent: skipped when `wards` exists).
// 2. Replaces global fetch so no outbound request (Resend, Turnstile, Discord) reaches the
//    network; each one is recorded for sentFetches().
import { env } from 'cloudflare:test';
import { beforeAll, beforeEach } from 'vitest';
import { applySchema, installFetchInterceptor, resetFetches } from './helpers';

installFetchInterceptor();

beforeAll(async () => {
  const t = await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='wards'`).first();
  if (!t) await applySchema(env.DB);
});

beforeEach(() => resetFetches());
