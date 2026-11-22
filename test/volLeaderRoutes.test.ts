import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, makeWard } from './helpers';
import { makeCast, type Cast } from './cast';
import { addDate, addRole, createPost, getPost } from '../src/lib/volPosts';

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

describe('leader post pages', () => {
  let c: Cast;
  let postId: string;
  beforeAll(async () => {
    c = await makeCast();
    postId = await createPost(env, c.wardId, c.spaces['elders-quorum']!, c.bishop, {
      title: 'Help the Jensens move in', public_note: 'Wear shoes', private_details: 'Door code 4242', cancel_cutoff_hours: 24,
    });
    const d = await addDate(env, c.wardId, postId, '2026-12-06', '09:00');
    await addRole(env, c.wardId, d, { name: 'Movers', needed: 6, start_time: null, end_time: null, note: null, bring_prompt: null });
  });

  it('eqTeacher sees the manage page read-only', async () => {
    const res = await get(c.eqTeacher, `/w/${c.wardId}/vol/${postId}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Help the Jensens move in');
    expect(html).toContain('Door code 4242');
    expect(html).toContain('/v/');
    expect(html).not.toContain(`action="/w/${c.wardId}/vol/${postId}/date"`);
    expect(html).not.toContain('<form method="post"');
  });

  it('eqPres sees edit forms', async () => {
    const html = await (await get(c.eqPres, `/w/${c.wardId}/vol/${postId}`)).text();
    expect(html).toContain(`action="/w/${c.wardId}/vol/${postId}/date"`);
  });

  it('eqTeacher POST edit -> 403; wmLeader GET -> 403', async () => {
    const r = await post(c.eqTeacher, `/w/${c.wardId}/vol/${postId}`, { title: 'Hacked', cancel_cutoff_hours: '24' });
    expect(r.status).toBe(403);
    expect((await getPost(env, c.wardId, postId))!.title).toBe('Help the Jensens move in');
    expect((await get(c.wmLeader, `/w/${c.wardId}/vol/${postId}`)).status).toBe(403);
    expect((await post(c.eqTeacher, `/w/${c.wardId}/vol/${postId}/delete`)).status).toBe(403);
  });

  it("another ward's post id under this ward's URL -> 404", async () => {
    const other = await makeWard(env);
    const otherPost = await createPost(env, other.wardId, other.spaces['elders-quorum']!, other.founderId, {
      title: 'Other', public_note: null, private_details: null, cancel_cutoff_hours: 24,
    });
    expect((await get(c.bishop, `/w/${c.wardId}/vol/${otherPost}`)).status).toBe(404);
    expect((await post(c.bishop, `/w/${c.wardId}/vol/${otherPost}`, { title: 'x', cancel_cutoff_hours: '1' })).status).toBe(404);
    expect((await post(c.bishop, `/w/${c.wardId}/vol/${otherPost}/delete`)).status).toBe(404);
    expect((await getPost(env, other.wardId, otherPost))!.title).toBe('Other');
  });

  it('eqPres creates a post for EQ -> 302 to the manage page; for RS -> 403', async () => {
    const res = await post(c.eqPres, `/w/${c.wardId}/vol`, {
      space_id: c.spaces['elders-quorum']!, title: 'Move the Smiths', public_note: '', private_details: '',
      cancel_cutoff_hours: '24', first_date: '2026-12-12', start_time: '10:00', role_name: 'Movers', role_needed: '10',
    });
    expect(res.status).toBe(302);
    const loc = res.headers.get('location')!;
    const m = loc.match(/\/w\/[^/]+\/vol\/([^/?]+)$/);
    expect(m).not.toBeNull();
    const created = (await getPost(env, c.wardId, m![1]!))!;
    expect(created.space_id).toBe(c.spaces['elders-quorum']);
    expect(created.created_by_user_id).toBe(c.eqPres);
    expect(created.dates.map((d) => [d.date, d.start_time, d.roles.map((r) => [r.name, r.needed])])).toEqual([
      ['2026-12-12', '10:00', [['Movers', 10]]],
    ]);
    const rs = await post(c.eqPres, `/w/${c.wardId}/vol`, {
      space_id: c.spaces['relief-society']!, title: 'Meals', cancel_cutoff_hours: '24', first_date: '2026-12-12',
    });
    expect(rs.status).toBe(403);
  });

  it('a bad form re-renders with an error and creates nothing', async () => {
    const before = await env.DB.prepare(`SELECT COUNT(*) AS n FROM vol_posts WHERE ward_id = ?`).bind(c.wardId).first<{ n: number }>();
    const res = await post(c.eqPres, `/w/${c.wardId}/vol`, {
      space_id: c.spaces['elders-quorum']!, title: 'Bad', cancel_cutoff_hours: '24', first_date: '2026-02-30',
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('real date');
    const after = await env.DB.prepare(`SELECT COUNT(*) AS n FROM vol_posts WHERE ward_id = ?`).bind(c.wardId).first<{ n: number }>();
    expect(after!.n).toBe(before!.n);
  });

  it('new-post form lists only orgs the user can manage', async () => {
    const html = await (await get(c.eqPres, `/w/${c.wardId}/vol/new`)).text();
    expect(html).toContain(c.spaces['elders-quorum']!);
    expect(html).not.toContain(c.spaces['relief-society']!);
    expect((await get(c.eqTeacher, `/w/${c.wardId}/vol/new`)).status).toBe(403);
  });

  it('dates and roles: add, copy, edit, delete; ids from another post are 404', async () => {
    const pid = await createPost(env, c.wardId, c.spaces['elders-quorum']!, c.eqPres, {
      title: 'Evenings', public_note: null, private_details: null, cancel_cutoff_hours: 24,
    });
    const base = `/w/${c.wardId}/vol/${pid}`;
    expect((await post(c.eqPres, `${base}/date`, { date: '2026-12-01', start_time: '18:30' })).status).toBe(302);
    let p = (await getPost(env, c.wardId, pid))!;
    const d1 = p.dates[0]!.id;
    expect((await post(c.eqPres, `${base}/date/${d1}/role`, { name: 'Companions', needed: '4' })).status).toBe(302);
    expect((await post(c.eqPres, `${base}/date/${d1}/copy`, { date: '2026-12-08' })).status).toBe(302);
    p = (await getPost(env, c.wardId, pid))!;
    expect(p.dates.map((d) => [d.date, d.roles.length])).toEqual([['2026-12-01', 1], ['2026-12-08', 1]]);
    const roleId = p.dates[0]!.roles[0]!.id;
    expect((await post(c.eqPres, `${base}/role/${roleId}`, { name: 'Companions', needed: '5', note: 'Bring scriptures' })).status).toBe(302);
    p = (await getPost(env, c.wardId, pid))!;
    expect(p.dates[0]!.roles[0]!.needed).toBe(5);
    // A role/date of a different post under this post's URL: 404, untouched.
    const foreignRole = (await getPost(env, c.wardId, postId))!.dates[0]!.roles[0]!;
    expect((await post(c.eqPres, `${base}/role/${foreignRole.id}/delete`)).status).toBe(404);
    expect((await post(c.eqPres, `${base}/date/${foreignRole.date_id}/delete`)).status).toBe(404);
    expect((await getPost(env, c.wardId, postId))!.dates[0]!.roles).toHaveLength(1);
    expect((await post(c.eqPres, `${base}/role/${roleId}/delete`)).status).toBe(302);
    expect((await post(c.eqPres, `${base}/date/${p.dates[1]!.id}/delete`)).status).toBe(302);
    p = (await getPost(env, c.wardId, pid))!;
    expect(p.dates.map((d) => [d.date, d.roles.length])).toEqual([['2026-12-01', 0]]);
    // Copy, then delete via the confirm page.
    const cp = await post(c.eqPres, `${base}/copy`, { new_first_date: '2027-01-05' });
    expect(cp.status).toBe(302);
    const confirm = await get(c.eqPres, `${base}/delete`);
    expect(confirm.status).toBe(200);
    expect(await confirm.text()).toContain('Delete');
    expect(await getPost(env, c.wardId, pid)).not.toBeNull(); // GET changed nothing
    expect((await post(c.eqPres, `${base}/delete`)).status).toBe(302);
    expect(await getPost(env, c.wardId, pid)).toBeNull();
  });
});
