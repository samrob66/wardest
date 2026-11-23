import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, sentEmails } from './helpers';
import { addDelegate, insertRequest, makeServiceCast, type ServiceCast } from './serviceCast';
import { purgeRequests } from '../src/lib/serviceRequests';

function form(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

async function get(uid: string, path: string) {
  return SELF.fetch(`http://localhost${path}`, { redirect: 'manual', headers: { cookie: await asUser(uid) } });
}

async function post(uid: string, path: string, data: Record<string, string>) {
  return SELF.fetch(`http://localhost${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: await asUser(uid), 'content-type': 'application/x-www-form-urlencoded' },
    body: form(data),
  });
}

async function row(id: string) {
  return env.DB.prepare(`SELECT * FROM service_requests WHERE id = ?`).bind(id).first<{ status: string; closed_at: string | null; private_note: string | null; assigned_user_id: string | null }>();
}

describe("leaders' requests inbox", () => {
  let c: ServiceCast;
  beforeAll(async () => {
    c = await makeServiceCast();
  });

  it("a counselor can't open a Christmas request by URL (403) and doesn't see it in the inbox; the bishop does", async () => {
    const xmas = c.requests['req-christmas']!;
    expect((await get(c.counselor, `/w/${c.wardId}/requests/${xmas}`)).status).toBe(403);
    expect((await post(c.counselor, `/w/${c.wardId}/requests/${xmas}`, { status: 'done' })).status).toBe(403);
    const inbox = await (await get(c.counselor, `/w/${c.wardId}/requests`)).text();
    expect(inbox).not.toContain(xmas);
    expect(inbox).toContain(c.requests['req-moving']!);
    expect((await get(c.bishop, `/w/${c.wardId}/requests/${xmas}`)).status).toBe(200);
    expect(await (await get(c.bishop, `/w/${c.wardId}/requests`)).text()).toContain(xmas);
    expect((await get(c.stranger, `/w/${c.wardId}/requests/${xmas}`)).status).toBe(403);
    expect((await get(c.bishop, `/w/${c.wardId}/requests/sreq_nope`)).status).toBe(404);
  });

  it('a plain member who sees no request category gets 403', async () => {
    const res = await get(c.plainMember, `/w/${c.wardId}/requests`);
    expect(res.status).toBe(403);
  });

  it('unverified requests never show', async () => {
    const id = await insertRequest(c.wardId, c.cat['req-moving']!.id, { status: 'unverified', name: 'Unconfirmed Ulla' });
    expect(await (await get(c.eqPres, `/w/${c.wardId}/requests`)).text()).not.toContain('Unconfirmed Ulla');
    expect((await get(c.eqPres, `/w/${c.wardId}/requests/${id}`)).status).toBe(404);
  });

  it('status filter', async () => {
    const id = await insertRequest(c.wardId, c.cat['req-moving']!.id, { status: 'in_progress', name: 'Filter Fran' });
    const html = await (await get(c.eqPres, `/w/${c.wardId}/requests?status=in_progress`)).text();
    expect(html).toContain('Filter Fran');
    expect(html).not.toContain(c.requests['req-moving']!);
    expect(await (await get(c.eqPres, `/w/${c.wardId}/requests?status=new`)).text()).not.toContain(id);
  });

  it('assign only to one of the category delegates; private note at most 200', async () => {
    const id = c.requests['req-moving']!;
    const bad = await post(c.eqPres, `/w/${c.wardId}/requests/${id}`, { status: 'in_progress', assigned_user_id: c.plainMember });
    expect(bad.headers.get('location')).toContain('err=');
    expect((await row(id))!.assigned_user_id).toBeNull();
    await addDelegate(c.wardId, c.cat['req-moving']!.id, c.plainMember, c.eqPres);
    const ok = await post(c.eqPres, `/w/${c.wardId}/requests/${id}`, { status: 'in_progress', assigned_user_id: c.plainMember, private_note: 'Call Tuesday' });
    expect(ok.headers.get('location')).toContain('ok=1');
    expect((await row(id))!.assigned_user_id).toBe(c.plainMember);
    expect((await row(id))!.private_note).toBe('Call Tuesday');
    const long = await post(c.eqPres, `/w/${c.wardId}/requests/${id}`, { status: 'in_progress', private_note: 'x'.repeat(201) });
    expect(long.headers.get('location')).toContain('err=');
  });

  it('closing with a message emails the requester once; closed_at is set', async () => {
    const id = await insertRequest(c.wardId, c.cat['req-moving']!.id, { email: 'closer@example.test' });
    const res = await post(c.eqPres, `/w/${c.wardId}/requests/${id}`, { status: 'done', closing_message: 'We will see you Saturday!' });
    expect(res.status).toBe(302);
    expect((await row(id))!.status).toBe('done');
    expect((await row(id))!.closed_at).not.toBeNull();
    const mails = sentEmails().filter((m) => m.to === 'closer@example.test');
    expect(mails).toHaveLength(1);
    expect(mails[0]!.html).toContain('We will see you Saturday!');
    // Saving it again (still closed) sends nothing more.
    await post(c.eqPres, `/w/${c.wardId}/requests/${id}`, { status: 'done', closing_message: 'Again?' });
    expect(sentEmails().filter((m) => m.to === 'closer@example.test')).toHaveLength(1);
  });

  it('"Turn into a service opportunity" shows for moving (with the date), never for Christmas', async () => {
    const id = await insertRequest(c.wardId, c.cat['req-moving']!.id);
    await env.DB.prepare(`UPDATE service_requests SET preferred_date = '2027-02-13' WHERE id = ?`).bind(id).run();
    const moving = await (await get(c.eqPres, `/w/${c.wardId}/requests/${id}`)).text();
    expect(moving).toContain(`/w/${c.wardId}/vol/new?category=${c.cat.move!.id}&amp;date=2027-02-13`);
    const xmas = await (await get(c.bishop, `/w/${c.wardId}/requests/${c.requests['req-christmas']!}`)).text();
    expect(xmas).not.toContain('Turn into a service opportunity');
  });
});

describe('request purge (hourly cron)', () => {
  it('purges a request closed 31 days ago; keeps one closed 29 days ago and every open one; unverified after 7 days', async () => {
    const c = await makeServiceCast();
    const now = new Date('2026-12-15T12:00:00Z');
    const day = 86_400_000;
    const cat = c.cat['req-other']!.id;
    const old = await insertRequest(c.wardId, cat, { status: 'done', closedAt: new Date(now.getTime() - 31 * day).toISOString() });
    const recent = await insertRequest(c.wardId, cat, { status: 'declined', closedAt: new Date(now.getTime() - 29 * day).toISOString() });
    const open = await insertRequest(c.wardId, cat, { status: 'new', createdAt: new Date(now.getTime() - 90 * day).toISOString() });
    const staleUnverified = await insertRequest(c.wardId, cat, { status: 'unverified', createdAt: new Date(now.getTime() - 8 * day).toISOString() });
    const freshUnverified = await insertRequest(c.wardId, cat, { status: 'unverified', createdAt: new Date(now.getTime() - 6 * day).toISOString() });
    await purgeRequests(env, now);
    expect(await row(old)).toBeNull();
    expect(await row(recent)).not.toBeNull();
    expect(await row(open)).not.toBeNull();
    expect(await row(staleUnverified)).toBeNull();
    expect(await row(freshUnverified)).not.toBeNull();
  });

  it('runs from the hourly volunteer cron', async () => {
    const c = await makeServiceCast();
    const now = new Date('2026-12-15T12:00:00Z');
    const old = await insertRequest(c.wardId, c.cat['req-other']!.id, { status: 'done', closedAt: '2026-10-01T00:00:00.000Z' });
    const { runVolunteerCron } = await import('../src/lib/volCron');
    await runVolunteerCron(env, now, { wardIds: [] });
    expect(await row(old)).toBeNull();
  });
});
