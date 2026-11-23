import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, sentEmails, resetFetches, uniqueEmail } from './helpers';
import { fixture, futureDate } from './volFixtures';
import { createInviteBatch, pumpInvitations, isSuppressed } from '../src/lib/invitations';
import { deliver } from '../src/lib/volMessages';
import { STREAM_FROM } from '../src/lib/mail';

function unsubPath(headers: Record<string, string> | undefined): string {
  const v = headers?.['List-Unsubscribe'] ?? '';
  return new URL(v.replace(/^</, '').replace(/>$/, '')).pathname;
}

describe('unsubscribe (RFC 8058 one-click)', () => {
  it('Review Focus 2: a mail client one-click POST suppresses; GET changes nothing; later pastes skip it; notify mail still goes', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const email = uniqueEmail('optout').toLowerCase();
    const first = await createInviteBatch(env, { wardId: fx.wardId, postId: fx.postId, byUserId: fx.eqPres, raw: email, note: null });
    await pumpInvitations(env, new Date(), { batchId: first.batchId, limit: 100 });
    const inv = sentEmails().find((e) => e.to === email)!;
    const path = unsubPath(inv.headers);
    expect(inv.html).toContain(path);

    // GET: a page with a button; nothing recorded.
    const page = await SELF.fetch(`http://localhost${path}`);
    expect(page.status).toBe(200);
    expect(page.headers.get('x-robots-tag')).toBe('noindex');
    expect(await page.text()).toContain('Stop service invitations from');
    expect(await isSuppressed(env, fx.wardId, email)).toBe(false);

    // The mail client's one-click POST: no cookie, no token, just the RFC 8058 body.
    const res = await SELF.fetch(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('won’t get service invitations from');
    expect(await isSuppressed(env, fx.wardId, email)).toBe(true);
    const stored = await env.DB.prepare(`SELECT email_hash FROM invite_suppressions WHERE ward_id = ?`).bind(fx.wardId).all<{ email_hash: string }>();
    expect(JSON.stringify(stored.results)).not.toContain(email);
    // Twice is fine.
    expect((await SELF.fetch(`http://localhost${path}`, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } })).status).toBe(200);

    // A later paste counts it as skipped and the pump never sends to it.
    const preview = await SELF.fetch(`http://localhost/w/${fx.wardId}/vol/${fx.postId}/invite/preview`, {
      method: 'POST',
      headers: { cookie: await asUser(fx.eqPres), 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ list: `${email}\nother-${email}` }).toString(),
    });
    const html = await preview.text();
    expect(html).toContain('Send 1 invitation');
    resetFetches();
    const second = await createInviteBatch(env, { wardId: fx.wardId, postId: fx.postId, byUserId: fx.eqPres, raw: `${email}\nother-${email}`, note: null });
    expect(second.suppressed).toBe(1);
    // Even a row that slipped in (suppressed after the batch was made) is skipped at send time.
    await env.DB.prepare(`INSERT INTO invite_recipients (id, ward_id, batch_id, email) VALUES ('ir_slip_' || hex(randomblob(4)), ?, ?, ?)`)
      .bind(fx.wardId, second.batchId, email)
      .run();
    await pumpInvitations(env, new Date(), { batchId: second.batchId, limit: 100 });
    const invitesTo = sentEmails().filter((e) => e.from.email === STREAM_FROM.invitations.email && e.to === email);
    expect(invitesTo).toHaveLength(0);

    // A reminder (notify stream) to that address still goes.
    await deliver(env, [{ kind: 'vol_reminder', to: email, subject: 'Reminder', html: '<p>See you tomorrow</p>' }]);
    expect(sentEmails().filter((e) => e.to === email && e.from.email === STREAM_FROM.notify.email)).toHaveLength(1);
  });

  it('a tampered or wrong-type token shows the invalid page and records nothing', async () => {
    const fx = await fixture({ date: futureDate(20) });
    const email = uniqueEmail('tamper').toLowerCase();
    const b = await createInviteBatch(env, { wardId: fx.wardId, postId: fx.postId, byUserId: fx.eqPres, raw: email, note: null });
    await pumpInvitations(env, new Date(), { batchId: b.batchId, limit: 100 });
    const path = unsubPath(sentEmails().find((e) => e.to === email)!.headers);
    const bad = path.slice(0, -3) + 'xyz';
    const g = await SELF.fetch(`http://localhost${bad}`);
    expect(g.status).toBe(400);
    const p = await SELF.fetch(`http://localhost${bad}`, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    expect(p.status).toBe(400);
    expect(await isSuppressed(env, fx.wardId, email)).toBe(false);
    const { makeLinkToken } = await import('../src/lib/volSession');
    const cancelTok = await makeLinkToken(env, { typ: 'vcan', wardId: fx.wardId, id: 'x' });
    expect((await SELF.fetch(`http://localhost/unsub/${cancelTok}`, { method: 'POST' })).status).toBe(400);
  });
});
