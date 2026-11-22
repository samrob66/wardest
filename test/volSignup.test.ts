import { describe, it, expect } from 'vitest';
import { env, makeLeader, uniqueEmail } from './helpers';
import { NOW, fixture, counts, tokenFrom, volunteerRow, signupRows, type Fx } from './volFixtures';
import {
  submitSignup, verifyAddress, approveVolunteer, declineVolunteer, undoDecline, revokeApproval,
} from '../src/lib/volSignup';
import { makeLinkToken, readLinkToken } from '../src/lib/volSession';
import { addDate, addRole, createPost } from '../src/lib/volPosts';

const later = (min: number) => new Date(NOW.getTime() + min * 60_000);

function submit(fx: Fx, email: string, o: { roleId?: string; name?: string; bringing?: string | null; now?: Date; postId?: string } = {}) {
  return submitSignup(env, {
    wardId: fx.wardId, postId: o.postId ?? fx.postId, roleId: o.roleId ?? fx.bigRoleId, name: o.name ?? 'Val Volunteer',
    email, bringing: o.bringing ?? null, now: o.now ?? NOW,
  });
}

// New email -> verified -> approved by the EQ president. Returns the volunteer id.
async function approvedVolunteer(fx: Fx, email: string, roleId?: string): Promise<string> {
  const s = await submit(fx, email, { roleId });
  const tok = tokenFrom(s.messages.find((m) => m.kind === 'vol_verify'), '/vol/verify/');
  await verifyAddress(env, tok, NOW);
  const v = (await volunteerRow(fx.wardId, email))!;
  await approveVolunteer(env, fx.wardId, v.id, fx.eqPres, NOW);
  return v.id;
}

describe('submitSignup / verify / approve', () => {
  it('new email -> waiting_verify with one verify email; nothing counts yet', async () => {
    const fx = await fixture();
    const email = uniqueEmail('new');
    const r = await submit(fx, email.toUpperCase());
    expect(r.result).toBe('waiting_verify');
    expect(r.messages.map((m) => m.kind)).toEqual(['vol_verify']);
    expect(r.messages[0]!.to).toBe(email.toLowerCase());
    expect(await counts(fx, fx.bigRoleId)).toEqual({ confirmed: 0, waiting: 1 });
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('none');
  });

  it('verify -> one approver_waiting per approver (creator who is also an editor gets one)', async () => {
    const fx = await fixture();
    const email = uniqueEmail('new');
    const s = await submit(fx, email);
    const tok = tokenFrom(s.messages[0], '/vol/verify/');
    const v = await verifyAddress(env, tok, later(5));
    expect(v.result).toBe('verified');
    const waiting = v.messages.filter((m) => m.kind === 'approver_waiting');
    expect(waiting.map((m) => m.to).sort()).toEqual([fx.eqPresEmail, fx.counselorEmail].sort());
    expect(waiting[0]!.html).toContain(email.toLowerCase());
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('pending');
    // Single use.
    expect((await verifyAddress(env, tok, later(6))).result).toBe('invalid');
    // A pending volunteer's next sign-up goes straight to the approvers.
    const again = await submit(fx, email, { roleId: fx.roleId });
    expect(again.result).toBe('waiting_approval');
    expect(again.messages.map((m) => m.kind).sort()).toEqual(['approver_waiting', 'approver_waiting']);
  });

  it('an expired verify token is invalid', async () => {
    const fx = await fixture();
    const s = await submit(fx, uniqueEmail('slow'));
    const tok = tokenFrom(s.messages[0], '/vol/verify/');
    expect((await verifyAddress(env, tok, new Date(NOW.getTime() + 73 * 3_600_000))).result).toBe('invalid');
    expect((await verifyAddress(env, 'garbage', NOW)).result).toBe('invalid');
  });

  it('approve -> sign-up confirmed and an approved email with the private details', async () => {
    const fx = await fixture();
    const email = uniqueEmail('new');
    const s = await submit(fx, email);
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    const v = (await volunteerRow(fx.wardId, email))!;
    const a = await approveVolunteer(env, fx.wardId, v.id, fx.eqPres, NOW);
    expect(a.messages.map((m) => m.kind)).toEqual(['vol_approved']);
    expect(a.messages[0]!.html).toContain('Door code 4242');
    expect(a.messages[0]!.html).toContain('/vol/cancel/');
    expect(a.messages[0]!.discordText).toBeTruthy();
    expect(await counts(fx, fx.bigRoleId)).toEqual({ confirmed: 1, waiting: 0 });
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('approved');
    // Approved once for the whole ward: the next sign-up counts at once.
    const next = await submit(fx, email, { roleId: fx.roleId });
    expect(next.result).toBe('confirmed');
    const conf = next.messages.find((m) => m.kind === 'vol_confirmed')!;
    expect(conf.html).toContain('Door code 4242');
    expect(conf.html).toContain('/vol/access/');
    expect(conf.html).not.toContain('already met');
  });

  it("a ward member's email is confirmed immediately", async () => {
    const fx = await fixture();
    const email = uniqueEmail('leader');
    await makeLeader(env, fx.wardId, { email, name: 'Some Leader' });
    const r = await submit(fx, email);
    expect(r.result).toBe('confirmed');
    expect(r.messages.map((m) => m.kind)).toEqual(['vol_confirmed']);
    const v = (await volunteerRow(fx.wardId, email))!;
    expect(v.approval).toBe('approved');
    expect(v.email_verified_at).not.toBeNull();
  });

  it('a declined email -> declined_email and no messages', async () => {
    const fx = await fixture();
    const email = uniqueEmail('nope');
    const s = await submit(fx, email);
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    const v = (await volunteerRow(fx.wardId, email))!;
    const d = await declineVolunteer(env, fx.wardId, v.id, fx.eqPres, NOW);
    expect(d.messages.map((m) => m.kind)).toEqual(['vol_declined']);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('declined');
    const r = await submit(fx, email, { roleId: fx.roleId });
    expect(r.result).toBe('declined_email');
    expect(r.messages).toHaveLength(0);
    expect(await signupRows(fx.wardId, fx.roleId)).toHaveLength(0);
    // Undo: verified -> pending; they can sign up again.
    await undoDecline(env, fx.wardId, v.id, fx.eqPres);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('pending');
    expect((await submit(fx, email, { roleId: fx.roleId })).result).toBe('waiting_approval');
  });

  it('the same email twice on one role -> already_signed; concurrent double click -> one row', async () => {
    const fx = await fixture();
    const email = uniqueEmail('dbl');
    await submit(fx, email);
    const second = await submit(fx, email);
    expect(second.result).toBe('already_signed');
    expect(second.messages).toHaveLength(0);
    const email2 = uniqueEmail('dbl2');
    const both = await Promise.all([submit(fx, email2, { roleId: fx.roleId }), submit(fx, email2, { roleId: fx.roleId })]);
    expect(both.map((b) => b.result).sort()).toEqual(['already_signed', 'waiting_verify']);
    const rows = (await signupRows(fx.wardId, fx.roleId)).filter((r) => r.email === email2.toLowerCase());
    expect(rows).toHaveLength(1);
  });

  it('role needs 1: the first approved person is confirmed, the second is turned away (role_full)', async () => {
    const fx = await fixture();
    const a = uniqueEmail('a');
    const b = uniqueEmail('b');
    await makeLeader(env, fx.wardId, { email: a });
    await makeLeader(env, fx.wardId, { email: b });
    expect((await submit(fx, a, { roleId: fx.roleId })).result).toBe('confirmed');
    const r = await submit(fx, b, { roleId: fx.roleId });
    expect(r.result).toBe('role_full');
    expect(r.messages).toHaveLength(0);
    // A new (unapproved) email is turned away too.
    expect((await submit(fx, uniqueEmail('c'), { roleId: fx.roleId })).result).toBe('role_full');
  });

  it('two approved people racing for the last spot both get in; only the later is over', async () => {
    const fx = await fixture();
    const a = uniqueEmail('ra');
    const b = uniqueEmail('rb');
    await makeLeader(env, fx.wardId, { email: a });
    await makeLeader(env, fx.wardId, { email: b });
    const res = await Promise.all([submit(fx, a, { roleId: fx.roleId }), submit(fx, b, { roleId: fx.roleId })]);
    const results = res.map((r) => r.result).sort();
    // Whether both passed the "is it full?" check depends on interleaving; either way at most
    // one is over, and an over one is the later to be confirmed (confirm_seq).
    expect([['confirmed', 'confirmed_over'], ['confirmed', 'role_full']]).toContainEqual(results);
    const rows = (await signupRows(fx.wardId, fx.roleId)).filter((r) => r.status === 'confirmed');
    rows.sort((x, y) => x.confirm_seq! - y.confirm_seq!);
    expect(rows.map((r) => r.over_limit)).toEqual(rows.length === 2 ? [0, 1] : [0]);
  });

  it('late approval after the role filled -> confirmed over the limit, with the withdraw paragraph', async () => {
    const fx = await fixture();
    const waiter = uniqueEmail('waiter');
    const s = await submit(fx, waiter, { roleId: fx.roleId });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    const leader = uniqueEmail('lead');
    await makeLeader(env, fx.wardId, { email: leader });
    const first = await submit(fx, leader, { roleId: fx.roleId, now: later(1) });
    expect(first.result).toBe('confirmed');
    const v = (await volunteerRow(fx.wardId, waiter))!;
    const a = await approveVolunteer(env, fx.wardId, v.id, fx.eqPres, later(2));
    const rows = await signupRows(fx.wardId, fx.roleId);
    const mine = rows.find((r) => r.email === waiter.toLowerCase())!;
    expect(mine.status).toBe('confirmed');
    expect(mine.over_limit).toBe(1);
    const msg = a.messages.find((m) => m.kind === 'vol_approved')!;
    expect(msg.html).toContain('already met');
    expect(msg.html).toContain('/vol/withdraw/');
    expect(await counts(fx, fx.roleId)).toEqual({ confirmed: 2, waiting: 0 });
  });

  it('filling the last spot sends approver_filled exactly once, even if an over-limit sign-up follows', async () => {
    const fx = await fixture();
    // Make the post one role needing 1 by filling the 5-person role first.
    const kinds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const e = uniqueEmail(`m${i}`);
      await makeLeader(env, fx.wardId, { email: e });
      kinds.push(...(await submit(fx, e, { now: later(i) })).messages.map((m) => m.kind));
    }
    expect(kinds.filter((k) => k === 'approver_filled')).toHaveLength(0);
    const waiter = uniqueEmail('w');
    const s = await submit(fx, waiter, { roleId: fx.roleId });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    const last = uniqueEmail('last');
    await makeLeader(env, fx.wardId, { email: last });
    const fill = await submit(fx, last, { roleId: fx.roleId, now: later(10) });
    const filled = fill.messages.filter((m) => m.kind === 'approver_filled');
    expect(filled.map((m) => m.to).sort()).toEqual([fx.eqPresEmail, fx.counselorEmail].sort());
    const v = (await volunteerRow(fx.wardId, waiter))!;
    const a = await approveVolunteer(env, fx.wardId, v.id, fx.eqPres, later(11));
    expect(a.messages.filter((m) => m.kind === 'approver_filled')).toHaveLength(0);
  });

  it('a 4th verify email to the same address in 24h is not sent', async () => {
    const fx = await fixture();
    const email = uniqueEmail('spam');
    const p2 = await createPost(env, fx.wardId, fx.spaces['elders-quorum']!, fx.eqPres, {
      title: 'Second', public_note: null, private_details: null, cancel_cutoff_hours: 24,
    });
    const d2 = await addDate(env, fx.wardId, p2, '2026-12-07', null);
    const roles = [fx.roleId, fx.bigRoleId];
    for (let i = 0; i < 3; i++) roles.push(await addRole(env, fx.wardId, d2, { name: `R${i}`, needed: 3, start_time: null, end_time: null, note: null, bring_prompt: null }));
    const sent: number[] = [];
    for (let i = 0; i < 4; i++) {
      const roleId = roles[i]!;
      const postId = i < 2 ? fx.postId : p2;
      const r = await submitSignup(env, { wardId: fx.wardId, postId, roleId, name: 'S', email, bringing: null, now: later(i) });
      expect(r.result).toBe('waiting_verify');
      sent.push(r.messages.filter((m) => m.kind === 'vol_verify').length);
    }
    expect(sent).toEqual([1, 1, 1, 0]);
  });

  it('a role id from another post -> closed, nothing written', async () => {
    const fx = await fixture();
    const other = await fixture();
    const email = uniqueEmail('x');
    const r = await submit(fx, email, { roleId: other.roleId });
    expect(r.result).toBe('closed');
    expect(r.messages).toHaveLength(0);
    expect(await signupRows(other.wardId, other.roleId)).toHaveLength(0);
    // Another ward's post id under this ward -> closed.
    expect((await submit(fx, email, { postId: other.postId, roleId: other.roleId })).result).toBe('closed');
  });

  it('a date that is over -> closed', async () => {
    const fx = await fixture({ date: '2026-11-20' });
    expect((await submit(fx, uniqueEmail('late'))).result).toBe('closed');
  });

  it('bringing is kept only when the role asks', async () => {
    const fx = await fixture();
    const a = uniqueEmail('br');
    await makeLeader(env, fx.wardId, { email: a });
    await submit(fx, a, { roleId: fx.bigRoleId, bringing: 'a dolly' });
    await submit(fx, a, { roleId: fx.roleId, bringing: 'ignored' });
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!).toMatchObject({ bringing: 'a dolly' });
    expect((await signupRows(fx.wardId, fx.roleId))[0]!).toMatchObject({ bringing: null });
  });

  it("an existing volunteer's name is never overwritten", async () => {
    const fx = await fixture();
    const email = uniqueEmail('nm');
    await submit(fx, email, { name: 'Real Name' });
    await submit(fx, email, { roleId: fx.roleId, name: 'Impostor' });
    expect((await volunteerRow(fx.wardId, email))!.name).toBe('Real Name');
  });

  it('revokeApproval removes upcoming confirmed sign-ups and tells the approvers', async () => {
    const fx = await fixture();
    const email = uniqueEmail('rev');
    const vid = await approvedVolunteer(fx, email);
    const r = await revokeApproval(env, fx.wardId, vid, fx.eqPres, later(30));
    expect(r.messages.map((m) => m.kind).sort()).toEqual(['approver_cancelled', 'approver_cancelled']);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('removed');
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('declined');
  });

  it('approve/decline only act on this ward', async () => {
    const fx = await fixture();
    const other = await fixture();
    const email = uniqueEmail('cross');
    const s = await submit(fx, email);
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    const v = (await volunteerRow(fx.wardId, email))!;
    expect((await approveVolunteer(env, other.wardId, v.id, other.eqPres, NOW)).messages).toHaveLength(0);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('pending');
  });
});

describe('link tokens', () => {
  it('types are not interchangeable; expiry is enforced', async () => {
    const vacc = await makeLinkToken(env, { typ: 'vacc', wardId: 'w1', id: 'v1' });
    expect(await readLinkToken(env, 'vacc', vacc)).toEqual({ wardId: 'w1', id: 'v1' });
    expect(await readLinkToken(env, 'vcan', vacc)).toBeNull();
    const old = await makeLinkToken(env, { typ: 'vcan', wardId: 'w1', id: 's1', days: 1 }, new Date('2026-01-01T00:00:00Z'));
    expect(await readLinkToken(env, 'vcan', old, new Date('2026-01-03T00:00:00Z'))).toBeNull();
    expect(await readLinkToken(env, 'vcan', old + 'x')).toBeNull();
  });
});
