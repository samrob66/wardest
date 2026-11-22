import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, makeWard, makeLeader, uniqueEmail } from './helpers';
import { addDate, addRole, createPost, getPost } from '../src/lib/volPosts';
import { submitSignup } from '../src/lib/volSignup';
import { newId } from '../src/lib/ids';
import { addDays, wardToday } from '../src/lib/wardTime';

async function confirmedVolunteer(wardId: string, postId: string, roleId: string, name: string, email: string, bringing: string | null) {
  const vid = newId('vv');
  await env.DB.prepare(
    `INSERT INTO volunteers (id, ward_id, email, name, approval, email_verified_at) VALUES (?, ?, ?, ?, 'approved', datetime('now'))`,
  )
    .bind(vid, wardId, email, name)
    .run();
  await env.DB.prepare(
    `INSERT INTO vol_signups (id, ward_id, post_id, role_id, volunteer_id, status, bringing, confirmed_at)
     VALUES (?, ?, ?, ?, ?, 'confirmed', ?, datetime('now'))`,
  )
    .bind(newId('vs'), wardId, postId, roleId, vid, bringing)
    .run();
}

async function setup(date?: string) {
  const w = await makeWard(env);
  const pres = await makeLeader(env, w.wardId, { email: uniqueEmail('pres'), spaces: [['relief-society', 'owner']] });
  const day = date ?? addDays(wardToday('America/Denver', new Date()), 10);
  const postId = await createPost(env, w.wardId, w.spaces['relief-society']!, pres, {
    title: 'Meals for the Parkers', public_note: 'New baby! Please drop meals by 5 PM.', private_details: 'Door code 4242, nut allergy',
    cancel_cutoff_hours: 24,
  });
  const d = await addDate(env, w.wardId, postId, day, '17:00');
  const meal = await addRole(env, w.wardId, d, { name: 'Dinner', needed: 2, start_time: null, end_time: null, note: 'Leave on porch', bring_prompt: 'What are you bringing?' });
  const dessert = await addRole(env, w.wardId, d, { name: 'Dessert', needed: 1, start_time: null, end_time: null, note: null, bring_prompt: null });
  const post = (await getPost(env, w.wardId, postId))!;
  return { ...w, postId, meal, dessert, post };
}

describe('public post page', () => {
  it('shows counts and what is brought, never names, emails or private details', async () => {
    const s = await setup();
    const email = uniqueEmail('zed');
    await confirmedVolunteer(s.wardId, s.postId, s.meal, 'Zed Unique', email, 'lasagna');
    await confirmedVolunteer(s.wardId, s.postId, s.dessert, 'Yara Unique', uniqueEmail('yara'), null);
    const res = await SELF.fetch(`http://localhost/v/${s.post.public_id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    const html = await res.text();
    expect(html).toContain('lasagna');
    expect(html).toContain('1 of 2');
    expect(html).toContain('Relief Society');
    expect(html).toContain('Meals for the Parkers');
    expect(html).toContain("address emailed once you're confirmed");
    expect(html).not.toContain('Zed Unique');
    expect(html).not.toContain('Yara Unique');
    expect(html).not.toContain(email);
    expect(html).not.toContain('4242');
    expect(html).not.toContain('nut allergy');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toMatch(/<meta property="og:title" content="Relief Society · Meals for the Parkers">/);
    expect(html).toContain('og:description');
    expect(html).toContain('2 of 3 filled');
    // Dessert is full: Filled and no form for it; Dinner still has one.
    expect(html).toContain('Filled ✓');
    expect(html).toContain(`name="role_id" value="${s.meal}"`);
    expect(html).not.toContain(`name="role_id" value="${s.dessert}"`);
    expect(html).toContain(`/vol/${s.prefix}/me`);
    expect(html).toContain('cf-turnstile');
  });

  it('shows "n of m filled" only; the waiting count is for leaders', async () => {
    const s = await setup();
    await submitSignup(env, { wardId: s.wardId, postId: s.postId, roleId: s.meal, name: 'W', email: uniqueEmail('w'), bringing: null, now: new Date() });
    const html = await (await SELF.fetch(`http://localhost/v/${s.post.public_id}`)).text();
    expect(html).toContain('0 of 3 filled');
    expect(html).not.toMatch(/waiting/i);
  });

  it('a past post says it is over and has no forms', async () => {
    const s = await setup('2026-01-10');
    const html = await (await SELF.fetch(`http://localhost/v/${s.post.public_id}`)).text();
    expect(html).toContain('This opportunity is over');
    expect(html).not.toContain('<form');
  });

  it('unknown id -> 404', async () => {
    const res = await SELF.fetch('http://localhost/v/nope-not-a-real-id');
    expect(res.status).toBe(404);
  });

  it('escapes user text', async () => {
    const s = await setup();
    await env.DB.prepare(`UPDATE vol_posts SET title = '<img src=x onerror=alert(1)>' WHERE id = ?`).bind(s.postId).run();
    const html = await (await SELF.fetch(`http://localhost/v/${s.post.public_id}`)).text();
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});
