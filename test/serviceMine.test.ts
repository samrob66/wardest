import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, makeLeader, uniqueEmail } from './helpers';
import { addDelegate, makeServiceCast, type ServiceCast } from './serviceCast';
import { futureDate } from './volFixtures';
import { addDate, addRole, createPost } from '../src/lib/volPosts';
import { submitSignup } from '../src/lib/volSignup';
import { addDays, wardToday } from '../src/lib/wardTime';

async function mine(uid: string, wardId: string) {
  const res = await SELF.fetch(`http://localhost/w/${wardId}/service/mine`, { headers: { cookie: await asUser(uid) } });
  return { status: res.status, html: await res.text() };
}

describe('My service opportunities', () => {
  let c: ServiceCast;
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    c = await makeServiceCast();
    await addDelegate(c.wardId, c.cat.meal!.id, c.mealDelegate, c.rsPres);
    const mk = async (key: string, slug: string, space: string, by: string, title: string, date: string) => {
      const id = await createPost(env, c.wardId, c.spaces[space]!, by, {
        title, public_note: null, private_details: null, cancel_cutoff_hours: 24, categoryId: c.cat[slug]!.id, audiences: 'sisters,youth',
      });
      const d = await addDate(env, c.wardId, id, date, '17:00');
      ids[key + ':role'] = await addRole(env, c.wardId, d, { name: 'Cooks', needed: 4, start_time: null, end_time: null, note: null, bring_prompt: null });
      ids[key + ':date'] = d;
      ids[key] = id;
    };
    await mk('presMeal', 'meal', 'relief-society', c.rsPres, 'Meals by the president', futureDate(6));
    await mk('delMeal', 'meal', 'relief-society', c.mealDelegate, 'Meals by the coordinator', futureDate(9));
    await mk('pastMeal', 'meal', 'relief-society', c.rsPres, 'An old meal train', addDays(wardToday('America/Denver', new Date()), -5));
    await mk('move', 'move', 'elders-quorum', c.eqPres, 'EQ move-out', futureDate(7));
    // Sign-ups with names, a child, and someone waiting for approval.
    const email = uniqueEmail('mom');
    await makeLeader(env, c.wardId, { email, name: 'Martha Mom' });
    const base = { wardId: c.wardId, postId: ids.presMeal!, roleId: ids['presMeal:role']!, email, bringing: null, now: new Date() };
    await submitSignup(env, { ...base, name: 'Martha Mom' });
    await submitSignup(env, { ...base, name: 'Martha Mom', child: 'Ana' });
    await env.DB.prepare(`INSERT INTO volunteers (id, ward_id, email, name, approval, email_verified_at) VALUES ('vv_wait_' || ?, ?, ?, 'Wendy Waiting', 'pending', datetime('now'))`)
      .bind(c.wardId, c.wardId, uniqueEmail('wait'))
      .run();
    await env.DB.prepare(`INSERT INTO vol_signups (id, ward_id, post_id, role_id, volunteer_id, status) VALUES ('vs_wait_' || ?, ?, ?, ?, 'vv_wait_' || ?, 'waiting')`)
      .bind(c.wardId, c.wardId, ids.presMeal, ids['presMeal:role'], c.wardId)
      .run();
    await env.DB.prepare(`INSERT INTO vol_warn_sent (id, ward_id, date_id, user_id, sent_at) VALUES ('vws_' || ?, ?, ?, ?, '2026-11-20T12:00:00.000Z')`)
      .bind(c.wardId, c.wardId, ids['presMeal:date'], c.mealDelegate)
      .run();
  });

  it("a delegate sees every meal post, the president's included, with fill, names, approvals and warnings", async () => {
    const { status, html } = await mine(c.mealDelegate, c.wardId);
    expect(status).toBe(200);
    expect(html).toContain('Meals by the president');
    expect(html).toContain('Meals by the coordinator');
    expect(html).not.toContain('EQ move-out');
    expect(html).toContain('Cooks');
    expect(html).toContain('2 of 4 filled');
    expect(html).toContain('Martha Mom');
    expect(html).toContain('Ana (signed up by Martha Mom)');
    expect(html).toContain('1 waiting for approval');
    expect(html).toContain(`/w/${c.wardId}/vol/${ids.presMeal}`);
    expect(html).toMatch(/warning sent/i);
    // Upcoming first; past ones collapsed below.
    const past = html.indexOf('id="mine-past"');
    expect(past).toBeGreaterThan(html.indexOf('Meals by the coordinator'));
    expect(html.indexOf('An old meal train')).toBeGreaterThan(past);
  });

  it('a creator still sees their own post after their delegation is removed', async () => {
    await env.DB.prepare(`DELETE FROM service_delegates WHERE ward_id = ? AND user_id = ?`).bind(c.wardId, c.mealDelegate).run();
    const { html } = await mine(c.mealDelegate, c.wardId);
    expect(html).toContain('Meals by the coordinator');
    expect(html).not.toContain('Meals by the president');
    await addDelegate(c.wardId, c.cat.meal!.id, c.mealDelegate, c.rsPres);
  });

  it('a member with neither sees an empty page', async () => {
    const { status, html } = await mine(c.plainMember, c.wardId);
    expect(status).toBe(200);
    expect(html).toContain('Nothing yet');
    expect((await mine(c.stranger, c.wardId)).status).toBe(403);
  });
});
