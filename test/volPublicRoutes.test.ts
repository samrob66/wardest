import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, makeLeader, uniqueEmail, sentFetches, sentEmails, settle } from './helpers';
import { makeLinkToken } from '../src/lib/volSession';
import { NOW, fixture, tokenFrom, volunteerRow, signupRows, futureDate } from './volFixtures';
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
    const fx = await fixture({ date: futureDate() });
    const res = await publicSignup(fx.publicId, {
      role_id: fx.bigRoleId, name: 'Bot', email: uniqueEmail('bot'), 'cf-turnstile-response': 'fail',
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('bot check');
    expect(await signupRows(fx.wardId, fx.bigRoleId)).toHaveLength(0);
  });

  it("someone typing an approved member's email: counts, but the page shows no private details or names", async () => {
    const fx = await fixture({ date: futureDate() });
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
    expect(html).toContain('check your email to finish');
    expect(html).not.toContain('Door code 4242');
    expect(html).not.toContain('Zed Unique');
    expect(html).not.toContain('Existing Person');
    expect(html).not.toContain('Member Person');
    expect(html).not.toContain(existing);
    // The sign-up itself is made after the response (waitUntil): the row appears.
    await settle();
    const rows = (await signupRows(fx.wardId, fx.bigRoleId)).filter((x) => x.status === 'confirmed');
    expect(rows).toHaveLength(2);
    // ...and the real owner of the address is told (the spec's safeguard).
    const mail = sentEmails().find((e) => e.to === member.toLowerCase());
    expect(mail!.subject).toContain("you're signed up");
  });

  it("a role from a different post -> closed, no row", async () => {
    const fx = await fixture({ date: futureDate() });
    const other = await fixture({ date: futureDate() });
    const res = await publicSignup(fx.publicId, {
      role_id: other.roleId, name: 'X', email: uniqueEmail('x'), 'cf-turnstile-response': 'ok',
    });
    expect([200, 404]).toContain(res.status);
    expect(await res.text()).toMatch(/closed|doesn't exist/i);
    expect(await signupRows(other.wardId, other.roleId)).toHaveLength(0);
  });

  it('a new email gets the check-your-email page', async () => {
    const fx = await fixture({ date: futureDate() });
    const res = await publicSignup(fx.publicId, {
      role_id: fx.bigRoleId, name: 'New Person', email: uniqueEmail('np'), 'cf-turnstile-response': 'ok',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('check your email to finish');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('a bad email re-renders the form with an error', async () => {
    const fx = await fixture({ date: futureDate() });
    const res = await publicSignup(fx.publicId, { role_id: fx.bigRoleId, name: 'N', email: 'not-an-email', 'cf-turnstile-response': 'ok' });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('valid email');
  });

  it('more than 20 sign-ups an hour from one IP are refused', async () => {
    const fx = await fixture({ date: futureDate() });
    let last: Response | null = null;
    for (let i = 0; i < 21; i++) {
      last = await publicSignup(fx.publicId, { role_id: fx.bigRoleId, name: 'R', email: uniqueEmail('r' + i), 'cf-turnstile-response': 'ok' }, '198.51.100.7');
    }
    expect(last!.status).toBe(429);
  });
});

describe('the result page never depends on the address', () => {
  it('is byte-identical for a new, an approved, a declined and an already-signed address', async () => {
    const fx = await fixture({ date: futureDate() });
    const approved = uniqueEmail('appr');
    await makeLeader(env, fx.wardId, { email: approved, name: 'Approved Person' });
    const declined = uniqueEmail('decl');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'D', email: declined, bringing: null, now: new Date() });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), new Date());
    const { declineVolunteer } = await import('../src/lib/volSignup');
    await declineVolunteer(env, fx.wardId, (await volunteerRow(fx.wardId, declined))!.id, fx.eqPres, new Date());
    const already = uniqueEmail('already');
    await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'A', email: already, bringing: null, now: new Date() });
    const pages: string[] = [];
    for (const email of [uniqueEmail('brand-new'), approved, declined, already]) {
      const res = await publicSignup(fx.publicId, { role_id: fx.bigRoleId, name: 'Some Name', email, 'cf-turnstile-response': 'ok' });
      expect(res.status).toBe(200);
      pages.push(await res.text());
    }
    expect(new Set(pages).size).toBe(1);
    expect(pages[0]).toContain('check your email to finish');
    // And what happened went to each address by email.
    const subjectsTo = (e: string) =>
      sentEmails()
        .filter((m) => m.to === e.toLowerCase())
        .map((m) => m.subject)
        .join(' | ');
    await settle();
    expect(subjectsTo(approved)).toContain("you're signed up");
    expect(subjectsTo(declined)).toContain('about your volunteer sign-up');
    expect(subjectsTo(already)).toContain("you're already signed up");
    // The unconfirmed already-signed address gets a working confirm link in that email.
    const alreadyMail = sentEmails().find((m) => m.to === already.toLowerCase())!;
    expect(alreadyMail.html).toContain('http://localhost:8787/vol/verify/');
  });

  it('a full role reads the same for the person already on it, with wording true for them', async () => {
    const fx = await fixture({ date: futureDate() });
    const holder = uniqueEmail('holder');
    await makeLeader(env, fx.wardId, { email: holder });
    await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'H', email: holder, bringing: null, now: new Date() });
    const pages: string[] = [];
    for (const email of [holder, uniqueEmail('other')]) {
      const res = await publicSignup(fx.publicId, { role_id: fx.roleId, name: 'H', email, 'cf-turnstile-response': 'ok' });
      pages.push(await res.text());
    }
    expect(pages[0]).toBe(pages[1]);
    expect(pages[0]).toContain('If you already signed up for it, you');
    expect(pages[0]).not.toContain('don’t need to come');
  });
});

describe('suspended wards', () => {
  it('emailed cancel/withdraw links and confirm-address links stop working', async () => {
    const fx = await fixture({ date: futureDate() });
    const member = uniqueEmail('susp');
    await makeLeader(env, fx.wardId, { email: member });
    await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'S', email: member, bringing: null, now: new Date() });
    const row = (await signupRows(fx.wardId, fx.bigRoleId))[0]!;
    await env.DB.prepare(`UPDATE vol_signups SET over_limit = 1 WHERE id = ?`).bind(row.id).run();
    const newcomer = uniqueEmail('newc');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'N', email: newcomer, bringing: null, now: new Date() });
    const vtok = tokenFrom(s.messages[0], '/vol/verify/');
    const can = await makeLinkToken(env, { typ: 'vcan', wardId: fx.wardId, id: row.id });
    const wd = await makeLinkToken(env, { typ: 'vwd', wardId: fx.wardId, id: row.id });
    await env.DB.prepare(`UPDATE wards SET status = 'suspended' WHERE id = ?`).bind(fx.wardId).run();
    expect((await SELF.fetch(`http://localhost/vol/cancel/${can}`)).status).toBe(404);
    expect((await SELF.fetch(`http://localhost/vol/cancel/${can}`, { method: 'POST' })).status).toBe(404);
    expect((await SELF.fetch(`http://localhost/vol/withdraw/${wd}`, { method: 'POST' })).status).toBe(404);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('confirmed');
    const v = await SELF.fetch(`http://localhost/vol/verify/${vtok}`, { method: 'POST' });
    expect(v.status).toBe(400);
    expect((await volunteerRow(fx.wardId, newcomer))!.approval).toBe('none');
  });

  it('their public posts and sign-up form are not found', async () => {
    const fx = await fixture({ date: futureDate() });
    await env.DB.prepare(`UPDATE wards SET status = 'suspended' WHERE id = ?`).bind(fx.wardId).run();
    expect((await SELF.fetch(`http://localhost/v/${fx.publicId}`)).status).toBe(404);
    const res = await publicSignup(fx.publicId, { role_id: fx.bigRoleId, name: 'S', email: uniqueEmail('s'), 'cf-turnstile-response': 'ok' });
    expect(res.status).toBe(404);
    expect(await signupRows(fx.wardId, fx.bigRoleId)).toHaveLength(0);
  });
});

describe('verify route', () => {
  it('GET changes nothing (mail scanners); POST confirms the address', async () => {
    const fx = await fixture({ date: futureDate() });
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
    const fx = await fixture({ date: futureDate() });
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
    const fx = await fixture({ date: futureDate() });
    const email = uniqueEmail('dc');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Dc', email, bringing: null, now: new Date() });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), new Date());
    const v = (await volunteerRow(fx.wardId, email))!;
    expect((await leaderPost(fx.counselor, `/w/${fx.wardId}/vol/volunteer/${v.id}/decline`)).status).toBe(302);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('declined');
  });
});
