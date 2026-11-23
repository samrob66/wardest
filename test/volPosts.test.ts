import { describe, it, expect } from 'vitest';
import { env, makeWard, makeLeader, uniqueEmail } from './helpers';
import {
  createPost, updatePost, addDate, updateDate, addRole, updateRole, deleteRole, deleteDate, deletePost,
  copyDate, copyPost, getPost, getPostByPublicId, listWardPosts, VolInputError, type RoleInput, type PostInput,
} from '../src/lib/volPosts';
import { newId } from '../src/lib/ids';
import { addDays, wardToday } from '../src/lib/wardTime';
import { listCategories } from '../src/lib/serviceCategories';

const NOW = new Date('2026-11-21T18:00:00Z'); // 11:00 in Denver

const postInput = (o: Partial<PostInput> = {}): PostInput => ({
  title: 'Help the Jensens move in',
  public_note: 'Wear closed-toe shoes',
  private_details: 'Door code 4242',
  cancel_cutoff_hours: 24,
  ...o,
});
const role = (o: Partial<RoleInput> = {}): RoleInput => ({
  name: 'Movers', needed: 2, start_time: null, end_time: null, note: null, bring_prompt: null, ...o,
});

async function setup() {
  const w = await makeWard(env);
  const pres = await makeLeader(env, w.wardId, { email: uniqueEmail('pres'), spaces: [['elders-quorum', 'owner']] });
  return { ...w, pres, eq: w.spaces['elders-quorum']! };
}

async function addVolunteer(wardId: string, postId: string, roleId: string, status: string, verified = true) {
  const vid = newId('vv');
  const email = uniqueEmail('vol');
  await env.DB.prepare(
    `INSERT INTO volunteers (id, ward_id, email, name, approval, email_verified_at) VALUES (?, ?, ?, 'Vol', ?, ?)`,
  )
    .bind(vid, wardId, email, status === 'confirmed' ? 'approved' : verified ? 'pending' : 'none', verified ? NOW.toISOString() : null)
    .run();
  await env.DB.prepare(
    `INSERT INTO vol_signups (id, ward_id, post_id, role_id, volunteer_id, status, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(newId('vs'), wardId, postId, roleId, vid, status, status === 'confirmed' ? NOW.toISOString() : null)
    .run();
  return { vid, email };
}

describe('volPosts', () => {
  it('create -> two dates with roles -> getPost returns them ordered with zero counts', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const d2 = await addDate(env, s.wardId, postId, '2026-12-13', '10:00');
    const d1 = await addDate(env, s.wardId, postId, '2026-12-06', '09:00');
    await addRole(env, s.wardId, d1, role({ name: 'Movers', needed: 6 }));
    await addRole(env, s.wardId, d1, role({ name: 'Bring lunch', needed: 2, bring_prompt: 'What are you bringing?' }));
    await addRole(env, s.wardId, d2, role({ name: 'Cleanup', needed: 3 }));
    const p = await getPost(env, s.wardId, postId);
    expect(p).not.toBeNull();
    expect(p!.org_name).toBe('Elders Quorum');
    expect(p!.ward.timezone).toBe('America/Denver');
    expect(p!.dates.map((d) => d.date)).toEqual(['2026-12-06', '2026-12-13']);
    expect(p!.dates[0]!.roles.map((r) => r.name)).toEqual(['Movers', 'Bring lunch']);
    expect(p!.dates[0]!.roles[0]!.confirmed).toBe(0);
    expect(p!.dates[0]!.roles[0]!.waiting).toBe(0);
    expect(p!.public_id).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect((await getPostByPublicId(env, p!.public_id))!.id).toBe(postId);
    expect(await getPost(env, (await makeWard(env)).wardId, postId)).toBeNull();
  });

  it('copyDate copies start time and roles, not sign-ups', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const d1 = await addDate(env, s.wardId, postId, '2026-12-06', '17:30');
    const r1 = await addRole(env, s.wardId, d1, role({ name: 'Meal', needed: 1, bring_prompt: 'What meal?' }));
    await addVolunteer(s.wardId, postId, r1, 'confirmed');
    const d2 = await copyDate(env, s.wardId, d1, '2026-12-07');
    const p = (await getPost(env, s.wardId, postId))!;
    const copied = p.dates.find((d) => d.id === d2)!;
    expect(copied.start_time).toBe('17:30');
    expect(copied.roles.map((r) => [r.name, r.needed, r.bring_prompt, r.confirmed])).toEqual([['Meal', 1, 'What meal?', 0]]);
  });

  it('copyPost shifts every date by the same number of days, with a new public id', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const a = await addDate(env, s.wardId, postId, '2026-12-06', null);
    const b = await addDate(env, s.wardId, postId, '2026-12-13', null);
    const r = await addRole(env, s.wardId, a, role());
    await addRole(env, s.wardId, b, role({ name: 'Other' }));
    await addVolunteer(s.wardId, postId, r, 'confirmed');
    const newId2 = await copyPost(env, s.wardId, postId, '2027-01-10', s.pres);
    const old = (await getPost(env, s.wardId, postId))!;
    const copy = (await getPost(env, s.wardId, newId2))!;
    expect(copy.dates.map((d) => d.date)).toEqual(['2027-01-10', '2027-01-17']);
    expect(copy.public_id).not.toBe(old.public_id);
    expect(copy.title).toBe(old.title);
    expect(copy.dates.flatMap((d) => d.roles).every((x) => x.confirmed === 0)).toBe(true);
  });

  it('updateRole: a time change tells confirmed volunteers; a note change does not', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const d = await addDate(env, s.wardId, postId, '2026-12-06', '09:00');
    const r = await addRole(env, s.wardId, d, role());
    const v = await addVolunteer(s.wardId, postId, r, 'confirmed');
    await addVolunteer(s.wardId, postId, r, 'waiting');
    // NOW, not the real clock: these 2026-12 dates stop being upcoming once that clock passes them.
    const none = await updateRole(env, s.wardId, r, role({ note: 'Bring gloves' }), NOW);
    expect(none).toHaveLength(0);
    const msgs = await updateRole(env, s.wardId, r, role({ note: 'Bring gloves', start_time: '10:00' }), NOW);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.kind).toBe('vol_role_changed');
    expect(msgs[0]!.to).toBe(v.email);
    const dm = await updateDate(env, s.wardId, d, '2026-12-07', '09:00', NOW);
    expect(dm).toHaveLength(1);
  });

  it('saving a date unchanged does nothing; a real move resets reminders; a past date cannot be moved', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const d = await addDate(env, s.wardId, postId, '2026-12-06', '09:00');
    const r = await addRole(env, s.wardId, d, role());
    await addVolunteer(s.wardId, postId, r, 'confirmed');
    await env.DB.prepare(`UPDATE vol_signups SET reminded_at = 'x' WHERE role_id = ?`).bind(r).run();
    await env.DB.prepare(`UPDATE vol_dates SET approval_nudged_at = 'y' WHERE id = ?`).bind(d).run();
    expect(await updateDate(env, s.wardId, d, '2026-12-06', '09:00', NOW)).toEqual([]);
    const kept = await env.DB.prepare(`SELECT reminded_at FROM vol_signups WHERE role_id = ?`).bind(r).first<{ reminded_at: string | null }>();
    expect(kept!.reminded_at).toBe('x');
    const nudge = await env.DB.prepare(`SELECT approval_nudged_at FROM vol_dates WHERE id = ?`).bind(d).first<{ approval_nudged_at: string | null }>();
    expect(nudge!.approval_nudged_at).toBe('y');
    expect(await updateDate(env, s.wardId, d, '2026-12-06', '10:00', NOW)).toHaveLength(1);
    const reset = await env.DB.prepare(`SELECT reminded_at FROM vol_signups WHERE role_id = ?`).bind(r).first<{ reminded_at: string | null }>();
    expect(reset!.reminded_at).toBeNull();
    // A date already over can't be moved (its volunteers would land on a date they never
    // chose); Copy date reuses it. Editing a past role's time emails no one.
    const past = await addDate(env, s.wardId, postId, '2026-11-01', '09:00');
    const pr = await addRole(env, s.wardId, past, role());
    await addVolunteer(s.wardId, postId, pr, 'confirmed');
    await expect(updateDate(env, s.wardId, past, '2026-11-28', '09:00', NOW)).rejects.toThrow('use Copy date');
    const still = await env.DB.prepare(`SELECT date FROM vol_dates WHERE id = ?`).bind(past).first<{ date: string }>();
    expect(still!.date).toBe('2026-11-01');
    expect(await updateRole(env, s.wardId, pr, role({ start_time: '11:00' }), NOW)).toEqual([]);
  });

  it('deletePost tells confirmed (and verified waiting) volunteers and removes every row', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const d = await addDate(env, s.wardId, postId, '2026-12-06', '09:00');
    const r = await addRole(env, s.wardId, d, role({ needed: 5 }));
    const v1 = await addVolunteer(s.wardId, postId, r, 'confirmed');
    const v2 = await addVolunteer(s.wardId, postId, r, 'waiting', true);
    await addVolunteer(s.wardId, postId, r, 'waiting', false);
    const msgs = await deletePost(env, s.wardId, postId, NOW);
    expect(msgs.map((m) => m.kind)).toEqual(['vol_removed', 'vol_removed']);
    expect(msgs.map((m) => m.to).sort()).toEqual([v1.email, v2.email].sort());
    for (const t of ['vol_posts', 'vol_dates', 'vol_roles', 'vol_signups']) {
      const col = t === 'vol_posts' ? 'id' : 'post_id';
      const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${col} = ?`).bind(postId).first<{ n: number }>();
      expect(n!.n, t).toBe(0);
    }
  });

  it('deleteRole / deleteDate tell volunteers too; nothing for a date already over', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const past = await addDate(env, s.wardId, postId, '2026-11-01', null);
    const rp = await addRole(env, s.wardId, past, role());
    await addVolunteer(s.wardId, postId, rp, 'confirmed');
    expect(await deleteDate(env, s.wardId, past, NOW)).toHaveLength(0);
    const d = await addDate(env, s.wardId, postId, '2026-12-06', null);
    const r = await addRole(env, s.wardId, d, role());
    await addVolunteer(s.wardId, postId, r, 'confirmed');
    expect(await deleteRole(env, s.wardId, r, NOW)).toHaveLength(1);
  });

  it('ids from another ward behave as not found', async () => {
    const s = await setup();
    const other = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const d = await addDate(env, s.wardId, postId, '2026-12-06', null);
    await expect(addDate(env, other.wardId, postId, '2026-12-07', null)).rejects.toThrow(VolInputError);
    await expect(addRole(env, other.wardId, d, role())).rejects.toThrow(VolInputError);
    expect(await deletePost(env, other.wardId, postId, NOW)).toEqual([]);
    expect(await getPost(env, s.wardId, postId)).not.toBeNull();
    // A space from another ward can't hold this ward's post.
    await expect(createPost(env, s.wardId, other.eq, s.pres, postInput())).rejects.toThrow(VolInputError);
  });

  it('listWardPosts: past vs open, short_soon at 10 days but not 20', async () => {
    const s = await setup();
    const today = wardToday('America/Denver', NOW);
    const mk = async (title: string, date: string, needed = 2) => {
      const id = await createPost(env, s.wardId, s.eq, s.pres, postInput({ title }));
      const d = await addDate(env, s.wardId, id, date, null);
      await addRole(env, s.wardId, d, role({ needed }));
      return id;
    };
    const yesterday = await mk('Yesterday', addDays(today, -1));
    const ten = await mk('Ten days', addDays(today, 10));
    const twenty = await mk('Twenty days', addDays(today, 20));
    const open = await listWardPosts(env, s.wardId, { past: false, now: NOW });
    const past = await listWardPosts(env, s.wardId, { past: true, now: NOW });
    expect(open.map((p) => p.id)).toEqual([ten, twenty]);
    expect(past.map((p) => p.id)).toEqual([yesterday]);
    expect(open.find((p) => p.id === ten)!.short_soon).toBe(true);
    expect(open.find((p) => p.id === twenty)!.short_soon).toBe(false);
    expect(open[0]).toMatchObject({ confirmed: 0, needed: 2, waiting: 0, org_name: 'Elders Quorum' });
    const bySpace = await listWardPosts(env, s.wardId, { past: false, now: NOW, spaceId: s.spaces['relief-society'] });
    expect(bySpace).toHaveLength(0);
  });

  it('validation errors', async () => {
    const s = await setup();
    const postId = await createPost(env, s.wardId, s.eq, s.pres, postInput());
    const d = await addDate(env, s.wardId, postId, '2026-12-06', null);
    await expect(addRole(env, s.wardId, d, role({ needed: 0 }))).rejects.toThrow(VolInputError);
    await expect(addRole(env, s.wardId, d, role({ needed: 501 }))).rejects.toThrow(VolInputError);
    await expect(addRole(env, s.wardId, d, role({ start_time: '10:00', end_time: '09:00' }))).rejects.toThrow(VolInputError);
    await expect(addRole(env, s.wardId, d, role({ name: '' }))).rejects.toThrow(VolInputError);
    await expect(addDate(env, s.wardId, postId, '2026-02-30', null)).rejects.toThrow(VolInputError);
    await expect(addDate(env, s.wardId, postId, '2026-12-06', '25:00')).rejects.toThrow(VolInputError);
    await expect(createPost(env, s.wardId, s.eq, s.pres, postInput({ title: '' }))).rejects.toThrow(VolInputError);
    await expect(createPost(env, s.wardId, s.eq, s.pres, postInput({ title: 'x'.repeat(121) }))).rejects.toThrow(VolInputError);
    await expect(createPost(env, s.wardId, s.eq, s.pres, postInput({ cancel_cutoff_hours: 337 }))).rejects.toThrow(VolInputError);
    // A space that doesn't own the chosen category, the public space, and no audience at all.
    const cats = await listCategories(env, s.wardId, {});
    const meal = cats.find((x) => x.slug === 'meal')!.id;
    const req = cats.find((x) => x.slug === 'req-moving')!.id;
    await expect(createPost(env, s.wardId, s.spaces['ward-council']!, s.pres, postInput({ categoryId: meal }))).rejects.toThrow(VolInputError);
    await expect(createPost(env, s.wardId, s.spaces['public']!, s.pres, postInput())).rejects.toThrow(VolInputError);
    await expect(createPost(env, s.wardId, s.eq, s.pres, postInput({ categoryId: req }))).rejects.toThrow(VolInputError);
    await expect(createPost(env, s.wardId, s.eq, s.pres, postInput({ audiences: ['bogus'] }))).rejects.toThrow(VolInputError);
    await expect(updatePost(env, s.wardId, postId, postInput({ audiences: [] }))).rejects.toThrow(VolInputError);
    await expect(updatePost(env, s.wardId, postId, postInput({ public_note: 'x'.repeat(4001) }))).rejects.toThrow(VolInputError);
    await env.DB.prepare(`UPDATE spaces SET archived = 1 WHERE id = ?`).bind(s.spaces['primary']).run();
    await expect(createPost(env, s.wardId, s.spaces['primary']!, s.pres, postInput())).rejects.toThrow(VolInputError);
  });
});

describe('createPost never stores a post without a category', () => {
  it('throws VolInputError when no category can be resolved', async () => {
    const s = await setup();
    // A space that owns no opportunity category falls back to helping-hand; hide that lookup.
    const db = new Proxy(env.DB, {
      get(target, prop) {
        if (prop === 'prepare') return (sql: string) => target.prepare(sql.replace("slug = 'helping-hand'", "slug = 'no-such-category'"));
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
    const before = await env.DB.prepare(`SELECT COUNT(*) AS n FROM vol_posts WHERE ward_id = ?`).bind(s.wardId).first<{ n: number }>();
    await expect(createPost({ ...env, DB: db } as typeof env, s.wardId, s.spaces['young-men']!, s.pres, postInput())).rejects.toThrow(VolInputError);
    const after = await env.DB.prepare(`SELECT COUNT(*) AS n FROM vol_posts WHERE ward_id = ?`).bind(s.wardId).first<{ n: number }>();
    expect(after!.n).toBe(before!.n);
    const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM vol_posts WHERE category_id IS NULL AND ward_id = ?`).bind(s.wardId).first<{ n: number }>();
    expect(n!.n).toBe(0);
  });
});
