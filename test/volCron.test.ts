import { describe, it, expect } from 'vitest';
import { env, makeLeader, uniqueEmail, sentEmails, resetFetches } from './helpers';
import { fixture, tokenFrom, signupRows, type Fx } from './volFixtures';
import { submitSignup, verifyAddress } from '../src/lib/volSignup';
import { runVolunteerCron } from '../src/lib/volCron';
import worker from '../src/index';
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';

const at = (iso: string) => new Date(iso);

async function confirmedMember(fx: Fx, name = 'Rita Reminder', when = at('2026-11-21T18:00:00Z')) {
  const email = uniqueEmail('rem');
  await makeLeader(env, fx.wardId, { email, name });
  await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name, email, bringing: null, now: when });
  return email.toLowerCase();
}

function mailTo(email: string) {
  return sentEmails().filter((e) => e.to === email);
}

describe('runVolunteerCron', () => {
  it('reminds the day before at 9:00 ward time, once', async () => {
    const fx = await fixture(); // 2026-12-06 09:00, Denver
    const email = await confirmedMember(fx);
    await confirmedMember(fx, 'Other Helper');
    expect((await runVolunteerCron(env, at('2026-12-05T15:00:00Z'), { wardIds: [fx.wardId] })).reminders).toBe(0); // 08:00
    resetFetches();
    expect((await runVolunteerCron(env, at('2026-12-05T16:00:00Z'), { wardIds: [fx.wardId] })).reminders).toBe(2); // 09:00
    const mail = mailTo(email);
    expect(mail).toHaveLength(1);
    const html = mail[0]!.html;
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
    const nudgeMails = sentEmails().filter((e) => /still waiting for approval/.test(e.subject));
    expect(nudgeMails.map((e) => e.to).sort()).toEqual([fx.eqPresEmail, fx.counselorEmail].sort());
    expect(nudgeMails[0]!.html).toContain('Penny Pending');
    expect((await runVolunteerCron(env, at('2026-12-05T01:00:00Z'), only)).nudges).toBe(0);
  });

  it('cleans up old rate events and long-expired tokens', async () => {
    const fx = await fixture();
    await env.DB.prepare(`INSERT INTO vol_rate_events (id, ward_id, bucket, created_at) VALUES ('old-ev', ?, 'x', '2026-01-01T00:00:00.000Z')`).bind(fx.wardId).run();
    await runVolunteerCron(env, at('2026-12-05T00:00:00Z'), { wardIds: [fx.wardId] });
    expect(await env.DB.prepare(`SELECT 1 FROM vol_rate_events WHERE id = 'old-ev'`).first()).toBeNull();
  });
});

describe('runVolunteerCron on DST change days (Denver)', () => {
  it('fall back, 2026-11-01: the reminder for Nov 2 goes at 9:00 MST (16:00Z); Nov 1 lapses at midnight MST', async () => {
    const fx = await fixture({ date: '2026-11-02' });
    await confirmedMember(fx, 'Fall Back', at('2026-10-20T18:00:00Z'));
    const only = { wardIds: [fx.wardId] };
    expect((await runVolunteerCron(env, at('2026-11-01T15:00:00Z'), only)).reminders).toBe(0); // 08:00 MST
    expect((await runVolunteerCron(env, at('2026-11-01T16:00:00Z'), only)).reminders).toBe(1); // 09:00 MST
    const fx2 = await fixture({ date: '2026-11-01' });
    await submitSignup(env, { wardId: fx2.wardId, postId: fx2.postId, roleId: fx2.bigRoleId, name: 'W', email: uniqueEmail('w'), bringing: null, now: at('2026-10-20T18:00:00Z') });
    const only2 = { wardIds: [fx2.wardId] };
    expect((await runVolunteerCron(env, at('2026-11-02T06:30:00Z'), only2)).lapsed).toBe(0); // 23:30 MST Nov 1
    expect((await runVolunteerCron(env, at('2026-11-02T07:30:00Z'), only2)).lapsed).toBe(1); // 00:30 MST Nov 2
  });

  it('spring forward, 2027-03-14: the reminder for Mar 15 goes at 9:00 MDT (15:00Z); Mar 14 lapses at midnight MDT', async () => {
    const fx = await fixture({ date: '2027-03-15' });
    await confirmedMember(fx, 'Spring Forward', at('2027-03-01T18:00:00Z'));
    const only = { wardIds: [fx.wardId] };
    expect((await runVolunteerCron(env, at('2027-03-14T14:00:00Z'), only)).reminders).toBe(0); // 08:00 MDT
    expect((await runVolunteerCron(env, at('2027-03-14T15:00:00Z'), only)).reminders).toBe(1); // 09:00 MDT
    const fx2 = await fixture({ date: '2027-03-14' });
    await submitSignup(env, { wardId: fx2.wardId, postId: fx2.postId, roleId: fx2.bigRoleId, name: 'W', email: uniqueEmail('w'), bringing: null, now: at('2027-03-01T18:00:00Z') });
    const only2 = { wardIds: [fx2.wardId] };
    expect((await runVolunteerCron(env, at('2027-03-15T05:30:00Z'), only2)).lapsed).toBe(0); // 23:30 MDT Mar 14
    expect((await runVolunteerCron(env, at('2027-03-15T06:30:00Z'), only2)).lapsed).toBe(1); // 00:30 MDT Mar 15
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
