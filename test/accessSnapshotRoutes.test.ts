// Pages that list categories take their access snapshot before listCategories puts back a
// missing default (ensureServiceCategories). The re-inserted category must still be decided and
// placed like any other (serviceAccess.coveringCategories). A fresh ward per test, its
// sub-primary default deleted just before the page view. Invented people only.
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { asUser, env, makeLeader, makeWard, uniqueEmail } from './helpers';

async function wardWithoutSubPrimary() {
  const w = await makeWard(env);
  const primaryPres = await makeLeader(env, w.wardId, { email: uniqueEmail('primaryPres'), spaces: [['primary', 'owner']] });
  const bishop = await makeLeader(env, w.wardId, { email: uniqueEmail('bishop'), spaces: [['bishopric', 'owner']] });
  await env.DB.prepare(`DELETE FROM service_categories WHERE ward_id = ? AND slug = 'sub-primary'`).bind(w.wardId).run();
  return { ...w, primaryPres, bishop };
}

async function page(userId: string, path: string): Promise<string> {
  const res = await SELF.fetch(`http://localhost${path}`, { headers: { cookie: await asUser(userId) } });
  expect(res.status, path).toBe(200);
  return res.text();
}

describe('a default category re-inserted during the request', () => {
  it('the Primary page still offers its president New (the category is owned by Primary)', async () => {
    const w = await wardWithoutSubPrimary();
    const html = await page(w.primaryPres, `/w/${w.wardId}/space/${w.spaces.primary}`);
    expect(html).toContain(`/w/${w.wardId}/vol/new?space=${w.spaces.primary}`);
  });

  it("the picker narrowed to Primary lists only Primary's category for the bishop", async () => {
    const w = await wardWithoutSubPrimary();
    const html = await page(w.bishop, `/w/${w.wardId}/vol/new?space=${w.spaces.primary}`);
    const sub = await env.DB.prepare(`SELECT id FROM service_categories WHERE ward_id = ? AND slug = 'sub-primary'`)
      .bind(w.wardId)
      .first<{ id: string }>();
    const meal = await env.DB.prepare(`SELECT id FROM service_categories WHERE ward_id = ? AND slug = 'meal'`)
      .bind(w.wardId)
      .first<{ id: string }>();
    expect(html).toContain(`?category=${sub!.id}`);
    expect(html).not.toContain(`?category=${meal!.id}`);
  });
});
