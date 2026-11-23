// Runs before every test file, inside the Workers runtime.
// 1. Applies db/schema.sql to the test D1 once (idempotent: skipped when `wards` exists).
// 2. Replaces global fetch so no outbound request (Turnstile, Discord) reaches the network;
//    each one is recorded for sentFetches().
// 3. Replaces the EMAIL binding with a recording fake; each send is recorded for sentEmails().
// 4. After every test, waits for the work routes handed to waitUntil (settle()), so one test's
//    background sign-ups and emails never run on into the next test.
import { env } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { applySchema, installEmailFake, installFetchInterceptor, resetFetches, settle } from './helpers';

installFetchInterceptor();
installEmailFake();

beforeAll(async () => {
  const t = await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='wards'`).first();
  if (!t) await applySchema(env.DB);
});

beforeEach(() => resetFetches());
afterEach(() => settle());
