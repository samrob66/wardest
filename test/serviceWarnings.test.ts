import { describe, it, expect } from 'vitest';
import { env, makeLeader, uniqueEmail, sentEmails, resetFetches } from './helpers';
import { NOW, fixture, catId, type Fx } from './volFixtures';
import { runVolunteerCron } from '../src/lib/volCron';
import { warningsFor } from '../src/lib/serviceWarnings';
import { deleteRole } from '../src/lib/volPosts';
import { submitSignup } from '../src/lib/volSignup';
import { addDelegate } from './serviceCast';
import { setWarnPref } from '../src/lib/serviceAdmin';

const at = (iso: string) => new Date(iso);
// The fixture's date: 2026-12-06 09:00 in the ward's zone (Denver: 16:00Z; New York: 14:00Z).
const START_DENVER = at('2026-12-06T16:00:00Z').getTime();
const hoursBefore = (h: number, start = START_DENVER) => new Date(start - h * 3_600_000);

async function delegate(fx: Fx): Promise<string> {
  const email = uniqueEmail('coord');
  const uid = await makeLeader(env, fx.wardId, { email, name: 'Coord' });
  await addDelegate(fx.wardId, await catId(fx.wardId, 'move'), uid, fx.eqPres);
  return email.toLowerCase();
}

function warnings() {
  return sentEmails().filter((e) => /may not fill/i.test(e.subject));
}

describe('fill warnings (hourly cron)', () => {
  it('a short date 47h out with no prefs: the delegate is warned once', async () => {
    const fx = await fixture();
    const coord = await delegate(fx);
    expect((await runVolunteerCron(env, hoursBefore(49), { wardIds: [fx.wardId] })).warnings).toBe(0);
    resetFetches();
    const r = await runVolunteerCron(env, hoursBefore(47), { wardIds: [fx.wardId] });
    expect(r.warnings).toBe(1);
    const w = warnings();
    expect(w.map((e) => e.to)).toEqual([coord]);
    expect(w[0]!.html).toContain('Help the Jensens move in');
    expect(w[0]!.html).toContain('Truck driver: 0 of 1 (1 short)');
    expect(w[0]!.html).toContain('Movers: 0 of 5 (5 short)');
    expect(w[0]!.html).toContain(`/w/${fx.wardId}/vol/${fx.postId}`);
    resetFetches();
    expect((await runVolunteerCron(env, hoursBefore(46), { wardIds: [fx.wardId] })).warnings).toBe(0);
    expect(warnings()).toHaveLength(0);
  });

  it('a full date warns no one', async () => {
    const fx = await fixture();
    await delegate(fx);
    await deleteRole(env, fx.wardId, fx.bigRoleId, NOW);
    const email = uniqueEmail('member');
    await makeLeader(env, fx.wardId, { email, name: 'Mo Member' });
    expect((await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'Mo', email, bringing: null, now: NOW })).result).toBe('confirmed');
    expect(await warningsFor(env, { id: fx.wardId, timezone: 'America/Denver' }, hoursBefore(47))).toEqual([]);
  });

  it('a manager with warn me off but an "other" listed: only the other is warned', async () => {
    const fx = await fixture();
    const otherEmail = uniqueEmail('other');
    const other = await makeLeader(env, fx.wardId, { email: otherEmail, name: 'Other' });
    await setWarnPref(env, fx.wardId, await catId(fx.wardId, 'move'), fx.eqPres, { warnMe: false, hours: '48', others: [other] });
    const msgs = await warningsFor(env, { id: fx.wardId, timezone: 'America/Denver' }, hoursBefore(47));
    expect(msgs.map((m) => m.to)).toEqual([otherEmail.toLowerCase()]);
  });

  it('hours 72: warned at 71h, not at 73h; delegates use the largest hours among the prefs', async () => {
    const fx = await fixture();
    await setWarnPref(env, fx.wardId, await catId(fx.wardId, 'move'), fx.eqPres, { warnMe: true, hours: '72', others: [] });
    const coord = await delegate(fx);
    const ward = { id: fx.wardId, timezone: 'America/Denver' };
    expect(await warningsFor(env, ward, hoursBefore(73))).toEqual([]);
    const msgs = await warningsFor(env, ward, hoursBefore(71));
    expect(msgs.map((m) => m.to).sort()).toEqual([fx.eqPresEmail, coord].sort());
  });

  it('a date that has already started warns no one', async () => {
    const fx = await fixture();
    await delegate(fx);
    expect(await warningsFor(env, { id: fx.wardId, timezone: 'America/Denver' }, hoursBefore(-1))).toEqual([]);
  });

  it("uses the ward's time zone (New York vs Denver)", async () => {
    const ny = await fixture({ timezone: 'America/New_York' });
    const den = await fixture();
    await delegate(ny);
    await delegate(den);
    const instant = hoursBefore(47, at('2026-12-06T14:00:00Z').getTime()); // 47h before 09:00 in New York
    expect(await warningsFor(env, { id: ny.wardId, timezone: 'America/New_York' }, instant)).toHaveLength(1);
    expect(await warningsFor(env, { id: den.wardId, timezone: 'America/Denver' }, instant)).toHaveLength(0); // 49h out there
  });

  it('a delegate who left the ward is not warned', async () => {
    const fx = await fixture();
    const email = uniqueEmail('gone');
    const uid = await makeLeader(env, fx.wardId, { email, name: 'Gone' });
    await addDelegate(fx.wardId, await catId(fx.wardId, 'move'), uid);
    await env.DB.prepare(`DELETE FROM ward_memberships WHERE ward_id = ? AND user_id = ?`).bind(fx.wardId, uid).run();
    expect(await warningsFor(env, { id: fx.wardId, timezone: 'America/Denver' }, hoursBefore(47))).toEqual([]);
  });
});
