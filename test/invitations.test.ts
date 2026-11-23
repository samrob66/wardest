import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, barrierDb, sentEmails, resetFetches, uniqueEmail, settle } from './helpers';
import { fixture, futureDate, type Fx } from './volFixtures';
import { createInviteBatch, pumpInvitations, suppressAddress } from '../src/lib/invitations';
import { STREAM_FROM } from '../src/lib/mail';
import type { Env } from '../src/types';

function form(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

async function post(uid: string, path: string, data: Record<string, string> = {}) {
  return SELF.fetch(`http://localhost${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: await asUser(uid), 'content-type': 'application/x-www-form-urlencoded' },
    body: form(data),
  });
}

async function get(uid: string, path: string) {
  return SELF.fetch(`http://localhost${path}`, { redirect: 'manual', headers: { cookie: await asUser(uid) } });
}

function addresses(n: number, tag = 'inv'): string[] {
  const t = Math.random().toString(36).slice(2, 8);
  return Array.from({ length: n }, (_, i) => `${tag}${i}-${t}@example.test`);
}

async function batchRow(id: string) {
  return env.DB.prepare(`SELECT * FROM invite_batches WHERE id = ?`).bind(id).first<{
    status: string; sent: number; failed: number; total: number; suppressed_count: number; cap_notified_at: string | null;
  }>();
}

async function recipientCount(batchId: string): Promise<number> {
  return (await env.DB.prepare(`SELECT COUNT(*) AS n FROM invite_recipients WHERE batch_id = ?`).bind(batchId).first<{ n: number }>())!.n;
}

function invitations() {
  return sentEmails().filter((e) => e.from.email === STREAM_FROM.invitations.email);
}

async function newBatch(fx: Fx, list: string[], note: string | null = null): Promise<string> {
  const r = await createInviteBatch(env, { wardId: fx.wardId, postId: fx.postId, byUserId: fx.eqPres, raw: list.join('\n'), note });
  return r.batchId;
}

describe('bulk invitations: routes', () => {
  it('a non-editor gets 403 on every invite route', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const { makeLeader } = await import('./helpers');
    const teacher = await makeLeader(env, fx.wardId, { email: uniqueEmail('teacher'), spaces: [['elders-quorum', 'member']] });
    const base = `/w/${fx.wardId}/vol/${fx.postId}/invite`;
    const batchId = await newBatch(fx, addresses(2));
    expect((await get(teacher, base)).status).toBe(403);
    expect((await post(teacher, `${base}/preview`, { list: 'a@example.test' })).status).toBe(403);
    expect((await post(teacher, `${base}/send`, { list: 'a@example.test' })).status).toBe(403);
    expect((await post(teacher, `${base}/test`, { list: 'a@example.test' })).status).toBe(403);
    expect((await get(teacher, `${base}/${batchId}`)).status).toBe(403);
    expect((await get(fx.eqPres, base)).status).toBe(200);
    expect(await (await get(fx.eqPres, `/w/${fx.wardId}/vol/${fx.postId}`)).text()).toContain(`${base}"`);
    expect(await (await get(teacher, `/w/${fx.wardId}/vol/${fx.postId}`)).text()).not.toContain(`${base}"`);
  });

  it('preview: counts valid, lists invalid lines, counts unsubscribed as skipped; 10,001 -> error', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const [a, b, gone] = addresses(3);
    await suppressAddress(env, fx.wardId, gone!);
    const res = await post(fx.eqPres, `/w/${fx.wardId}/vol/${fx.postId}/invite/preview`, {
      list: `${a}, ${b}; ${gone!.toUpperCase()}\nnope-not-email`, note: 'Bring gloves',
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Send 2 invitations');
    expect(html).toContain('nope-not-email');
    expect(html).toMatch(/1 (address|person) .*unsubscribed|1 skipped/i);
    const big = await post(fx.eqPres, `/w/${fx.wardId}/vol/${fx.postId}/invite/preview`, { list: addresses(10_001).join('\n') });
    expect(big.status).toBe(400);
    expect(await big.text()).toContain('10,000');
  });

  it('send: creates the batch, kicks the first chunk, shows progress; a test goes only to me', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const list = addresses(3);
    const t = await post(fx.eqPres, `/w/${fx.wardId}/vol/${fx.postId}/invite/test`, { list: list.join('\n'), note: 'Hi all' });
    expect(t.status).toBe(200);
    const tests = invitations();
    expect(tests.map((e) => e.to)).toEqual([fx.eqPresEmail]);
    expect(tests[0]!.subject).toContain('[Test]');
    resetFetches();
    const res = await post(fx.eqPres, `/w/${fx.wardId}/vol/${fx.postId}/invite/send`, { list: list.join('\n'), note: 'Hi all' });
    expect(res.status).toBe(302);
    const loc = res.headers.get('location')!;
    expect(loc).toMatch(new RegExp(`/w/${fx.wardId}/vol/${fx.postId}/invite/[^/]+$`));
    await settle();
    expect(invitations().map((e) => e.to).sort()).toEqual([...list].sort());
    const page = await (await get(fx.eqPres, new URL(loc, 'http://localhost').pathname)).text();
    expect(page).toMatch(/3 of 3 sent/);
  });
});

// The volume test sends 2,000 invitations because the spec requires that volume (2,000 from
// one paste), and that is ~2,300 D1 statements and 2,000 sends: 0.9 s with its file running
// alone, 2.3-3.1 s inside a full run, and 3.3 s to over 5 s with a second suite running at the
// same time (it timed out in 13 of 24 such runs at vitest's default 5 s, which was never chosen
// for it). 20 s keeps the full 2,000 with room for a loaded machine.
const VOLUME_TEST_TIMEOUT_MS = 20_000;

describe('bulk invitations: the pump', () => {
  it('a 2,000-address batch completes across several pump calls, each address mailed exactly once', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const list = addresses(2000, 'big');
    const batchId = await newBatch(fx, list, 'Thanks <b>so</b> much');
    let calls = 0;
    while ((await batchRow(batchId))!.status === 'sending' && calls < 20) {
      await pumpInvitations(env, new Date(), { limit: 400 });
      calls++;
    }
    expect(calls).toBeGreaterThan(1);
    const sent = invitations().filter((e) => e.to.startsWith('big'));
    expect(sent).toHaveLength(2000);
    expect(new Set(sent.map((e) => e.to)).size).toBe(2000);
    for (const e of sent.slice(0, 50)) {
      expect(typeof e.to).toBe('string');
      expect(e.headers!['List-Unsubscribe']).toMatch(/^<http:\/\/localhost:8787\/unsub\/[^>]+>$/);
      expect(e.headers!['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      expect(e.subject).toBe('Service opportunity: Help the Jensens move in');
      expect(e.html).toContain('Thanks &lt;b&gt;so&lt;/b&gt; much');
      expect(e.html).toContain('/v/');
      expect(e.html).toContain('Stop service invitations from');
    }
    const b = (await batchRow(batchId))!;
    expect(b.status).toBe('done');
    expect(b.sent).toBe(2000);
    expect(await recipientCount(batchId)).toBe(0);
  }, VOLUME_TEST_TIMEOUT_MS);

  it('Review Focus 4: two overlapping pumps on one batch send each address once; counts add up', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const list = addresses(150, 'race');
    const batchId = await newBatch(fx, list);
    const raced = { ...env, DB: barrierDb(env.DB, 'SET claim_id', 2) } as Env;
    const [a, b] = await Promise.all([
      pumpInvitations(raced, new Date(), { batchId, limit: 100 }),
      pumpInvitations(raced, new Date(), { batchId, limit: 100 }),
    ]);
    expect(a.sent + b.sent).toBe(150);
    const sent = invitations().filter((e) => e.to.startsWith('race'));
    expect(sent).toHaveLength(150);
    expect(new Set(sent.map((e) => e.to)).size).toBe(150);
    const row = (await batchRow(batchId))!;
    expect(row.sent + row.failed).toBe(row.total);
    expect(row.status).toBe('done');
  });

  it('daily cap 50 with 120 addresses: 50 sent, waiting_cap, one cap email; resumes the next ward-local day', async () => {
    const fx = await fixture({ date: futureDate(20) });
    await env.DB.prepare(`UPDATE wards SET invite_daily_cap = 50 WHERE id = ?`).bind(fx.wardId).run();
    const batchId = await newBatch(fx, addresses(120, 'cap'));
    const day1 = new Date('2026-11-23T18:00:00Z'); // Monday 11:00 in Denver
    await pumpInvitations(env, day1, { limit: 400 });
    expect(invitations().filter((e) => e.to.startsWith('cap'))).toHaveLength(50);
    let row = (await batchRow(batchId))!;
    expect(row.status).toBe('waiting_cap');
    const capMail = sentEmails().filter((e) => e.to === fx.eqPresEmail && /safety limit/i.test(e.html));
    expect(capMail).toHaveLength(1);
    // Later the same ward-local day (23:30 Denver = 06:30Z next day): nothing more, no second email.
    await pumpInvitations(env, new Date('2026-11-24T06:30:00Z'), { limit: 400 });
    expect(invitations().filter((e) => e.to.startsWith('cap'))).toHaveLength(50);
    expect(sentEmails().filter((e) => e.to === fx.eqPresEmail && /safety limit/i.test(e.html))).toHaveLength(1);
    // The next ward-local day: 50 more.
    await pumpInvitations(env, new Date('2026-11-24T08:00:00Z'), { limit: 400 });
    expect(invitations().filter((e) => e.to.startsWith('cap'))).toHaveLength(100);
    await pumpInvitations(env, new Date('2026-11-25T18:00:00Z'), { limit: 400 });
    row = (await batchRow(batchId))!;
    expect(row.status).toBe('done');
    expect(row.sent).toBe(120);
  });

  it('a batch whose post was deleted is cancelled and its addresses deleted', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const batchId = await newBatch(fx, addresses(5, 'del'));
    await env.DB.prepare(`DELETE FROM vol_posts WHERE id = ?`).bind(fx.postId).run();
    await pumpInvitations(env, new Date(), { limit: 400 });
    expect((await batchRow(batchId))!.status).toBe('cancelled');
    expect(await recipientCount(batchId)).toBe(0);
    expect(invitations().filter((e) => e.to.startsWith('del'))).toHaveLength(0);
  });

  it('the minute cron pumps; the hourly cron does not', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const batchId = await newBatch(fx, addresses(3, 'cron'));
    const { createExecutionContext, createScheduledController, waitOnExecutionContext } = await import('cloudflare:test');
    const worker = (await import('../src/index')).default;
    const hourly = createExecutionContext();
    await worker.scheduled!(createScheduledController({ scheduledTime: new Date(), cron: '0 * * * *' }), env, hourly);
    await waitOnExecutionContext(hourly);
    expect((await batchRow(batchId))!.status).toBe('sending');
    const minute = createExecutionContext();
    await worker.scheduled!(createScheduledController({ scheduledTime: new Date(), cron: '* * * * *' }), env, minute);
    await waitOnExecutionContext(minute);
    expect((await batchRow(batchId))!.status).toBe('done');
  });
});

describe('operator: invitation limits and batches', () => {
  it('the operator sets a ward cap and sees the batches table; others get 403', async () => {
    const fx = await fixture({ date: futureDate(20) });
    await newBatch(fx, addresses(2, 'op'));
    const op = (await import('./helpers')).ensureUser(env, 'operator-x@example.test', 'Op');
    const opId = await op;
    const mutable = env as unknown as { OPERATOR_EMAILS: string };
    mutable.OPERATOR_EMAILS = 'operator-x@example.test';
    try {
      const page = await (await get(opId, '/operator')).text();
      expect(page).toContain('Invitation batches');
      expect(page).toContain('Help the Jensens move in');
      expect(page).toContain(`/operator/wards/${fx.wardId}/invite-cap`);
      expect((await post(opId, `/operator/wards/${fx.wardId}/invite-cap`, { invite_daily_cap: '1234' })).status).toBe(302);
      const w = await env.DB.prepare(`SELECT invite_daily_cap FROM wards WHERE id = ?`).bind(fx.wardId).first<{ invite_daily_cap: number }>();
      expect(w!.invite_daily_cap).toBe(1234);
      expect((await post(opId, `/operator/wards/${fx.wardId}/invite-cap`, { invite_daily_cap: '-5' })).headers.get('location')).toContain('err=');
      expect((await post(fx.eqPres, `/operator/wards/${fx.wardId}/invite-cap`, { invite_daily_cap: '9' })).status).toBe(403);
    } finally {
      mutable.OPERATOR_EMAILS = '';
    }
  });
});

describe('bulk invitations: send errors', () => {
  async function recipient(batchId: string, email: string) {
    return env.DB.prepare(`SELECT * FROM invite_recipients WHERE batch_id = ? AND email = ?`).bind(batchId, email).first<{
      claim_id: string | null; sent_at: string | null; failed: number; attempts: number;
    }>();
  }

  it('a retryable error releases the claim and retries in later runs, failing after 3 attempts', async () => {
    const { mailRetry } = await import('../src/lib/mail');
    const { mockEmail } = await import('./helpers');
    const real = mailRetry.sleep;
    mailRetry.sleep = async () => {};
    try {
      const fx = await fixture({ date: futureDate(20) });
      const [ok, flaky] = addresses(2, 'retry');
      const batchId = await newBatch(fx, [ok!, flaky!]);
      mockEmail((e) => {
        if (e.to === flaky) throw Object.assign(new Error('slow down'), { code: 'E_RATE_LIMIT_EXCEEDED' });
      });
      await pumpInvitations(env, new Date(), { batchId, limit: 100 });
      let r = (await recipient(batchId, flaky!))!;
      expect(r).toMatchObject({ claim_id: null, sent_at: null, failed: 0, attempts: 1 });
      expect((await batchRow(batchId))!.status).toBe('sending');
      expect((await batchRow(batchId))!.failed).toBe(0);
      await pumpInvitations(env, new Date(), { batchId, limit: 100 });
      r = (await recipient(batchId, flaky!))!;
      expect(r.attempts).toBe(2);
      expect(r.failed).toBe(0);
      await pumpInvitations(env, new Date(), { batchId, limit: 100 });
      const b = (await batchRow(batchId))!;
      expect(b.status).toBe('done');
      expect(b.sent).toBe(1);
      expect(b.failed).toBe(1);
    } finally {
      mailRetry.sleep = real;
    }
  });

  it('a non-retryable error fails at once', async () => {
    const { mockEmail } = await import('./helpers');
    const fx = await fixture({ date: futureDate(20) });
    const [bad] = addresses(1, 'perm');
    const batchId = await newBatch(fx, [bad!]);
    mockEmail(() => {
      throw Object.assign(new Error('suppressed'), { code: 'E_RECIPIENT_SUPPRESSED' });
    });
    await pumpInvitations(env, new Date(), { batchId, limit: 100 });
    const b = (await batchRow(batchId))!;
    expect(b.status).toBe('done');
    expect(b.failed).toBe(1);
  });

  it('results are written back per group, so a cut-off run never re-sends what already went', async () => {
    const { mockEmail } = await import('./helpers');
    const fx = await fixture({ date: futureDate(20) });
    const batchId = await newBatch(fx, addresses(30, 'grp'));
    const seenSentWhenSending: number[] = [];
    let n = 0;
    mockEmail(async () => {
      n++;
      if (n === 25) {
        const row = await env.DB.prepare(`SELECT COUNT(*) AS k FROM invite_recipients WHERE batch_id = ? AND sent_at IS NOT NULL`)
          .bind(batchId)
          .first<{ k: number }>();
        seenSentWhenSending.push(row!.k);
      }
    });
    await pumpInvitations(env, new Date(), { batchId, limit: 100 });
    // By the 25th send, the first two groups of 10 were already recorded as sent.
    expect(seenSentWhenSending[0]).toBeGreaterThanOrEqual(20);
    expect((await batchRow(batchId))!.sent).toBe(30);
  });
});
