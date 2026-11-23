import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, makeLeader, uniqueEmail, sentEmails, settle } from './helpers';
import { fixture, tokenFrom, signupRows, type Fx, futureDate } from './volFixtures';
import { submitSignup, verifyAddress, revokeApproval } from '../src/lib/volSignup';
import { makeLinkToken } from '../src/lib/volSession';
import { addDate, addRole, createPost } from '../src/lib/volPosts';

const FUTURE = futureDate();

async function memberVolunteer(fx: Fx, name: string, roleId: string) {
  const email = uniqueEmail(name.split(' ')[0]!.toLowerCase());
  await makeLeader(env, fx.wardId, { email, name });
  await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId, name, email, bringing: null, now: new Date() });
  const v = await env.DB.prepare(`SELECT id FROM volunteers WHERE ward_id = ? AND email = ?`).bind(fx.wardId, email.toLowerCase()).first<{ id: string }>();
  return { email: email.toLowerCase(), id: v!.id };
}

async function pendingVolunteer(fx: Fx, name: string, roleId: string) {
  const email = uniqueEmail(name.split(' ')[0]!.toLowerCase());
  const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId, name, email, bringing: null, now: new Date() });
  await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), new Date());
  const v = await env.DB.prepare(`SELECT id FROM volunteers WHERE ward_id = ? AND email = ?`).bind(fx.wardId, email.toLowerCase()).first<{ id: string }>();
  return { email: email.toLowerCase(), id: v!.id };
}

// Follow an access link; return the wardforward_vol cookie.
async function signIn(fx: Fx, volunteerId: string): Promise<string> {
  const tok = await makeLinkToken(env, { typ: 'vacc', wardId: fx.wardId, id: volunteerId });
  const res = await SELF.fetch(`http://localhost/vol/access/${tok}`, { redirect: 'manual' });
  expect(res.status).toBe(302);
  expect(res.headers.get('location')).toBe(`/vol/${fx.prefix}/me`);
  const set = res.headers.get('set-cookie') ?? '';
  const m = set.match(/wardforward_vol=([^;]+)/);
  expect(m).not.toBeNull();
  expect(set.toLowerCase()).toContain('httponly');
  return `wardforward_vol=${m![1]}`;
}

async function mine(fx: Fx, cookie?: string) {
  const res = await SELF.fetch(`http://localhost/vol/${fx.prefix}/me`, { headers: cookie ? { cookie } : {} });
  expect(res.status).toBe(200);
  return res.text();
}

describe('My sign-ups', () => {
  it('signed out: only the email form', async () => {
    const fx = await fixture({ date: FUTURE });
    const html = await mine(fx);
    expect(html).toContain(`action="/vol/${fx.prefix}/me/link"`);
    expect(html).not.toContain('Door code');
  });

  it("A's link shows A's sign-ups with private details and the other volunteers' names, never B's", async () => {
    const fx = await fixture({ date: FUTURE });
    const a = await memberVolunteer(fx, 'Alice Able', fx.bigRoleId);
    await memberVolunteer(fx, 'Bob Baker', fx.roleId);
    // Another post in the ward that A isn't on.
    const other = await createPost(env, fx.wardId, fx.spaces['relief-society']!, fx.eqPres, {
      title: 'Meals for the Parkers', public_note: null, private_details: 'Secret 9999', cancel_cutoff_hours: 24,
    });
    const od = await addDate(env, fx.wardId, other, FUTURE, null);
    const orole = await addRole(env, fx.wardId, od, { name: 'Dinner', needed: 3, start_time: null, end_time: null, note: null, bring_prompt: null });
    const c = await memberVolunteer({ ...fx, postId: other }, 'Carl Cook', orole);
    void c;
    const cookie = await signIn(fx, a.id);
    const html = await mine(fx, cookie);
    expect(html).toContain('Help the Jensens move in');
    expect(html).toContain('Door code 4242');
    expect(html).toContain('Bob Baker'); // on the same post
    expect(html).toContain('Other ways to serve');
    expect(html).toContain('Meals for the Parkers');
    expect(html).toContain('1 of 3');
    expect(html).not.toContain('Secret 9999');
    expect(html).not.toContain('Carl Cook');
    expect(html).toContain(`/vol/${fx.prefix}/me/cancel/`);
  });

  it('a pending volunteer sees "waiting for approval", no private details, no other ways to serve', async () => {
    const fx = await fixture({ date: FUTURE });
    const p = await pendingVolunteer(fx, 'Pat Pending', fx.bigRoleId);
    await memberVolunteer(fx, 'Bob Baker', fx.roleId);
    const html = await mine(fx, await signIn(fx, p.id));
    expect(html).toContain('waiting for approval');
    expect(html).not.toContain('Door code 4242');
    expect(html).not.toContain('Bob Baker');
    expect(html).not.toContain('Other ways to serve');
  });

  it('private details stop once the post is over', async () => {
    const fx = await fixture({ date: FUTURE });
    const a = await memberVolunteer(fx, 'Alice Able', fx.bigRoleId);
    await env.DB.prepare(`UPDATE vol_dates SET date = '2026-01-10' WHERE id = ?`).bind(fx.dateId).run();
    const html = await mine(fx, await signIn(fx, a.id));
    expect(html).toContain('Help the Jensens move in');
    expect(html).not.toContain('Door code 4242');
  });

  it('/me/link: same answer for unknown and known emails; only a known one gets an email', async () => {
    const fx = await fixture({ date: FUTURE });
    const a = await memberVolunteer(fx, 'Alice Able', fx.bigRoleId);
    const ask = (email: string) =>
      SELF.fetch(`http://localhost/vol/${fx.prefix}/me/link`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, 'cf-turnstile-response': 'ok' }).toString(),
      });
    const unknown = await (await ask(uniqueEmail('nobody'))).text();
    await settle();
    expect(sentEmails()).toHaveLength(0);
    const known = await (await ask(a.email)).text();
    const strip = (h: string) => h.replace(/\s+/g, ' ');
    expect(strip(known)).toBe(strip(unknown));
    // Delivery runs via waitUntil.
    await settle();
    const mails = sentEmails();
    expect(mails).toHaveLength(1);
    expect(mails[0]!.to).toBe(a.email);
  });

  it('a wardforward_vol cookie grants nothing on leader pages', async () => {
    const fx = await fixture({ date: FUTURE });
    const a = await memberVolunteer(fx, 'Alice Able', fx.bigRoleId);
    const cookie = await signIn(fx, a.id);
    const res = await SELF.fetch(`http://localhost/w/${fx.wardId}`, { redirect: 'manual', headers: { cookie } });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/auth/login');
  });

  it("a revoked (declined) volunteer's cookie shows the signed-out view", async () => {
    const fx = await fixture({ date: FUTURE });
    const a = await memberVolunteer(fx, 'Alice Able', fx.bigRoleId);
    const cookie = await signIn(fx, a.id);
    // Revocation only applies to non-members in practice; revoke directly for the test.
    await revokeApproval(env, fx.wardId, a.id, fx.eqPres, new Date());
    const html = await mine(fx, cookie);
    expect(html).toContain(`action="/vol/${fx.prefix}/me/link"`);
    expect(html).not.toContain('Help the Jensens move in');
  });

  it("A's session can't cancel B's sign-up; A can cancel their own", async () => {
    const fx = await fixture({ date: FUTURE });
    const a = await memberVolunteer(fx, 'Alice Able', fx.bigRoleId);
    const b = await memberVolunteer(fx, 'Bob Baker', fx.roleId);
    const cookie = await signIn(fx, a.id);
    const bRow = (await signupRows(fx.wardId, fx.roleId)).find((r) => r.email === b.email)!;
    const res = await SELF.fetch(`http://localhost/vol/${fx.prefix}/me/cancel/${bRow.id}`, { method: 'POST', redirect: 'manual', headers: { cookie } });
    expect(res.status).toBe(404);
    expect((await signupRows(fx.wardId, fx.roleId)).find((r) => r.email === b.email)!.status).toBe('confirmed');
    const aRow = (await signupRows(fx.wardId, fx.bigRoleId)).find((r) => r.email === a.email)!;
    const ok = await SELF.fetch(`http://localhost/vol/${fx.prefix}/me/cancel/${aRow.id}`, { method: 'POST', redirect: 'manual', headers: { cookie } });
    expect(ok.status).toBe(302);
    expect((await signupRows(fx.wardId, fx.bigRoleId)).find((r) => r.email === a.email)!.status).toBe('cancelled');
  });

  it('a session for one ward is signed out on another ward', async () => {
    const fx = await fixture({ date: FUTURE });
    const other = await fixture({ date: FUTURE });
    const a = await memberVolunteer(fx, 'Alice Able', fx.bigRoleId);
    const cookie = await signIn(fx, a.id);
    const html = await mine(other, cookie);
    expect(html).toContain(`action="/vol/${other.prefix}/me/link"`);
    expect(html).not.toContain('Alice');
  });
});
