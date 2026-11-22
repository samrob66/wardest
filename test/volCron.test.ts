import { describe, it, expect } from 'vitest';
import { env, makeLeader, uniqueEmail, sentFetches, resetFetches } from './helpers';
import { fixture, tokenFrom, signupRows, type Fx } from './volFixtures';
import { submitSignup, verifyAddress } from '../src/lib/volSignup';
import { runVolunteerCron } from '../src/lib/volCron';
import worker from '../src/index';
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';

const at = (iso: string) => new Date(iso);

async function confirmedMember(fx: Fx, name = 'Rita Reminder') {
  const email = uniqueEmail('rem');
  await makeLeader(env, fx.wardId, { email, name });
  await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name, email, bringing: null, now: at('2026-11-21T18:00:00Z') });
  return email.toLowerCase();
}

function resendTo(email: string) {
  return sentFetches().filter((f) => f.url.startsWith('https://api.resend.com') && (f.body as { to: string[] }).to[0] === email);
}

describe('runVolunteerCron', () => {
  it('reminds the day before at 9:00 ward time, once', async () => {
    const fx = await fixture(); // 2026-12-06 09:00, Denver
    const email = await confirmedMember(fx);
    await confirmedMember(fx, 'Other Helper');
    expect((await runVolunteerCron(env, at('2026-12-05T15:00:00Z'), { wardIds: [fx.wardId] })).reminders).toBe(0); // 08:00
    resetFetches();
    expect((await runVolunteerCron(env, at('2026-12-05T16:00:00Z'), { wardIds: [fx.wardId] })).reminders).toBe(2); // 09:00
    const mail = resendTo(email);
    expect(mail).toHaveLength(1);
    const html = (mail[0]!.body as { html: string }).html;
    expect(html).toContain('Door code 4242');
    expect(html).toContain('Other Helper');
    expect(html).toContain('/vol/cancel/');
    expect((await runVolunteerCron(env, at('2026-12-05T17:00:00Z'), { wardIds: [fx.wardId] })).reminders).toBe(0);
  });

  it('a New York ward gets its reminder at 14:00Z (9:00 EST)', async () => {
    const fx = await fixture({ timezone: 'America/New_York' });
    await confirmedMember(fx);
    expect((await runVolunteerCron(env, at('2026-12-05T13:00:00Z'), { wardIds: [fx.wardId] })).reminders).toBe(0);
    expect((await runVolunteerCron(env, at('2026-12-05T14:00:00Z'), { wardIds: [fx.wardId] })).reminders).toBe(1);
  });

  it('waiting sign-ups lapse only once the date is over', async () => {
    const fx = await fixture();
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'W', email: uniqueEmail('w'), bringing: null, now: at('2026-11-21T18:00:00Z') });
    expect(s.result).toBe('waiting_verify');
    expect((await runVolunteerCron(env, at('2026-12-07T06:30:00Z'), { wardIds: [fx.wardId] })).lapsed).toBe(0); // 23:30 on the 6th
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('waiting');
    expect((await runVolunteerCron(env, at('2026-12-07T07:30:00Z'), { wardIds: [fx.wardId] })).lapsed).toBe(1);
    expect((await signupRows(fx.wardId, fx.bigRoleId))[0]!.status).toBe('lapsed');
  });

  it('48h nudge: once, for a verified volunteer still waiting for approval; not for an unverified one', async () => {
    const fx = await fixture(); // starts 2026-12-06T16:00Z
    const unverified = await fixture();
    await submitSignup(env, { wardId: unverified.wardId, postId: unverified.postId, roleId: unverified.bigRoleId, name: 'U', email: uniqueEmail('u'), bringing: null, now: at('2026-11-21T18:00:00Z') });
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Penny Pending', email: uniqueEmail('p'), bringing: null, now: at('2026-11-21T18:00:00Z') });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), at('2026-11-21T18:05:00Z'));
    const only = { wardIds: [fx.wardId, unverified.wardId] };
    expect((await runVolunteerCron(env, at('2026-12-04T12:00:00Z'), only)).nudges).toBe(0); // 52h out
    resetFetches();
    const r = await runVolunteerCron(env, at('2026-12-05T00:00:00Z'), only); // 40h out
    expect(r.nudges).toBe(1);
    const nudgeMails = sentFetches().filter((f) => /still waiting for approval/.test((f.body as { subject?: string }).subject ?? ''));
    expect(nudgeMails.map((f) => (f.body as { to: string[] }).to[0]).sort()).toEqual([fx.eqPresEmail, fx.counselorEmail].sort());
    expect((nudgeMails[0]!.body as { html: string }).html).toContain('Penny Pending');
    expect((await runVolunteerCron(env, at('2026-12-05T01:00:00Z'), only)).nudges).toBe(0);
  });

  it('cleans up old rate events and long-expired tokens', async () => {
    const fx = await fixture();
    await env.DB.prepare(`INSERT INTO vol_rate_events (id, ward_id, bucket, created_at) VALUES ('old-ev', ?, 'x', '2026-01-01T00:00:00.000Z')`).bind(fx.wardId).run();
    await runVolunteerCron(env, at('2026-12-05T00:00:00Z'), { wardIds: [fx.wardId] });
    expect(await env.DB.prepare(`SELECT 1 FROM vol_rate_events WHERE id = 'old-ev'`).first()).toBeNull();
  });
});

describe('scheduled handler', () => {
  it('runs the volunteer cron', async () => {
    const ctrl = createScheduledController({ scheduledTime: at('2026-12-05T16:00:00Z'), cron: '0 * * * *' });
    const ctx = createExecutionContext();
    await worker.scheduled!(ctrl, env, ctx);
    await waitOnExecutionContext(ctx);
  });
});
