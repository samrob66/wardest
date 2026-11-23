import { describe, it, expect } from 'vitest';
import { env, makeWard } from './helpers';
import { newId } from '../src/lib/ids';
import {
  AUDIENCES, DEFAULT_CATEGORIES, ICONS, ensureServiceCategories, getCategory, listCategories, parseAudiences,
} from '../src/lib/serviceCategories';

async function bySlug(wardId: string) {
  const all = await listCategories(env, wardId, { includeArchived: true });
  return Object.fromEntries(all.map((c) => [c.slug, c]));
}

async function ownerSlugs(wardId: string, categoryId: string): Promise<string[]> {
  const c = (await getCategory(env, wardId, categoryId))!;
  if (!c.spaces.length) return [];
  const rows = await env.DB.prepare(`SELECT slug FROM spaces WHERE id IN (${c.spaces.map(() => '?').join(',')})`)
    .bind(...c.spaces.map((s) => s.id))
    .all<{ slug: string }>();
  return rows.results.map((r) => r.slug).sort();
}

describe('service categories: defaults', () => {
  it('new ward gets the 11 default categories with the owners above', async () => {
    const w = await makeWard(env);
    const rows = await env.DB.prepare(`SELECT slug FROM service_categories WHERE ward_id = ? ORDER BY position`)
      .bind(w.wardId)
      .all<{ slug: string }>();
    expect(rows.results.map((r) => r.slug)).toEqual([
      'meal', 'helping-hand', 'activity', 'clean-building', 'clean-temple', 'sub-primary', 'sub-sunday-school', 'move',
      'req-moving', 'req-christmas', 'req-other',
    ]);
    const c = await bySlug(w.wardId);
    expect(await ownerSlugs(w.wardId, c.meal!.id)).toEqual(['relief-society']);
    expect(await ownerSlugs(w.wardId, c['helping-hand']!.id)).toEqual(['ward-council']);
    expect(await ownerSlugs(w.wardId, c.activity!.id)).toEqual(['activities-committee']);
    expect(await ownerSlugs(w.wardId, c['clean-building']!.id)).toEqual(['bishopric']);
    expect(await ownerSlugs(w.wardId, c['sub-primary']!.id)).toEqual(['primary']);
    expect(await ownerSlugs(w.wardId, c['sub-sunday-school']!.id)).toEqual(['sunday-school']);
    expect(await ownerSlugs(w.wardId, c.move!.id)).toEqual(['elders-quorum']);
    expect(await ownerSlugs(w.wardId, c['req-moving']!.id)).toEqual(['elders-quorum']);
    expect(await ownerSlugs(w.wardId, c['req-christmas']!.id)).toEqual(['bishopric']);
    expect(await ownerSlugs(w.wardId, c['req-other']!.id)).toEqual(['bishopric']);
    expect(c.meal!.default_audiences).toBe('sisters');
    expect(c.move!.default_audiences).toBe('brothers');
    expect(c['clean-temple']!.default_audiences).toBe('brothers,sisters');
    expect(c['helping-hand']!.council_may_create).toBe(1);
    expect(c['req-moving']!.opportunity_category_id).toBe(c.move!.id);
    expect(c['req-moving']!.kind).toBe('request');
    for (const d of DEFAULT_CATEGORIES) expect(ICONS[d.icon], d.icon).toContain('<svg');
  });

  it('clean-temple has two owning spaces', async () => {
    const w = await makeWard(env);
    const c = await bySlug(w.wardId);
    expect(await ownerSlugs(w.wardId, c['clean-temple']!.id)).toEqual(['elders-quorum', 'relief-society']);
  });

  it('req-christmas and req-other are confidential; nothing else is', async () => {
    const w = await makeWard(env);
    const c = await bySlug(w.wardId);
    const conf = Object.values(c).filter((x) => x.confidential).map((x) => x.slug).sort();
    expect(conf).toEqual(['req-christmas', 'req-other']);
  });

  it('ensureServiceCategories is idempotent and keeps a renamed category', async () => {
    const w = await makeWard(env);
    const c = await bySlug(w.wardId);
    await env.DB.prepare(`UPDATE service_categories SET name = 'Meals for Families' WHERE id = ?`).bind(c.meal!.id).run();
    await ensureServiceCategories(env, w.wardId);
    await ensureServiceCategories(env, w.wardId);
    const after = await listCategories(env, w.wardId, { includeArchived: true });
    expect(after).toHaveLength(11);
    expect(after.find((x) => x.slug === 'meal')!.name).toBe('Meals for Families');
    const spaces = await env.DB.prepare(`SELECT COUNT(*) AS n FROM service_category_spaces WHERE ward_id = ?`)
      .bind(w.wardId)
      .first<{ n: number }>();
    expect(spaces!.n).toBe(12); // clean-temple has two
  });

  it('a missing default is re-added; an archived owner space falls back to the bishopric', async () => {
    const w = await makeWard(env);
    await env.DB.prepare(`UPDATE spaces SET archived = 1 WHERE id = ?`).bind(w.spaces['activities-committee']).run();
    await env.DB.prepare(`DELETE FROM service_categories WHERE ward_id = ? AND slug = 'activity'`).bind(w.wardId).run();
    await ensureServiceCategories(env, w.wardId);
    const c = await bySlug(w.wardId);
    expect(await ownerSlugs(w.wardId, c.activity!.id)).toEqual(['bishopric']);
  });

  it('listCategories filters by kind and hides archived unless asked', async () => {
    const w = await makeWard(env);
    const c = await bySlug(w.wardId);
    await env.DB.prepare(`UPDATE service_categories SET archived = 1 WHERE id = ?`).bind(c.activity!.id).run();
    const opp = await listCategories(env, w.wardId, { kind: 'opportunity' });
    expect(opp.map((x) => x.slug)).not.toContain('activity');
    expect(opp.every((x) => x.kind === 'opportunity')).toBe(true);
    const req = await listCategories(env, w.wardId, { kind: 'request' });
    expect(req.map((x) => x.slug)).toEqual(['req-moving', 'req-christmas', 'req-other']);
  });

  it('getCategory is ward-scoped and lists spaces and delegates', async () => {
    const w = await makeWard(env);
    const other = await makeWard(env);
    const c = await bySlug(w.wardId);
    expect(await getCategory(env, other.wardId, c.meal!.id)).toBeNull();
    const full = (await getCategory(env, w.wardId, c.meal!.id))!;
    expect(full.spaces.map((s) => s.kind)).toEqual(['org']);
    expect(full.delegates).toEqual([]);
  });

  it('the webhook URL itself is never on a listed row (only whether one is set and its last 4)', async () => {
    const w = await makeWard(env);
    const c = await bySlug(w.wardId);
    await env.DB.prepare(`UPDATE service_categories SET discord_webhook_url = 'https://discord.com/api/webhooks/1/abcdWXYZ' WHERE id = ?`)
      .bind(c.meal!.id)
      .run();
    const row = (await bySlug(w.wardId)).meal!;
    expect(JSON.stringify(row)).not.toContain('discord.com');
    expect(row.has_webhook).toBe(1);
    expect(row.webhook_tail).toBe('WXYZ');
    expect(JSON.stringify(await getCategory(env, w.wardId, c.meal!.id))).not.toContain('discord.com');
  });
});

describe('audiences', () => {
  it('parseAudiences canonicalises and drops unknowns', () => {
    expect(AUDIENCES).toEqual(['brothers', 'sisters', 'youth', 'children']);
    expect(parseAudiences('sisters, brothers,bogus,sisters')).toEqual(['brothers', 'sisters']);
    expect(parseAudiences(['children', 'YOUTH', 'x'])).toEqual(['youth', 'children']);
    expect(parseAudiences('')).toEqual([]);
  });
});

describe('post category backfill', () => {
  it('a post with NULL category gets its org category on ensure; an org with none gets helping-hand', async () => {
    const w = await makeWard(env);
    const eqPost = newId('vp');
    const ymPost = newId('vp');
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO vol_posts (id, ward_id, space_id, public_id, title) VALUES (?, ?, ?, ?, 'EQ')`)
        .bind(eqPost, w.wardId, w.spaces['elders-quorum'], newId('pub')),
      env.DB.prepare(`INSERT INTO vol_posts (id, ward_id, space_id, public_id, title) VALUES (?, ?, ?, ?, 'YM')`)
        .bind(ymPost, w.wardId, w.spaces['young-men'], newId('pub')),
    ]);
    await ensureServiceCategories(env, w.wardId);
    const c = await bySlug(w.wardId);
    const cat = async (id: string) =>
      (await env.DB.prepare(`SELECT category_id FROM vol_posts WHERE id = ?`).bind(id).first<{ category_id: string }>())!.category_id;
    // EQ owns clean-temple (position 4) and move (position 7): the lowest position wins.
    expect(await cat(eqPost)).toBe(c['clean-temple']!.id);
    expect(await cat(ymPost)).toBe(c['helping-hand']!.id);
  });
});
