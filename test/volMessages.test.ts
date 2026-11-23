import { describe, it, expect, vi } from 'vitest';
import { env, sentEmails, mockEmail } from './helpers';
import { deliver, type OutgoingMessage } from '../src/lib/volMessages';
import * as E from '../src/lib/volEmails';

const post = { orgName: 'Elders Quorum', title: 'Help the Jensens move in', publicUrl: 'http://localhost:8787/v/abc' };

function msg(over: Partial<OutgoingMessage> = {}): OutgoingMessage {
  return { kind: 'vol_confirmed', to: 'a@example.test', subject: 'S', html: '<p>hi <a href="http://x/1">x</a></p>', ...over };
}

describe('deliver', () => {
  it('de-duplicates identical messages', async () => {
    await deliver(env, [msg(), msg()]);
    const sent = sentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.from).toEqual({ email: 'no-reply@send.wardforward.com', name: 'WardForward' });
    expect(sent[0]!.to).toBe('a@example.test');
    expect(sent[0]!.subject).toBe('S');
  });

  it('messages that share a subject but differ in body both go (two roles on one post)', async () => {
    await deliver(env, [msg({ html: '<p>Setup</p>' }), msg({ html: '<p>Teardown</p>' })]);
    expect(sentEmails()).toHaveLength(2);
  });

  it("with EMAIL_DELIVERY 'log' prints instead of sending", async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await deliver({ ...env, EMAIL_DELIVERY: 'log' }, [msg()]);
    expect(sentEmails()).toHaveLength(0);
    const out = log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(out).toContain('[dev email]');
    expect(out).toContain('a@example.test');
    expect(out).toContain('http://x/1');
    log.mockRestore();
  });

  it('a binding error does not throw', async () => {
    mockEmail(() => {
      throw Object.assign(new Error('boom'), { code: 'E_DELIVERY_FAILED' });
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(deliver(env, [msg()])).resolves.toBeUndefined();
    err.mockRestore();
  });

  it('a failed send is logged with ward, ref and kind', async () => {
    mockEmail(() => {
      throw Object.assign(new Error('boom'), { code: 'E_DELIVERY_FAILED' });
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await deliver(env, [msg({ wardId: 'w_9', ref: 'vs_9' })]);
    const lines = err.mock.calls.map((c) => c.join(' '));
    err.mockRestore();
    expect(lines.some((l) => l.includes('ward=w_9') && l.includes('ref=vs_9') && l.includes('kind=vol_confirmed'))).toBe(true);
  });

  it('an error without a code does not throw', async () => {
    mockEmail(() => {
      throw new Error('offline');
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(deliver(env, [msg()])).resolves.toBeUndefined();
    err.mockRestore();
  });

  it('one failed recipient does not stop the next', async () => {
    mockEmail((e) => {
      if (e.to === 'a@example.test') throw Object.assign(new Error('x'), { code: 'E_RECIPIENT_SUPPRESSED' });
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await deliver(env, [msg(), msg({ to: 'b@example.test' })]);
    err.mockRestore();
    expect(sentEmails().map((e) => e.to)).toEqual(['a@example.test', 'b@example.test']);
  });
});

describe('volEmails', () => {
  it('escapes user text', () => {
    const m = E.signupConfirmed({
      to: 'a@example.test',
      volunteerId: 'vv_1',
      wardId: 'w_1',
      name: '<script>alert(1)</script>',
      post: { ...post, title: 'Move <b>' },
      when: 'Sunday, Dec 6 · 9:00 AM',
      roleName: 'Movers',
      bringing: null,
      privateDetails: 'Door code <4242>',
      cancelUrl: 'http://localhost:8787/vol/cancel/t',
      mySignupsUrl: 'http://localhost:8787/vol/access/t',
      overLimit: false,
      withdrawUrl: null,
      otherPosts: [],
    });
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('Door code &lt;4242&gt;');
    expect(m.subject.startsWith('Elders Quorum:')).toBe(true);
    expect(m.discordText).toBeTruthy();
    expect(m.volunteerId).toBe('vv_1');
    expect(m.html).not.toContain('already met');
  });

  it('over the limit adds the withdraw paragraph; other ways to serve are listed', () => {
    const m = E.signupConfirmed({
      to: 'a@example.test', volunteerId: 'vv_1', wardId: 'w_1', name: 'Al', post, when: 'Sunday, Dec 6', roleName: 'Movers',
      bringing: 'a dolly', privateDetails: null, cancelUrl: 'http://c', mySignupsUrl: 'http://m',
      overLimit: true, withdrawUrl: 'http://localhost:8787/vol/withdraw/t',
      otherPosts: [{ orgName: 'Relief Society', title: 'Meals', confirmed: 1, needed: 3, publicUrl: 'http://localhost:8787/v/zzz' }],
    });
    expect(m.html).toContain('already met');
    expect(m.html).toContain('http://localhost:8787/vol/withdraw/t');
    expect(m.html).toContain('Other ways to serve');
    expect(m.html).toContain('1 of 3');
  });

  it('every builder returns a message with a kind, subject and html', () => {
    const all: OutgoingMessage[] = [
      E.verifyEmail({ to: 'a@x.test', name: 'A', post, verifyUrl: 'http://v' }),
      E.approved({ to: 'a@x.test', volunteerId: 'v', wardId: 'w', name: 'A', wardName: 'W', mySignupsUrl: 'http://m', signups: [] }),
      E.declined({ to: 'a@x.test', name: 'A', wardName: 'W' }),
      E.reminder({ to: 'a@x.test', volunteerId: 'v', wardId: 'w', name: 'A', post, when: 'w', roleName: 'r', bringing: null, privateDetails: 'p', otherNames: ['B'], cancelUrl: 'http://c', mySignupsUrl: 'http://m' }),
      E.roleChanged({ to: 'a@x.test', name: 'A', post, roleName: 'r', oldWhen: 'o', newWhen: 'n', mySignupsUrl: 'http://m' }),
      E.signupRemoved({ to: 'a@x.test', name: 'A', post, when: 'w', roleName: 'r', reason: 'removed' }),
      E.approverWaiting({ to: 'p@x.test', volunteerName: 'A', volunteerEmail: 'a@x.test', posts: [{ ...post, manageUrl: 'http://mg' }] }),
      E.approverNudge48h({ to: 'p@x.test', post, when: 'w', waitingNames: ['A'], manageUrl: 'http://mg' }),
      E.approverFilled({ to: 'p@x.test', post, manageUrl: 'http://mg' }),
      E.approverCancelled({ to: 'p@x.test', post, when: 'w', roleName: 'r', volunteerName: 'A', urgent: true, stillFull: false, confirmed: 1, needed: 2, manageUrl: 'http://mg' }),
      E.accessLink({ to: 'a@x.test', wardName: 'W', accessUrl: 'http://acc' }),
    ];
    for (const m of all) {
      expect(m.kind).toBeTruthy();
      expect(m.subject).toBeTruthy();
      expect(m.html).toContain('<');
      expect(m.html.toLowerCase()).not.toMatch(/church|latter-day|\blds\b/);
    }
    const cancelled = all[9]!;
    expect(cancelled.subject.toLowerCase()).toContain('short');
  });
});
