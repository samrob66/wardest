import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import seedSql from '../db/seed-m44.sql?raw';
import { env, asUser, makeWard, makeLeader, uniqueEmail, schemaStatements } from './helpers';
import { newId } from '../src/lib/ids';
import { createSection, listSections } from '../src/lib/portalSections';

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

async function page(path: string) {
  const res = await SELF.fetch(`http://localhost${path}`);
  return { status: res.status, html: await res.text() };
}

async function publish(wardId: string, spaceId: string, by: string, title: string, url: string, sectionId: string | null = null) {
  const id = newId('dlv');
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO deliverables (id, ward_id, title, type, url, created_by_user_id) VALUES (?, ?, ?, 'url', ?, ?)`).bind(id, wardId, title, url, by),
    env.DB.prepare(`INSERT INTO deliverable_spaces (id, ward_id, deliverable_id, space_id, include_in_portal, position, section_id) VALUES (?, ?, ?, ?, 1, 0, ?)`)
      .bind(newId('dsp'), wardId, id, spaceId, sectionId),
  ]);
  return id;
}

function order(html: string, labels: string[]): number[] {
  return labels.map((l) => html.indexOf(`>${l}</h2>`));
}

describe('portal sections and service cards', () => {
  let w: Awaited<ReturnType<typeof makeWard>>;
  let pub: string;
  let wardLinks: string;
  let interviews: string;
  beforeAll(async () => {
    w = await makeWard(env);
    pub = w.spaces.public!;
    wardLinks = await createSection(env, w.wardId, pub, 'Ward Links');
    interviews = await createSection(env, w.wardId, pub, 'Interviews');
    await publish(w.wardId, pub, w.founderId, 'Ward Bulletin', 'https://example.test/bulletin', wardLinks);
    await publish(w.wardId, pub, w.founderId, 'Schedule an Interview', 'https://example.test/interview', interviews);
    await publish(w.wardId, pub, w.founderId, 'Loose Link', 'https://example.test/loose', null);
  });

  it('order: Service Opportunities, Service Requests, Ward Links, Interviews, Links', async () => {
    const { status, html } = await page(`/p/${w.prefix}`);
    expect(status).toBe(200);
    const pos = order(html, ['Service Opportunities', 'Service Requests', 'Ward Links', 'Interviews', 'Links']);
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(html).toContain('Sign up for Service Opportunities');
    expect(html).toContain('Request Help or Service');
    const print = (await page(`/p/${w.prefix}/print`)).html;
    const ppos = order(print, ['Service Opportunities', 'Service Requests', 'Ward Links', 'Interviews', 'Links']);
    expect(ppos.every((p) => p >= 0)).toBe(true);
    expect([...ppos].sort((a, b) => a - b)).toEqual(ppos);
  });

  it('service cards link to the short links when set, else the direct addresses', async () => {
    let html = (await page(`/p/${w.prefix}`)).html;
    expect(html).toContain(`href="http://localhost:8787/serve/${w.prefix}"`);
    expect(html).toContain(`href="http://localhost:8787/help/${w.prefix}"`);
    await post(w.founderId, `/w/${w.wardId}/service-links`, {
      serve_short_url: 'zippa.run/tServe', help_short_url: 'https://zippa.run/tHelp', serve_section_on: '1', help_section_on: '1',
    });
    html = (await page(`/p/${w.prefix}`)).html;
    expect(html).toContain('href="https://zippa.run/tServe"');
    expect(html).toContain('href="https://zippa.run/tHelp"');
    expect(html).toContain('zippa.run/tServe');
  });

  it('turning a section off removes it from the portal and the print', async () => {
    await post(w.founderId, `/w/${w.wardId}/service-links`, { serve_short_url: '', help_short_url: '', help_section_on: '1' });
    const html = (await page(`/p/${w.prefix}`)).html;
    expect(html).not.toContain('>Service Opportunities</h2>');
    expect(html).toContain('>Service Requests</h2>');
    expect((await page(`/p/${w.prefix}/print`)).html).not.toContain('>Service Opportunities</h2>');
    await post(w.founderId, `/w/${w.wardId}/service-links`, { serve_section_on: '1', help_section_on: '1' });
    expect((await page(`/p/${w.prefix}`)).html).toContain('>Service Opportunities</h2>');
  });

  it('a javascript: short link is refused; a non-superadmin gets 403', async () => {
    const r = await post(w.founderId, `/w/${w.wardId}/service-links`, { serve_short_url: 'javascript:alert(1)', serve_section_on: '1', help_section_on: '1' });
    expect(r.headers.get('location')).toContain('err=');
    const row = await env.DB.prepare(`SELECT serve_short_url FROM wards WHERE id = ?`).bind(w.wardId).first<{ serve_short_url: string | null }>();
    expect(row!.serve_short_url).toBeNull();
    const member = await makeLeader(env, w.wardId, { email: uniqueEmail('m'), spaces: [['bishopric', 'member']] });
    expect((await post(member, `/w/${w.wardId}/service-links`, { serve_short_url: 'https://zippa.run/x' })).status).toBe(403);
    expect(await (await SELF.fetch(`http://localhost/w/${w.wardId}`, { headers: { cookie: await asUser(w.founderId) } })).text()).toContain('Service Opportunities link');
  });

  it('arranging sections: add, rename, move, assign a card; deleting one moves its cards to Links', async () => {
    const base = `/w/${w.wardId}/space/${pub}`;
    expect((await post(w.founderId, `${base}/sections`, { title: 'Temporary' })).status).toBe(302);
    const temp = (await listSections(env, w.wardId, pub)).find((s) => s.title === 'Temporary')!;
    await post(w.founderId, `${base}/sections/${temp.id}`, { title: 'Youth' });
    expect((await listSections(env, w.wardId, pub)).find((s) => s.id === temp.id)!.title).toBe('Youth');
    await post(w.founderId, `${base}/sections/${temp.id}/move`, { dir: 'up' });
    expect((await listSections(env, w.wardId, pub)).map((s) => s.title)).toEqual(['Ward Links', 'Youth', 'Interviews']);
    const loose = await env.DB.prepare(`SELECT id FROM deliverables WHERE ward_id = ? AND title = 'Loose Link'`).bind(w.wardId).first<{ id: string }>();
    await post(w.founderId, `${base}/cards/${loose!.id}/section`, { section_id: temp.id });
    let html = (await page(`/p/${w.prefix}`)).html;
    expect(html.indexOf('Loose Link')).toBeGreaterThan(html.indexOf('>Youth</h2>'));
    expect(html.indexOf('Loose Link')).toBeLessThan(html.indexOf('>Interviews</h2>'));
    expect((await post(w.founderId, `${base}/sections/${temp.id}/delete`)).status).toBe(302);
    html = (await page(`/p/${w.prefix}`)).html;
    expect(html).not.toContain('>Youth</h2>');
    expect(html.indexOf('Loose Link')).toBeGreaterThan(html.indexOf('>Links</h2>'));
    // Someone who can't manage the public portal can't arrange it.
    const member = await makeLeader(env, w.wardId, { email: uniqueEmail('m2') });
    expect((await post(member, `${base}/sections`, { title: 'Nope' })).status).toBe(403);
    // A section id from another space is refused for a card.
    const other = await createSection(env, w.wardId, w.spaces.bishopric!, 'Elsewhere');
    await post(w.founderId, `${base}/cards/${loose!.id}/section`, { section_id: other });
    const ds = await env.DB.prepare(`SELECT section_id FROM deliverable_spaces WHERE deliverable_id = ? AND space_id = ?`).bind(loose!.id, pub).first<{ section_id: string | null }>();
    expect(ds!.section_id).toBeNull();
  });
});

describe('the M44 seed', () => {
  it('shows the service sections, then Ward Links and Interviews', async () => {
    const stmts = schemaStatements(seedSql);
    await env.DB.batch(stmts.map((s) => env.DB.prepare(s)));
    await env.DB.batch(stmts.map((s) => env.DB.prepare(s))); // idempotent
    const { status, html } = await page('/p/m44');
    expect(status).toBe(200);
    const pos = order(html, ['Service Opportunities', 'Service Requests', 'Ward Links', 'Interviews']);
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(html.indexOf('Schedule an Interview')).toBeGreaterThan(html.indexOf('>Interviews</h2>'));
    expect(html.indexOf('Show the Ward Bulletin')).toBeLessThan(html.indexOf('>Interviews</h2>'));
    expect(html).not.toContain('>Links</h2>'); // everything is sectioned
  });
});
