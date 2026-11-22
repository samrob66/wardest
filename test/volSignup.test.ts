import { describe, it, expect } from 'vitest';
import { env, makeLeader, uniqueEmail } from './helpers';
import { NOW, fixture, counts, tokenFrom, volunteerRow, signupRows, type Fx } from './volFixtures';
import {
  submitSignup, verifyAddress, approveVolunteer, declineVolunteer, undoDecline, revokeApproval,
} from '../src/lib/volSignup';
import { makeLinkToken, readLinkToken } from '../src/lib/volSession';
import { addDate, addRole, createPost } from '../src/lib/volPosts';
import { barrierDb, hookDb } from './helpers';

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
    expect(again.messages.map((m) => m.kind).sort()).toEqual(['approver_waiting', 'approver_waiting', 'vol_waiting']);
    expect(again.messages.find((m) => m.kind === 'vol_waiting')!.to).toBe(email.toLowerCase());
  });

  it('a second, unused verify link while already pending tells no one again', async () => {
    const fx = await fixture();
    const email = uniqueEmail('twice');
    const a = await submit(fx, email, { roleId: fx.roleId });
    const b = await submit(fx, email, { roleId: fx.bigRoleId });
    const t1 = tokenFrom(a.messages[0], '/vol/verify/');
    const t2 = tokenFrom(b.messages[0], '/vol/verify/');
    expect((await verifyAddress(env, t1, later(1))).messages.filter((m) => m.kind === 'approver_waiting')).toHaveLength(2);
    const second = await verifyAddress(env, t2, later(2));
    expect(second.result).toBe('verified');
    expect(second.messages).toHaveLength(0);
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

  it('a declined email -> declined_email, and the address gets a contact-your-leaders email', async () => {
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
    expect(r.messages.map((m) => [m.kind, m.to])).toEqual([['vol_contact_leaders', email.toLowerCase()]]);
    expect(r.messages[0]!.html).toContain("contact your ward's leaders");
    expect(r.messages[0]!.html).not.toMatch(/declined|reason/i);
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
    // Told by email (unverified, so no My sign-ups link).
    expect(second.messages.map((m) => m.kind)).toEqual(['vol_already']);
    expect(second.messages[0]!.html).not.toContain('/vol/access/');
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
    // Hold both sign-up inserts until both requests have passed the "is it full?" check, so
    // they really race for the last spot.
    const raceEnv = { ...env, DB: barrierDb(env.DB, 'INSERT INTO vol_signups', 2) };
    const sub = (email: string) =>
      submitSignup(raceEnv, { wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'R', email, bringing: null, now: NOW });
    const res = await Promise.all([sub(a), sub(b)]);
    expect(res.map((r) => r.result).sort()).toEqual(['confirmed', 'confirmed_over']);
    const rows = (await signupRows(fx.wardId, fx.roleId)).filter((r) => r.status === 'confirmed');
    expect(rows).toHaveLength(2);
    rows.sort((x, y) => x.confirm_seq! - y.confirm_seq!);
    expect(rows.map((r) => r.over_limit)).toEqual([0, 1]);
    // The one marked over is the one told so.
    const overEmail = rows[1]!.email;
    const overResult = res.find((r) => r.messages.some((m) => m.kind === 'vol_confirmed' && m.to === overEmail))!;
    expect(overResult.result).toBe('confirmed_over');
    expect(overResult.messages.find((m) => m.kind === 'vol_confirmed')!.html).toContain('already met');
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

  it('the latest name wins while the address is unconfirmed; once verified it never changes', async () => {
    const fx = await fixture();
    const email = uniqueEmail('nm');
    const s = await submit(fx, email, { name: 'First Try' });
    const s2 = await submit(fx, email, { roleId: fx.roleId, name: 'Second Try' });
    expect((await volunteerRow(fx.wardId, email))!.name).toBe('Second Try');
    await verifyAddress(env, tokenFrom(s2.messages[0] ?? s.messages[0], '/vol/verify/'), NOW);
    const p2 = await createPost(env, fx.wardId, fx.spaces['elders-quorum']!, fx.eqPres, {
      title: 'Another', public_note: null, private_details: null, cancel_cutoff_hours: 24,
    });
    const d2 = await addDate(env, fx.wardId, p2, '2026-12-07', null);
    const r2 = await addRole(env, fx.wardId, d2, { name: 'R', needed: 3, start_time: null, end_time: null, note: null, bring_prompt: null });
    await submitSignup(env, { wardId: fx.wardId, postId: p2, roleId: r2, name: 'Impostor', email, bringing: null, now: NOW });
    expect((await volunteerRow(fx.wardId, email))!.name).toBe('Second Try');
  });

  it('every public-form email to one address shares a cap: the 4th in 24h is not sent', async () => {
    const fx = await fixture();
    const email = uniqueEmail('cap');
    const kinds: string[][] = [];
    kinds.push((await submit(fx, email, { roleId: fx.roleId })).messages.map((m) => m.kind)); // verify
    kinds.push((await submit(fx, email, { roleId: fx.roleId })).messages.map((m) => m.kind)); // already
    kinds.push((await submit(fx, email, { roleId: fx.bigRoleId })).messages.map((m) => m.kind)); // verify
    const fourth = await submit(fx, email, { roleId: fx.bigRoleId }); // already, over the cap
    expect(kinds).toEqual([['vol_verify'], ['vol_already'], ['vol_verify']]);
    expect(fourth.result).toBe('already_signed');
    expect(fourth.messages).toHaveLength(0);
  });

  it('a full role reads the same for any address (checked before anything about the email)', async () => {
    const fx = await fixture();
    const filler = uniqueEmail('fill');
    await makeLeader(env, fx.wardId, { email: filler });
    await submit(fx, filler, { roleId: fx.roleId });
    // The filler themselves, a new address and a declined one all get role_full, nothing sent.
    const declinedEmail = uniqueEmail('dec');
    const s = await submit(fx, declinedEmail, { roleId: fx.bigRoleId });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    await declineVolunteer(env, fx.wardId, (await volunteerRow(fx.wardId, declinedEmail))!.id, fx.eqPres, NOW);
    for (const e of [filler, uniqueEmail('new'), declinedEmail]) {
      const r = await submit(fx, e, { roleId: fx.roleId });
      expect(r).toEqual({ result: 'role_full', messages: [] });
    }
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

describe('approval only promotes sign-ups that are still waiting', () => {
  it('a sign-up cancelled between the read and the confirm stays cancelled', async () => {
    const fx = await fixture();
    const email = uniqueEmail('slip');
    const s = await submit(fx, email);
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), NOW);
    const v = (await volunteerRow(fx.wardId, email))!;
    const row = (await signupRows(fx.wardId, fx.bigRoleId))[0]!;
    // Cancel it right before approveVolunteer's confirm statement runs.
    const sneaky = {
      ...env,
      DB: hookDb(env.DB, "SET status = 'confirmed'", async () => {
        await env.DB.prepare(`UPDATE vol_signups SET status = 'cancelled' WHERE id = ?`).bind(row.id).run();
      }),
    };
    const a = await approveVolunteer(sneaky, fx.wardId, v.id, fx.eqPres, NOW);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('cancelled');
    expect(a.messages.find((m) => m.kind === 'vol_approved')!.html).not.toContain('Door code 4242');
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
