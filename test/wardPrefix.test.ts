import { describe, it, expect } from 'vitest';
import { env, ensureUser, uniqueEmail, asUser } from './helpers';
import { appSite } from '../src/app';
import { createWorkspaceRequest, getWardByUnitNumber, RESERVED_PREFIXES } from '../src/lib/wards';

describe('reserved ward prefixes', () => {
  it('refuses the words used as /vol/ path segments, so /vol/<prefix>/me always works', async () => {
    expect([...RESERVED_PREFIXES].sort()).toEqual(['access', 'cancel', 'discord', 'verify', 'withdraw']);
    const opEmail = uniqueEmail('operator');
    const op = await ensureUser(env, opEmail);
    const requester = uniqueEmail('requester');
    await ensureUser(env, requester);
    const unit = 'unit-' + Date.now();
    await createWorkspaceRequest(env, { kind: 'create', wardName: 'Verify Ward', unitNumber: unit, targetWardId: null, email: requester, name: 'R', calling: null });
    const req = await env.DB.prepare(`SELECT id FROM workspace_requests WHERE unit_number = ?`).bind(unit).first<{ id: string }>();
    const opEnv = { ...env, OPERATOR_EMAILS: opEmail };
    const approve = async (prefix: string) =>
      appSite.request(
        `http://localhost/operator/requests/${req!.id}/approve`,
        {
          method: 'POST',
          headers: { cookie: await asUser(op), 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ prefix }).toString(),
        },
        opEnv,
      );
    const refused = await approve('verify');
    expect(refused.status).toBe(200);
    expect(await refused.text()).toContain('reserved');
    expect(await getWardByUnitNumber(env, unit)).toBeNull();
    const ok = await approve('vfy' + String(Date.now()).slice(-6));
    expect(ok.status).toBe(302);
    expect(await getWardByUnitNumber(env, unit)).not.toBeNull();
  });
});
