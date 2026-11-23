import { describe, it, expect, vi } from 'vitest';
import { env, sentEmails, mockEmail } from './helpers';
import { sendInviteEmail } from '../src/lib/invites';

describe('sendInviteEmail', () => {
  it('invite email goes through the binding with an APP_URL link', async () => {
    const ok = await sendInviteEmail(env, { to: 'New@Example.test', wardName: 'M44 <b>', acceptUrl: env.APP_URL + '/invite/abc' });
    expect(ok).toBe(true);
    const sent = sentEmails();
    expect(sent).toHaveLength(1);
    const e = sent[0]!;
    expect(e.from.email).toBe('no-reply@send.wardforward.com');
    expect(e.to).toBe('new@example.test');
    expect(e.subject).toBe("You've been added to M44 <b> on WardForward");
    expect(e.html).toContain('http://localhost:8787/invite/abc');
    expect(e.html).not.toContain('<b>');
    expect(e.html).toContain('M44 &lt;b&gt;');
  });

  it('returns false when the binding throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEmail(() => {
      throw Object.assign(new Error('x'), { code: 'E_RECIPIENT_SUPPRESSED' });
    });
    expect(await sendInviteEmail(env, { to: 'a@example.test', wardName: 'W', acceptUrl: env.APP_URL + '/invite/x' })).toBe(false);
    vi.restoreAllMocks();
  });
});
