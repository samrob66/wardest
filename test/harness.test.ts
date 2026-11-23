// The test harness itself: work a route hands to waitUntil must be awaitable, and must never
// run on into the next test (where it would land in that test's sentEmails()).
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { sentEmails, settle } from './helpers';
import { fixture, futureDate } from './volFixtures';

async function publicSignup(publicId: string, roleId: string, email: string) {
  const res = await SELF.fetch(`http://localhost/v/${publicId}/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '192.0.2.10' },
    body: new URLSearchParams({ role_id: roleId, name: 'Harness Person', email, 'cf-turnstile-response': 'ok' }).toString(),
  });
  await res.text();
}

describe('background (waitUntil) work', () => {
  it('settle() waits for the sign-up the route finishes after answering', async () => {
    const fx = await fixture({ date: futureDate() });
    await publicSignup(fx.publicId, fx.bigRoleId, 'harness-one@example.test');
    await settle();
    expect(sentEmails().map((e) => e.to)).toEqual(['harness-one@example.test']);
  });

  it('a test that leaves background work behind...', async () => {
    const fx = await fixture({ date: futureDate() });
    await publicSignup(fx.publicId, fx.bigRoleId, 'harness-left-behind@example.test');
    // No settle(): the sign-up and its email are still running when this test ends.
  });

  it('...does not leak it into the next test', async () => {
    await settle();
    expect(sentEmails()).toEqual([]);
  });
});
