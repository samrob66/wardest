import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, sentEmails, resetFetches, uniqueEmail, asUser } from './helpers';
import { makeServiceCast, type ServiceCast } from './serviceCast';

function form(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

let ipN = 0;
async function submit(prefix: string, slug: string, data: Record<string, string>, ip?: string) {
  return SELF.fetch(`http://localhost/help/${prefix}/${slug}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': ip ?? `198.51.100.${++ipN % 250}` },
    body: form({ 'cf-turnstile-response': 'ok', ...data }),
  });
}

function verifyPath(html: string): string {
  const m = html.match(/href="(http[^"]*\/help\/verify\/[^"]+)"/);
  if (!m) throw new Error('no verify link');
  return new URL(m[1]!.replace(/&amp;/g, '&')).pathname;
}

async function lastRequest(wardId: string) {
  return env.DB.prepare(`SELECT * FROM service_requests WHERE ward_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`)
    .bind(wardId)
    .first<Record<string, unknown>>();
}

describe('public help page /help/:prefix', () => {
  let c: ServiceCast;
  beforeAll(async () => {
    c = await makeServiceCast();
  });

  it('lists the 3 default request tiles and no archived ones; noindex; QR + link', async () => {
    await env.DB.prepare(
      `INSERT INTO service_categories (id, ward_id, kind, slug, name, icon, archived, position) VALUES (?, ?, 'request', 'req-old', 'Old Archived Thing', 'other', 1, 99)`,
    )
      .bind('scat_old_' + c.wardId, c.wardId)
      .run();
    const res = await SELF.fetch(`http://localhost/help/${c.prefix}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    const html = await res.text();
    expect(html).toContain('Request Help or Service');
    for (const name of ['Get Help Moving', 'Request a Christmas or Presents', 'Other Requests']) expect(html).toContain(name);
    expect(html).toContain(`/help/${c.prefix}/req-moving`);
    expect(html).not.toContain('Old Archived Thing');
    expect(html).not.toContain('Provide a Meal'); // opportunities are not requests
    expect(html).toContain(`localhost:8787/help/${c.prefix}`);
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it('each form says who will see it', async () => {
    const xmas = await (await SELF.fetch(`http://localhost/help/${c.prefix}/req-christmas`)).text();
    expect(xmas).toContain('Only the bishop and the people he asks to help will see this.');
    expect(xmas).toContain('For my family');
    const moving = await (await SELF.fetch(`http://localhost/help/${c.prefix}/req-moving`)).text();
    expect(moving).toContain('Only the Elders Quorum leaders, the bishopric and the people they ask to help will see this.');
    expect(moving).toContain('name="moving_dir"');
    expect(moving).toContain('We’ll talk through the details with you in person.');
    expect((await SELF.fetch(`http://localhost/help/${c.prefix}/meal`)).status).toBe(404);
    expect((await SELF.fetch(`http://localhost/help/${c.prefix}/nope`)).status).toBe(404);
  });

  it('validation: Christmas without "for" -> error; a 201-character note -> error; nothing stored', async () => {
    const before = await env.DB.prepare(`SELECT COUNT(*) AS n FROM service_requests WHERE ward_id = ?`).bind(c.wardId).first<{ n: number }>();
    const r1 = await submit(c.prefix, 'req-christmas', { name: 'Rhea', email: uniqueEmail('r') });
    expect(r1.status).toBe(400);
    expect(await r1.text()).toContain('your family or another family');
    const r2 = await submit(c.prefix, 'req-other', { name: 'Rhea', email: uniqueEmail('r'), note: 'x'.repeat(201) });
    expect(r2.status).toBe(400);
    const r3 = await submit(c.prefix, 'req-moving', { name: 'Rhea', email: uniqueEmail('r'), moving_dir: 'sideways' });
    expect(r3.status).toBe(400);
    const after = await env.DB.prepare(`SELECT COUNT(*) AS n FROM service_requests WHERE ward_id = ?`).bind(c.wardId).first<{ n: number }>();
    expect(after!.n).toBe(before!.n);
    expect(sentEmails()).toHaveLength(0);
  });

  it('a failed bot check refuses the form', async () => {
    const r = await submit(c.prefix, 'req-other', { name: 'Rhea', email: uniqueEmail('r'), 'cf-turnstile-response': 'fail' });
    expect(r.status).toBe(400);
    expect(sentEmails()).toHaveLength(0);
  });

  it('submit -> one verify email, no leader email; GET verify changes nothing; POST verifies, sends ack + a detail-free notice', async () => {
    const email = uniqueEmail('rhea-requester').toLowerCase();
    await env.DB.prepare(`DELETE FROM service_delegates WHERE ward_id = ? AND category_id = ?`).bind(c.wardId, c.cat['req-christmas']!.id).run();
    const res = await submit(c.prefix, 'req-christmas', {
      name: 'Rhea Distinctname', email, phone: '555-0199-DISTINCT', note: 'NOTE-DISTINCT-7731', christmas_for: 'other',
      extra_secret: 'EXTRA-FIELD-XYZ',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Check your email');
    const row = (await lastRequest(c.wardId))!;
    expect(row.status).toBe('unverified');
    expect(row.christmas_for).toBe('other');
    expect(JSON.stringify(row)).not.toContain('EXTRA-FIELD-XYZ');
    const mails = sentEmails();
    expect(mails).toHaveLength(1);
    expect(mails[0]!.to).toBe(email);
    const path = verifyPath(mails[0]!.html);

    resetFetches();
    const getRes = await SELF.fetch(`http://localhost${path}`);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get('x-robots-tag')).toBe('noindex');
    expect((await lastRequest(c.wardId))!.status).toBe('unverified');
    expect(sentEmails()).toHaveLength(0);

    const post = await SELF.fetch(`http://localhost${path}`, { method: 'POST', redirect: 'manual' });
    expect(post.status).toBe(200);
    expect(await post.text()).toContain('Thank you, we’ve received your request');
    expect((await lastRequest(c.wardId))!.status).toBe('new');
    const sent = sentEmails();
    const ack = sent.filter((m) => m.to === email);
    expect(ack).toHaveLength(1);
    const notices = sent.filter((m) => m.to !== email);
    // Review Focus 3: the Christmas notice goes to the bishop only (not a counselor).
    expect(notices.map((m) => m.to)).toEqual([c.emails.bishop]);
    for (const n of notices) {
      for (const secret of ['Rhea', 'Distinctname', email, '555-0199', 'NOTE-DISTINCT', 'other family', 'another family']) {
        expect(n.html, secret).not.toContain(secret);
        expect(n.subject, secret).not.toContain(secret);
      }
      expect(n.html).toContain(`/w/${c.wardId}/requests/`);
    }

    // The link works once.
    resetFetches();
    const again = await SELF.fetch(`http://localhost${path}`, { method: 'POST' });
    expect(again.status).toBe(400);
    expect(sentEmails()).toHaveLength(0);
  });

  it('an expired token is a friendly invalid page and changes nothing', async () => {
    await submit(c.prefix, 'req-other', { name: 'Late Larry', email: uniqueEmail('late') });
    const path = verifyPath(sentEmails()[0]!.html);
    const row = (await lastRequest(c.wardId))!;
    await env.DB.prepare(`UPDATE request_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE request_id = ?`).bind(row.id).run();
    const res = await SELF.fetch(`http://localhost${path}`, { method: 'POST' });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('expired');
    expect((await lastRequest(c.wardId))!.status).toBe('unverified');
  });

  it('rate limit: a 4th submission from one email in 24 hours is refused', async () => {
    const email = uniqueEmail('often');
    for (let i = 0; i < 3; i++) {
      expect((await submit(c.prefix, 'req-other', { name: 'Ofelia', email })).status, `try ${i + 1}`).toBe(200);
    }
    resetFetches();
    const fourth = await submit(c.prefix, 'req-other', { name: 'Ofelia', email });
    expect(fourth.status).toBe(429);
    expect(await fourth.text()).toContain('try again');
    expect(sentEmails()).toHaveLength(0);
  });

  it('rate limit: 10 per hour from one IP', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await submit(c.prefix, 'req-other', { name: 'Ivy', email: uniqueEmail('ip') }, '203.0.113.200')).status).toBe(200);
    }
    expect((await submit(c.prefix, 'req-other', { name: 'Ivy', email: uniqueEmail('ip') }, '203.0.113.200')).status).toBe(429);
  });

  it('an unknown ward is a branded 404', async () => {
    expect((await SELF.fetch('http://localhost/help/zzzznoward')).status).toBe(404);
  });
});

describe('workspace request: bishop approval checkbox', () => {
  it('missing -> form error, no row; checked -> stored and shown to the operator', async () => {
    const c = await makeServiceCast();
    const unit = `U-${Date.now()}-${Math.random()}`;
    const post = async (data: Record<string, string>) =>
      SELF.fetch('http://localhost/request-workspace', {
        method: 'POST',
        redirect: 'manual',
        headers: { cookie: await asUser(c.plainMember), 'content-type': 'application/x-www-form-urlencoded' },
        body: form(data),
      });
    const no = await post({ ward_name: 'Test 9th Ward', unit_number: unit });
    expect(await no.text()).toContain('bishop has approved');
    const none = await env.DB.prepare(`SELECT COUNT(*) AS n FROM workspace_requests WHERE unit_number = ?`).bind(unit).first<{ n: number }>();
    expect(none!.n).toBe(0);
    const form1 = await (await SELF.fetch('http://localhost/request-workspace', { headers: { cookie: await asUser(c.plainMember) } })).text();
    expect(form1).toContain('Our bishop has approved using WardForward for our ward');
    await post({ ward_name: 'Test 9th Ward', unit_number: unit, bishop_approved: '1' });
    const row = await env.DB.prepare(`SELECT bishop_approved FROM workspace_requests WHERE unit_number = ?`).bind(unit).first<{ bishop_approved: number }>();
    expect(row!.bishop_approved).toBe(1);
    const { renderOperatorConsole } = await import('../src/views/pages');
    const reqs = (await env.DB.prepare(`SELECT * FROM workspace_requests WHERE unit_number = ?`).bind(unit).all()).results as never[];
    expect(renderOperatorConsole({ id: 'u', email: 'op@example.test', name: 'Op' }, reqs)).toContain('Bishop approved: yes');
  });
});
