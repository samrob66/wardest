import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, ensureUser, sentEmails, uniqueEmail } from './helpers';
import { makeServiceCast, type ServiceCast } from './serviceCast';
import { getCategory, listCategories } from '../src/lib/serviceCategories';
import { isCategoryDelegate } from '../src/lib/serviceAccess';

function form(data: Record<string, string | string[]>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) for (const x of Array.isArray(v) ? v : [v]) p.append(k, x);
  return p.toString();
}

async function post(uid: string, path: string, data: Record<string, string | string[]> = {}) {
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

async function pref(categoryId: string, userId: string) {
  return env.DB.prepare(`SELECT * FROM service_warn_prefs WHERE category_id = ? AND user_id = ?`)
    .bind(categoryId, userId)
    .first<{ id: string; warn_me: number; hours: number }>();
}

describe('category management pages', () => {
  let c: ServiceCast;
  let base: string;
  beforeAll(async () => {
    c = await makeServiceCast();
    base = `/w/${c.wardId}/service/category/${c.cat.meal!.id}`;
  });

  it('a non-manager gets 403 on every category route', async () => {
    for (const uid of [c.plainMember, c.eqPres, c.rsSecretary, c.stranger]) {
      expect((await get(uid, base)).status, `GET ${uid}`).toBe(403);
      expect((await post(uid, base, { op: 'save', name: 'Hacked', icon: 'meal', audiences: 'sisters' })).status).toBe(403);
      expect((await post(uid, `${base}/delegates`, { user_id: c.plainMember })).status).toBe(403);
      expect((await post(uid, `${base}/delegates/${c.plainMember}/remove`)).status).toBe(403);
      expect((await post(uid, `${base}/warnings`, { warn_me: '1', hours: '24' })).status).toBe(403);
      expect((await post(uid, `${base}/discord`, { webhook_url: 'https://discord.com/api/webhooks/1/abc' })).status).toBe(403);
    }
    expect((await getCategory(env, c.wardId, c.cat.meal!.id))!.name).toBe('Provide a Meal');
  });

  it("a bishopric counselor can't open req-christmas's page; the bishop can", async () => {
    const p = `/w/${c.wardId}/service/category/${c.cat['req-christmas']!.id}`;
    expect((await get(c.counselor, p)).status).toBe(403);
    expect((await get(c.bishop, p)).status).toBe(200);
    expect((await get(c.counselor, `/w/${c.wardId}/service/category/${c.cat['req-moving']!.id}`)).status).toBe(200);
  });

  it('the manager renames, sets audiences, archives and unarchives', async () => {
    const r = await post(c.rsPres, base, { op: 'save', name: 'Meals for Families', icon: 'meal', audiences: ['sisters', 'brothers'] });
    expect(r.status).toBe(302);
    let cat = (await getCategory(env, c.wardId, c.cat.meal!.id))!;
    expect(cat.name).toBe('Meals for Families');
    expect(cat.default_audiences).toBe('brothers,sisters');
    const none = await post(c.rsPres, base, { op: 'save', name: 'Meals', icon: 'meal' });
    expect(none.headers.get('location')).toContain('err=');
    expect((await post(c.rsPres, base, { op: 'archive' })).status).toBe(302);
    expect((await getCategory(env, c.wardId, c.cat.meal!.id))!.archived).toBe(1);
    await post(c.rsPres, base, { op: 'unarchive' });
    cat = (await getCategory(env, c.wardId, c.cat.meal!.id))!;
    expect(cat.archived).toBe(0);
  });

  it('the manager adds a ward member as a delegate and removes them', async () => {
    expect((await post(c.rsPres, `${base}/delegates`, { user_id: c.plainMember })).status).toBe(302);
    expect(await isCategoryDelegate(env, c.wardId, c.cat.meal!.id, c.plainMember)).toBe(true);
    // Someone from another ward can't be added.
    await post(c.rsPres, `${base}/delegates`, { user_id: c.stranger });
    expect(await isCategoryDelegate(env, c.wardId, c.cat.meal!.id, c.stranger)).toBe(false);
    expect((await post(c.rsPres, `${base}/delegates/${c.plainMember}/remove`)).status).toBe(302);
    expect(await isCategoryDelegate(env, c.wardId, c.cat.meal!.id, c.plainMember)).toBe(false);
  });

  it("an email that belongs to a ward member is added directly, no email sent", async () => {
    expect((await post(c.rsPres, `${base}/delegates`, { email: c.emails.mealDelegate!.toUpperCase() })).status).toBe(302);
    expect(await isCategoryDelegate(env, c.wardId, c.cat.meal!.id, c.mealDelegate)).toBe(true);
    expect(sentEmails()).toHaveLength(0);
  });

  it('inviting a non-member email sends one invite; accepting makes them a member with no spaces and a delegate', async () => {
    const email = uniqueEmail('newcoord').toLowerCase();
    expect((await post(c.rsPres, `${base}/delegates`, { email })).status).toBe(302);
    const mails = sentEmails();
    expect(mails).toHaveLength(1);
    expect(mails[0]!.to).toBe(email);
    const link = mails[0]!.html.match(/href="(http[^"]*\/invite\/[^"]+)"/)![1]!;
    const path = new URL(link.replace(/&amp;/g, '&')).pathname;
    const uid = await ensureUser(env, email, 'New Coordinator');
    const res = await get(uid, path);
    expect(res.status).toBe(302);
    const wm = await env.DB.prepare(`SELECT role FROM ward_memberships WHERE ward_id = ? AND user_id = ?`).bind(c.wardId, uid).first<{ role: string }>();
    expect(wm!.role).toBe('member');
    const sm = await env.DB.prepare(`SELECT COUNT(*) AS n FROM space_memberships WHERE user_id = ?`).bind(uid).first<{ n: number }>();
    expect(sm!.n).toBe(0);
    expect(await isCategoryDelegate(env, c.wardId, c.cat.meal!.id, uid)).toBe(true);
  });

  it('warnings: whole hours 1–336 only; others must be ward members', async () => {
    for (const hours of ['0', '337', '4.5', 'abc', '']) {
      const r = await post(c.rsPres, `${base}/warnings`, { warn_me: '1', hours });
      expect(r.headers.get('location'), hours).toContain('err=');
      expect(await pref(c.cat.meal!.id, c.rsPres), hours).toBeNull();
    }
    const ok = await post(c.rsPres, `${base}/warnings`, { hours: '72', others: [c.plainMember, c.stranger] });
    expect(ok.headers.get('location')).toContain('ok=1');
    const p = (await pref(c.cat.meal!.id, c.rsPres))!;
    expect(p.warn_me).toBe(0);
    expect(p.hours).toBe(72);
    const others = await env.DB.prepare(`SELECT user_id FROM service_warn_others WHERE pref_id = ?`).bind(p.id).all<{ user_id: string }>();
    expect(others.results.map((o) => o.user_id)).toEqual([c.plainMember]);
    // Saving again replaces the list.
    await post(c.rsPres, `${base}/warnings`, { warn_me: '1', hours: '48' });
    const p2 = (await pref(c.cat.meal!.id, c.rsPres))!;
    expect(p2.warn_me).toBe(1);
    const o2 = await env.DB.prepare(`SELECT COUNT(*) AS n FROM service_warn_others WHERE pref_id = ?`).bind(p2.id).first<{ n: number }>();
    expect(o2!.n).toBe(0);
  });

  it('Discord webhook: only discord.com webhooks; after saving only the last 4 characters show', async () => {
    const bad = await post(c.rsPres, `${base}/discord`, { webhook_url: 'https://evil.example/api/webhooks/1/x' });
    expect(bad.headers.get('location')).toContain('err=');
    const url = 'https://discord.com/api/webhooks/123456789/SecretTokenAbc_-9WXYZ';
    expect((await post(c.rsPres, `${base}/discord`, { webhook_url: url })).status).toBe(302);
    const html = await (await get(c.rsPres, base)).text();
    expect(html).not.toContain(url);
    expect(html).not.toContain('SecretTokenAbc');
    expect(html).toContain('Discord channel connected');
    expect(html).toContain('WXYZ');
    const row = await env.DB.prepare(`SELECT discord_webhook_url FROM service_categories WHERE id = ?`).bind(c.cat.meal!.id).first<{ discord_webhook_url: string }>();
    expect(row!.discord_webhook_url).toBe(url);
    await post(c.rsPres, `${base}/discord`, { clear: '1' });
    const cleared = await env.DB.prepare(`SELECT discord_webhook_url FROM service_categories WHERE id = ?`).bind(c.cat.meal!.id).first<{ discord_webhook_url: string | null }>();
    expect(cleared!.discord_webhook_url).toBeNull();
  });

  it('a manager adds a category in a space they own, not in one they do not', async () => {
    const ok = await post(c.rsPres, `/w/${c.wardId}/service/category`, {
      kind: 'opportunity', name: 'Sew Quilts', icon: 'hand', space_id: c.spaces['relief-society']!, audiences: 'sisters',
    });
    expect(ok.status).toBe(302);
    const all = await listCategories(env, c.wardId, {});
    const q = all.find((x) => x.name === 'Sew Quilts')!;
    expect(q.kind).toBe('opportunity');
    expect((await getCategory(env, c.wardId, q.id))!.spaces.map((s) => s.id)).toEqual([c.spaces['relief-society']]);
    const no = await post(c.rsPres, `/w/${c.wardId}/service/category`, {
      kind: 'opportunity', name: 'EQ Thing', icon: 'hand', space_id: c.spaces['elders-quorum']!, audiences: 'brothers',
    });
    expect(no.status).toBe(403);
    expect((await listCategories(env, c.wardId, {})).some((x) => x.name === 'EQ Thing')).toBe(false);
    // The public space can never own a category, even for a superadmin.
    const pub = await post(c.exec, `/w/${c.wardId}/service/category`, {
      kind: 'request', name: 'Public Thing', icon: 'other', space_id: c.spaces.public!,
    });
    expect(pub.status).toBe(403);
  });

  // One page view per test: each hub view runs ~200 D1 queries (a permission check per
  // category), so a test that strings several together runs far longer than the rest.
  it('the hub lists what you manage, and no requests link for someone who sees no requests', async () => {
    const hub = await (await get(c.rsPres, `/w/${c.wardId}/service`)).text();
    expect(hub).toContain('Create Service Opportunity');
    expect(hub).toContain(`/w/${c.wardId}/service/category/${c.cat.meal!.id}`);
    expect(hub).not.toContain(`/w/${c.wardId}/service/category/${c.cat.move!.id}`);
    expect(hub).not.toContain(`/w/${c.wardId}/requests"`);
  });

  it("the bishop's hub links to the requests inbox", async () => {
    const bishopHub = await (await get(c.bishop, `/w/${c.wardId}/service`)).text();
    expect(bishopHub).toContain(`/w/${c.wardId}/requests`);
  });

  it('the ward page links to the hub only for service roles; a stranger gets 403', async () => {
    const ward = await (await get(c.rsPres, `/w/${c.wardId}`)).text();
    expect(ward).toContain(`/w/${c.wardId}/service"`);
    const plain = await (await get(c.plainMember, `/w/${c.wardId}`)).text();
    expect(plain).not.toContain(`/w/${c.wardId}/service"`);
    expect((await get(c.stranger, `/w/${c.wardId}/service`)).status).toBe(403);
  });
});
