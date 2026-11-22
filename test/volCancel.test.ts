import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, makeLeader, uniqueEmail } from './helpers';
import { NOW, fixture, signupRows, tokenFrom, type Fx } from './volFixtures';
import {
  submitSignup, cancelSignup, withdrawOffer, removeSignup, cutoffInstant, approveVolunteer, verifyAddress,
} from '../src/lib/volSignup';
import { getPost } from '../src/lib/volPosts';
import { makeLinkToken } from '../src/lib/volSession';

// A ward member signs up (counts at once). Returns the sign-up id.
async function memberSignup(fx: Fx, roleId: string, at = NOW): Promise<{ id: string; email: string }> {
  const email = uniqueEmail('m');
  await makeLeader(env, fx.wardId, { email, name: 'Member ' + email.slice(0, 6) });
  await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId, name: 'M', email, bringing: null, now: at });
  const row = (await signupRows(fx.wardId, roleId)).find((r) => r.email === email.toLowerCase())!;
  return { id: row.id, email };
}

describe('cancelSignup', () => {
  // 2026-12-06 09:00 Denver = 16:00Z; cutoff 24h -> 2026-12-05T16:00Z.
  it('30h before the start is not urgent; 10h before is', async () => {
    const fx = await fixture();
    const a = await memberSignup(fx, fx.bigRoleId);
    const b = await memberSignup(fx, fx.bigRoleId);
    const early = await cancelSignup(env, fx.wardId, a.id, new Date('2026-12-05T10:00:00Z'));
    expect(early.result).toBe('cancelled');
    expect(early.messages.map((m) => m.kind)).toEqual(['approver_cancelled', 'approver_cancelled']);
    expect(early.messages[0]!.subject).not.toContain('URGENT');
    expect(early.messages[0]!.subject).toContain('short');
    const late = await cancelSignup(env, fx.wardId, b.id, new Date('2026-12-06T06:00:00Z'));
    expect(late.messages[0]!.subject).toContain('URGENT');
    expect(late.messages[0]!.html).toContain('after your cancel cutoff');
  });

  it('an over-filled role (3 of 1) stays full after a cancel, and says so', async () => {
    const fx = await fixture();
    // Two people sign up and confirm their address while the 1-person role is open...
    const waiters = [uniqueEmail('w0'), uniqueEmail('w1')];
    for (const email of waiters) {
      const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'W', email, bringing: null, now: NOW });
      await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    }
    // ...a member fills it, then both are approved late: 3 confirmed of 1.
    await memberSignup(fx, fx.roleId);
    const ids: string[] = [];
    for (const email of waiters) {
      const v = await env.DB.prepare(`SELECT id FROM volunteers WHERE ward_id = ? AND email = ?`).bind(fx.wardId, email.toLowerCase()).first<{ id: string }>();
      await approveVolunteer(env, fx.wardId, v!.id, fx.eqPres, NOW);
      ids.push((await signupRows(fx.wardId, fx.roleId)).find((r) => r.email === email.toLowerCase())!.id);
    }
    const p = (await getPost(env, fx.wardId, fx.postId))!;
    expect(p.dates[0]!.roles.find((r) => r.id === fx.roleId)!.confirmed).toBe(3);
    const out = await cancelSignup(env, fx.wardId, ids[0]!, new Date('2026-12-06T06:00:00Z'));
    expect(out.messages[0]!.subject).toContain('still full');
    expect(out.messages[0]!.subject).not.toContain('URGENT');
  });

  it('cancelling twice -> already, no messages; a waiting sign-up cancels silently', async () => {
    const fx = await fixture();
    const a = await memberSignup(fx, fx.bigRoleId);
    await cancelSignup(env, fx.wardId, a.id, NOW);
    const again = await cancelSignup(env, fx.wardId, a.id, NOW);
    expect(again).toEqual({ result: 'already', messages: [] });
    const email = uniqueEmail('w');
    await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'W', email, bringing: null, now: NOW });
    const w = (await signupRows(fx.wardId, fx.bigRoleId)).find((r) => r.email === email.toLowerCase())!;
    const c = await cancelSignup(env, fx.wardId, w.id, NOW);
    expect(c).toEqual({ result: 'cancelled', messages: [] });
  });

  it("another ward's sign-up id -> not_found", async () => {
    const fx = await fixture();
    const other = await fixture();
    const b = await memberSignup(other, other.bigRoleId);
    expect((await cancelSignup(env, fx.wardId, b.id, NOW)).result).toBe('not_found');
    expect((await signupRows(other.wardId, other.bigRoleId))[0]!.status).toBe('confirmed');
  });

  it('cutoffInstant at 1:30 AM on the DST-end day is a real instant', async () => {
    const fx = await fixture({ date: '2026-11-01', time: '01:30' });
    const p = (await getPost(env, fx.wardId, fx.postId))!;
    const t = cutoffInstant(p, p.dates[0]!, p.dates[0]!.roles[0]!);
    expect(Number.isNaN(t.getTime())).toBe(false);
    expect(['2026-10-31T07:30:00.000Z', '2026-10-31T08:30:00.000Z']).toContain(t.toISOString());
  });
});

describe('withdrawOffer', () => {
  it('only an over-the-limit sign-up can be withdrawn; with the role still full, nobody is emailed', async () => {
    const fx = await fixture();
    const a = await memberSignup(fx, fx.roleId);
    expect((await withdrawOffer(env, fx.wardId, a.id, NOW)).result).toBe('not_found');
    // A late approval lands over the limit.
    const email = uniqueEmail('over');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'O', email, bringing: null, now: NOW });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    // Also put them on the 1-person role while it's full? Not possible; use the big role filled by members.
    for (let i = 0; i < 5; i++) await memberSignup(fx, fx.bigRoleId);
    const v = await env.DB.prepare(`SELECT id FROM volunteers WHERE ward_id = ? AND email = ?`).bind(fx.wardId, email.toLowerCase()).first<{ id: string }>();
    await approveVolunteer(env, fx.wardId, v!.id, fx.eqPres, NOW);
    const over = (await signupRows(fx.wardId, fx.bigRoleId)).find((r) => r.email === email.toLowerCase())!;
    expect(over.over_limit).toBe(1);
    const w = await withdrawOffer(env, fx.wardId, over.id, NOW);
    expect(w).toEqual({ result: 'withdrawn', messages: [] });
    expect((await withdrawOffer(env, fx.wardId, over.id, NOW)).result).toBe('already');
  });
});

describe('removeSignup', () => {
  it('tells the volunteer, not the approvers', async () => {
    const fx = await fixture();
    const a = await memberSignup(fx, fx.bigRoleId);
    const r = await removeSignup(env, fx.wardId, a.id, fx.eqPres, NOW);
    expect(r.result).toBe('removed');
    expect(r.messages.map((m) => [m.kind, m.to])).toEqual([['vol_removed', a.email.toLowerCase()]]);
    expect((await removeSignup(env, fx.wardId, a.id, fx.eqPres, NOW)).result).toBe('already');
  });
});

describe('cancel / withdraw / remove routes', () => {
  it('GET the cancel page changes nothing; POST cancels', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const a = await memberSignup(fx, fx.bigRoleId, new Date());
    const tok = await makeLinkToken(env, { typ: 'vcan', wardId: fx.wardId, id: a.id });
    for (let i = 0; i < 2; i++) {
      const g = await SELF.fetch(`http://localhost/vol/cancel/${tok}`);
      expect(g.status).toBe(200);
      expect(await g.text()).toContain('method="post"');
    }
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('confirmed');
    const p = await SELF.fetch(`http://localhost/vol/cancel/${tok}`, { method: 'POST' });
    expect(p.status).toBe(200);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('cancelled');
  });

  it("a token naming ward A but holding ward B's sign-up id -> not found", async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const other = await fixture({ date: '2027-06-06' });
    const b = await memberSignup(other, other.bigRoleId, new Date());
    const forged = await makeLinkToken(env, { typ: 'vcan', wardId: fx.wardId, id: b.id });
    expect((await SELF.fetch(`http://localhost/vol/cancel/${forged}`)).status).toBe(404);
    expect((await SELF.fetch(`http://localhost/vol/cancel/${forged}`, { method: 'POST' })).status).toBe(404);
    // An access token isn't a cancel token.
    const vacc = await makeLinkToken(env, { typ: 'vacc', wardId: other.wardId, id: b.id });
    expect((await SELF.fetch(`http://localhost/vol/cancel/${vacc}`, { method: 'POST' })).status).toBe(404);
    expect((await signupRows(other.wardId, other.bigRoleId))[0]!.status).toBe('confirmed');
  });

  it('a cancel link for a date that is over -> not found', async () => {
    const fx = await fixture({ date: '2026-11-01' });
    await env.DB.prepare(`UPDATE vol_dates SET date = '2027-06-06' WHERE id = ?`).bind(fx.dateId).run();
    const a = await memberSignup(fx, fx.bigRoleId, new Date());
    await env.DB.prepare(`UPDATE vol_dates SET date = '2026-01-01' WHERE id = ?`).bind(fx.dateId).run();
    const tok = await makeLinkToken(env, { typ: 'vcan', wardId: fx.wardId, id: a.id });
    expect((await SELF.fetch(`http://localhost/vol/cancel/${tok}`, { method: 'POST' })).status).toBe(404);
  });

  it('GET withdraw page changes nothing', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const a = await memberSignup(fx, fx.bigRoleId, new Date());
    await env.DB.prepare(`UPDATE vol_signups SET over_limit = 1 WHERE id = ?`).bind(a.id).run();
    const tok = await makeLinkToken(env, { typ: 'vwd', wardId: fx.wardId, id: a.id });
    expect((await SELF.fetch(`http://localhost/vol/withdraw/${tok}`)).status).toBe(200);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('confirmed');
    expect((await SELF.fetch(`http://localhost/vol/withdraw/${tok}`, { method: 'POST' })).status).toBe(200);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('withdrawn');
  });

  it('eqTeacher cannot remove a volunteer; eqPres can', async () => {
    const fx = await fixture({ date: '2027-06-06' });
    const teacher = await makeLeader(env, fx.wardId, { email: uniqueEmail('t'), spaces: [['elders-quorum', 'member']] });
    const a = await memberSignup(fx, fx.bigRoleId, new Date());
    const post = async (uid: string) =>
      SELF.fetch(`http://localhost/w/${fx.wardId}/vol/signup/${a.id}/remove`, {
        method: 'POST', redirect: 'manual', headers: { cookie: await asUser(uid) },
      });
    expect((await post(teacher)).status).toBe(403);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('confirmed');
    expect((await post(fx.eqPres)).status).toBe(302);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('removed');
  });
});
