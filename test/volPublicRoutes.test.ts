import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, makeLeader, uniqueEmail, sentFetches } from './helpers';
import { NOW, fixture, tokenFrom, volunteerRow, signupRows } from './volFixtures';
import { submitSignup, verifyAddress } from '../src/lib/volSignup';
import { verifyTurnstile } from '../src/lib/turnstile';

function form(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

async function publicSignup(publicId: string, data: Record<string, string>, ip = '203.0.113.9') {
  return SELF.fetch(`http://localhost/v/${publicId}/signup`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': ip },
    body: form(data),
  });
}

async function leaderPost(uid: string, path: string, data: Record<string, string> = {}) {
  return SELF.fetch(`http://localhost${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: await asUser(uid), 'content-type': 'application/x-www-form-urlencoded' },
    body: form(data),
  });
}

describe('verifyTurnstile', () => {
  it('posts the secret, token and IP to siteverify', async () => {
    expect(await verifyTurnstile(env, 'tok', '1.2.3.4')).toBe(true);
    const f = sentFetches()[0]!;
    expect(f.url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(f.body).toMatchObject({ secret: 'test', response: 'tok', remoteip: '1.2.3.4' });
    expect(await verifyTurnstile(env, 'fail', null)).toBe(false);
    expect(await verifyTurnstile(env, '', null)).toBe(false);
    expect(await verifyTurnstile({ ...env, TURNSTILE_SECRET_KEY: '' }, 'tok', null)).toBe(false);
  });
});

describe('public sign-up route', () => {
  it('a failed bot check -> 400 and no sign-up', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const res = await publicSignup(fx.publicId, {
      role_id: fx.bigRoleId, name: 'Bot', email: uniqueEmail('bot'), 'cf-turnstile-response': 'fail',
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('bot check');
    expect(await signupRows(fx.wardId, fx.bigRoleId)).toHaveLength(0);
  });

  it("someone typing an approved member's email: counts, but the page shows no private details or names", async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const existing = uniqueEmail('existing');
    await makeLeader(env, fx.wardId, { email: existing, name: 'Existing Person' });
    await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Zed Unique', email: existing, bringing: null, now: NOW });
    const member = uniqueEmail('member');
    await makeLeader(env, fx.wardId, { email: member, name: 'Member Person' });
    const res = await publicSignup(fx.publicId, {
      role_id: fx.bigRoleId, name: 'Impersonator', email: member, 'cf-turnstile-response': 'ok',
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('You&#39;re signed up');
    expect(html).not.toContain('Door code 4242');
    expect(html).not.toContain('Zed Unique');
    expect(html).not.toContain('Existing Person');
    expect(html).not.toContain('Member Person');
    expect(html).not.toContain(existing);
    const rows = await signupRows(fx.wardId, fx.bigRoleId);
    expect(rows.filter((r) => r.status === 'confirmed')).toHaveLength(2);
  });

  it("a role from a different post -> closed, no row", async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const other = await fixture({ date: '2027-06-06' });
    const res = await publicSignup(fx.publicId, {
      role_id: other.roleId, name: 'X', email: uniqueEmail('x'), 'cf-turnstile-response': 'ok',
    });
    expect([200, 404]).toContain(res.status);
    expect(await res.text()).toMatch(/closed|doesn't exist/i);
    expect(await signupRows(other.wardId, other.roleId)).toHaveLength(0);
  });

  it('a new email gets the check-your-email page', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const res = await publicSignup(fx.publicId, {
      role_id: fx.bigRoleId, name: 'New Person', email: uniqueEmail('np'), 'cf-turnstile-response': 'ok',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Check your email to confirm your address');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('a bad email re-renders the form with an error', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const res = await publicSignup(fx.publicId, { role_id: fx.bigRoleId, name: 'N', email: 'not-an-email', 'cf-turnstile-response': 'ok' });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('valid email');
  });

  it('more than 20 sign-ups an hour from one IP are refused', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    let last: Response | null = null;
    for (let i = 0; i < 21; i++) {
      last = await publicSignup(fx.publicId, { role_id: fx.bigRoleId, name: 'R', email: uniqueEmail('r' + i), 'cf-turnstile-response': 'ok' }, '198.51.100.7');
    }
    expect(last!.status).toBe(429);
  });
});

describe('verify route', () => {
  it('GET changes nothing (mail scanners); POST confirms the address', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const email = uniqueEmail('v');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'V', email, bringing: null, now: new Date() });
    const tok = tokenFrom(s.messages[0], '/vol/verify/');
    for (let i = 0; i < 2; i++) {
      const g = await SELF.fetch(`http://localhost/vol/verify/${tok}`);
      expect(g.status).toBe(200);
      const html = await g.text();
      expect(html).toContain('Confirm my address');
      expect(html).toContain('method="post"');
    }
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('none');
    const p = await SELF.fetch(`http://localhost/vol/verify/${tok}`, { method: 'POST' });
    expect(p.status).toBe(200);
    expect(await p.text()).toContain('confirmed');
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('pending');
    const again = await SELF.fetch(`http://localhost/vol/verify/${tok}`, { method: 'POST' });
    expect(await again.text()).toMatch(/expired|already/);
  });
});

describe('approvals', () => {
  it('eqTeacher cannot approve; eqPres can; the ward volunteers page is Bishopric only', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const teacher = await makeLeader(env, fx.wardId, { email: uniqueEmail('teacher'), spaces: [['elders-quorum', 'member']] });
    const bishop = await makeLeader(env, fx.wardId, { email: uniqueEmail('bishop'), spaces: [['bishopric', 'member']] });
    const email = uniqueEmail('ap');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Ap', email, bringing: null, now: new Date() });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), new Date());
    const v = (await volunteerRow(fx.wardId, email))!;
    const manage = await (await SELF.fetch(`http://localhost/w/${fx.wardId}/vol/${fx.postId}`, { headers: { cookie: await asUser(fx.eqPres) } })).text();
    expect(manage).toContain(`/vol/volunteer/${v.id}/approve`);
    expect((await leaderPost(teacher, `/w/${fx.wardId}/vol/volunteer/${v.id}/approve`)).status).toBe(403);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('pending');
    const ok = await leaderPost(fx.eqPres, `/w/${fx.wardId}/vol/volunteer/${v.id}/approve`);
    expect(ok.status).toBe(302);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('approved');
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('confirmed');

    expect((await SELF.fetch(`http://localhost/w/${fx.wardId}/volunteers`, { redirect: 'manual', headers: { cookie: await asUser(fx.eqPres) } })).status).toBe(403);
    const list = await SELF.fetch(`http://localhost/w/${fx.wardId}/volunteers`, { headers: { cookie: await asUser(bishop) } });
    expect(list.status).toBe(200);
    const html = await list.text();
    expect(html).toContain(email);
    expect(html).toContain(`/vol/volunteer/${v.id}/revoke`);
    // Revoke (Bishopric only), then undo the decline.
    expect((await leaderPost(fx.eqPres, `/w/${fx.wardId}/vol/volunteer/${v.id}/revoke`)).status).toBe(403);
    expect((await leaderPost(bishop, `/w/${fx.wardId}/vol/volunteer/${v.id}/revoke`)).status).toBe(302);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('declined');
    expect((await leaderPost(bishop, `/w/${fx.wardId}/vol/volunteer/${v.id}/undo-decline`)).status).toBe(302);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('pending');
  });

  it('decline from the manage page', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const email = uniqueEmail('dc');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Dc', email, bringing: null, now: new Date() });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), new Date());
    const v = (await volunteerRow(fx.wardId, email))!;
    expect((await leaderPost(fx.counselor, `/w/${fx.wardId}/vol/volunteer/${v.id}/decline`)).status).toBe(302);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('declined');
  });
});
