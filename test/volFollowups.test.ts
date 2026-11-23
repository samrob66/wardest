// Review round 4 follow-ups (2026-11-22): each pins one failure mode of the sign-up engine.
import { describe, it, expect, vi } from 'vitest';
import { env, makeLeader, uniqueEmail, sentEmails, barrierDb, interceptDb, gate } from './helpers';
import { NOW, fixture, signupRows, volunteerRow, tokenFrom } from './volFixtures';
import { submitSignup, verifyAddress, approveVolunteer } from '../src/lib/volSignup';
import { deliver } from '../src/lib/volMessages';
import type { Env } from '../src/types';

const later = (min: number) => new Date(NOW.getTime() + min * 60_000);

describe('follow-up 1: a failed "fully filled" build never costs the volunteer their confirmation', () => {
  it('the confirmation still goes, and one log line names the ward, the sign-up and the kind', async () => {
    const fx = await fixture();
    // Fill the 5-person role so the next sign-up (the 1-person role) fills the whole post.
    for (let i = 0; i < 5; i++) {
      const e = uniqueEmail(`fill${i}`);
      await makeLeader(env, fx.wardId, { email: e });
      await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'F', email: e, bringing: null, now: later(i) });
    }
    const last = uniqueEmail('last');
    await makeLeader(env, fx.wardId, { email: last });
    // The database step that builds the leaders' "fully filled" email fails.
    const broken: Env = { ...env, DB: interceptDb(env.DB, 'SET full_notified_at', { fail: true }) };
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await submitSignup(broken, {
      wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'Last', email: last, bringing: null, now: later(10),
    });
    const lines = err.mock.calls.map((c) => c.join(' '));
    err.mockRestore();

    expect(out.result).toBe('confirmed');
    const conf = out.messages.filter((m) => m.kind === 'vol_confirmed');
    expect(conf.map((m) => m.to)).toEqual([last.toLowerCase()]);
    expect(out.messages.filter((m) => m.kind === 'approver_filled')).toHaveLength(0);
    const row = (await signupRows(fx.wardId, fx.roleId)).find((r) => r.email === last.toLowerCase())!;
    expect(row.status).toBe('confirmed');
    const line = lines.find((l) => l.includes('fully filled'));
    expect(line, lines.join('\n')).toBeDefined();
    expect(line).toContain(`ward=${fx.wardId}`);
    expect(line).toContain(`signup=${row.id}`);
    expect(line).toContain('kind=approver_filled');

    // ...and it is actually delivered.
    await deliver(env, out.messages);
    expect(sentEmails().some((e) => e.to === last.toLowerCase())).toBe(true);
  });
});

describe('follow-up 1b: a failure AFTER the "notified" mark clears it, so a later sign-up retries', () => {
  it('confirmation still goes, the mark is cleared, and a later (late-approved) sign-up sends "fully filled"', async () => {
    const fx = await fixture();
    // Someone confirms their address while the 5-person role is open (waiting doesn't count).
    const waiter = uniqueEmail('waiter');
    const w = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'W', email: waiter, bringing: null, now: NOW });
    await verifyAddress(env, tokenFrom(w.messages[0], '/vol/verify/'), NOW);
    for (let i = 0; i < 5; i++) {
      const e = uniqueEmail(`fillb${i}`);
      await makeLeader(env, fx.wardId, { email: e });
      await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'F', email: e, bringing: null, now: later(i) });
    }
    // The sign-up that fills the post: reading the leaders' addresses fails AFTER the mark is set.
    const last = uniqueEmail('lastb');
    await makeLeader(env, fx.wardId, { email: last });
    const broken: Env = { ...env, DB: interceptDb(env.DB, 'SELECT LOWER(u.email) AS email FROM users u', { fail: true }) };
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await submitSignup(broken, {
      wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'Last', email: last, bringing: null, now: later(10),
    });
    const lines = err.mock.calls.map((c) => c.join(' '));
    err.mockRestore();
    expect(out.result).toBe('confirmed');
    expect(out.messages.filter((m) => m.kind === 'vol_confirmed').map((m) => m.to)).toEqual([last.toLowerCase()]);
    expect(out.messages.filter((m) => m.kind === 'approver_filled')).toHaveLength(0);
    expect(lines.some((l) => l.includes('fully filled') && l.includes(`ward=${fx.wardId}`) && l.includes('kind=approver_filled'))).toBe(true);
    // The mark is cleared, so it can be retried.
    const mark = await env.DB.prepare(`SELECT full_notified_at FROM vol_posts WHERE id = ?`).bind(fx.postId).first<{ full_notified_at: string | null }>();
    expect(mark!.full_notified_at).toBeNull();
    // A later sign-up that keeps the post full (the waiter, approved late, lands over the limit)
    // sends the leaders' "fully filled" email.
    const v = (await volunteerRow(fx.wardId, waiter))!;
    const a = await approveVolunteer(env, fx.wardId, v.id, fx.eqPres, later(20));
    const filled = a.messages.filter((m) => m.kind === 'approver_filled');
    expect(filled.map((m) => m.to).sort()).toEqual([fx.eqPresEmail, fx.counselorEmail].sort());
  });
});

describe('follow-up 2: two near-simultaneous first sign-ups from the same new ward member', () => {
  it('never tell the approvers "waiting for approval"; both count', async () => {
    const fx = await fixture();
    const email = uniqueEmail('newmember');
    await makeLeader(env, fx.wardId, { email, name: 'New Member' });

    // Force the bad interleaving: B reads the volunteer as not yet approved, then A approves it,
    // then B's own approval write lands, then A re-reads the volunteer.
    const bRead = gate(); // B has read the volunteer and is about to write
    const aReload = gate(); // A is about to re-read the volunteer
    const bWrote = gate(); // B's approval write is done
    const aDb = interceptDb(
      interceptDb(env.DB, 'UPDATE volunteers SET approval', { before: () => bRead.promise }),
      'SELECT * FROM volunteers WHERE id = ?',
      {
        before: async () => {
          aReload.open();
          await Promise.race([bWrote.promise, new Promise((r) => setTimeout(r, 500))]);
        },
      },
    );
    const bDb = interceptDb(env.DB, 'UPDATE volunteers SET approval', {
      before: async () => {
        bRead.open();
        await Promise.race([aReload.promise, new Promise((r) => setTimeout(r, 500))]);
      },
      after: () => bWrote.open(),
    });
    const sub = (db: D1Database, roleId: string) =>
      submitSignup({ ...env, DB: db }, { wardId: fx.wardId, postId: fx.postId, roleId, name: 'New Member', email, bringing: null, now: NOW });
    const [a, b] = await Promise.all([sub(aDb, fx.roleId), sub(bDb, fx.bigRoleId)]);

    const kinds = [...a.messages, ...b.messages].map((m) => m.kind);
    expect(kinds).not.toContain('approver_waiting');
    expect(kinds).not.toContain('vol_waiting');
    expect(a.result).toBe('confirmed');
    expect(b.result).toBe('confirmed');
    expect(kinds.filter((k) => k === 'vol_confirmed')).toHaveLength(2);
    expect((await volunteerRow(fx.wardId, email))!.approval).toBe('approved');
    const rows = [...(await signupRows(fx.wardId, fx.roleId)), ...(await signupRows(fx.wardId, fx.bigRoleId))];
    expect(rows.map((r) => r.status).sort()).toEqual(['confirmed', 'confirmed']);
  });
});

describe('follow-up 3: a double click from an approved address', () => {
  it('makes one sign-up, counts it once, and sends one confirmation', async () => {
    const fx = await fixture();
    const email = uniqueEmail('dblclick');
    await makeLeader(env, fx.wardId, { email });
    await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.roleId, name: 'D', email, bringing: null, now: NOW });
    // Both requests pass the "already on this role?" check before either inserts (batch path).
    const raceDb = barrierDb(env.DB, 'INSERT INTO vol_signups', 2);
    const sub = () =>
      submitSignup({ ...env, DB: raceDb }, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'D', email, bringing: null, now: later(1) });
    const res = await Promise.all([sub(), sub()]);
    expect(res.map((r) => r.result).sort()).toEqual(['already_signed', 'confirmed']);
    const msgs = res.flatMap((r) => r.messages);
    expect(msgs.filter((m) => m.kind === 'vol_confirmed')).toHaveLength(1);
    expect(msgs.filter((m) => m.kind === 'vol_already')).toHaveLength(0);
    expect(msgs.filter((m) => m.kind === 'approver_waiting' || m.kind === 'vol_waiting')).toHaveLength(0);
    const rows = (await signupRows(fx.wardId, fx.bigRoleId)).filter((r) => r.email === email.toLowerCase());
    expect(rows.map((r) => [r.status, r.over_limit])).toEqual([['confirmed', 0]]);
    const { getPost } = await import('../src/lib/volPosts');
    const p = (await getPost(env, fx.wardId, fx.postId))!;
    expect(p.dates[0]!.roles.find((r) => r.id === fx.bigRoleId)!.confirmed).toBe(1);
  });
});
