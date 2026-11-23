import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, makeLeader, uniqueEmail } from './helpers';
import { futureDate, catId } from './volFixtures';
import { addDate, addRole, createPost } from '../src/lib/volPosts';
import { submitSignup } from '../src/lib/volSignup';
import { makeServiceCast, type ServiceCast } from './serviceCast';
import { addDays, wardToday } from '../src/lib/wardTime';
import { listServePosts } from '../src/lib/serve';

async function page(path: string, cookie?: string) {
  const res = await SELF.fetch(`http://localhost${path}`, { headers: cookie ? { cookie } : {} });
  return { res, html: await res.text() };
}

function sectionOf(html: string, heading: string): string {
  const i = html.indexOf(`>${heading}</h2>`);
  if (i < 0) return '';
  const rest = html.slice(i + heading.length + 6);
  const j = rest.indexOf('</h2>');
  return j < 0 ? rest : rest.slice(0, j);
}

describe('public serve page /serve/:prefix', () => {
  let c: ServiceCast;
  const ids: Record<string, string> = {};
  const volunteerEmail = uniqueEmail('zz-volunteer-secret');
  beforeAll(async () => {
    c = await makeServiceCast();
    const mk = async (key: string, slug: string, space: string, title: string, date: string, needed: number, audiences?: string) => {
      const id = await createPost(env, c.wardId, c.spaces[space]!, c.rsPres, {
        title, public_note: 'Public words', private_details: 'PRIVATE-DOOR-CODE-9911', cancel_cutoff_hours: 24,
        categoryId: await catId(c.wardId, slug), audiences,
      });
      const d = await addDate(env, c.wardId, id, date, '10:00');
      const r = await addRole(env, c.wardId, d, { name: 'Helpers', needed, start_time: null, end_time: null, note: null, bring_prompt: null });
      ids[key] = id;
      ids[key + ':role'] = r;
    };
    const today = wardToday('America/Denver', new Date());
    await mk('temple', 'clean-temple', 'relief-society', 'Temple cleaning night', futureDate(12), 10);
    await mk('meal', 'meal', 'relief-society', 'Meals for the Ortegas', futureDate(5), 3);
    await mk('past', 'meal', 'relief-society', 'Old meal train', addDays(today, -4), 3);
    await mk('full', 'meal', 'relief-society', 'Already filled meal', futureDate(3), 1);
    await mk('youth', 'helping-hand', 'ward-council', 'Youth yard cleanup', futureDate(8), 6, 'youth,children');
    // Fill the "full" post with a ward member (approved at once) whose name and email must never show.
    await makeLeader(env, c.wardId, { email: volunteerEmail, name: 'Zelda Secretvolunteer' });
    await submitSignup(env, {
      wardId: c.wardId, postId: ids.full!, roleId: ids['full:role']!, name: 'Zelda Secretvolunteer', email: volunteerEmail, bringing: null, now: new Date(),
    });
  });

  it('groups posts by audience; a two-audience post shows under Brothers and Sisters', async () => {
    const { res, html } = await page(`/serve/${c.prefix}`);
    expect(res.status).toBe(200);
    expect(html).toContain('Service Opportunities');
    const brothers = sectionOf(html, 'Brothers');
    const sisters = sectionOf(html, 'Sisters');
    expect(brothers).toContain('Temple cleaning night');
    expect(sisters).toContain('Temple cleaning night');
    expect(sisters).toContain('Meals for the Ortegas');
    expect(brothers).not.toContain('Meals for the Ortegas');
    expect(sectionOf(html, 'Youth')).toContain('Youth yard cleanup');
    expect(html).toContain('A parent signs up for their child');
    expect(html).toContain('0 of 10 filled');
    expect(html).toContain(`/v/`);
  });

  it('a past post is absent; a filled post sorts last in its section with "Filled"', async () => {
    const { html } = await page(`/serve/${c.prefix}`);
    expect(html).not.toContain('Old meal train');
    const sisters = sectionOf(html, 'Sisters');
    expect(sisters.indexOf('Already filled meal')).toBeGreaterThan(sisters.indexOf('Meals for the Ortegas'));
    expect(sisters.indexOf('Already filled meal')).toBeGreaterThan(sisters.indexOf('Temple cleaning night'));
    expect(sisters.slice(sisters.indexOf('Already filled meal'))).toContain('Filled');
  });

  it('never shows names, emails, private details or the creator', async () => {
    const { html } = await page(`/serve/${c.prefix}`);
    expect(html).not.toContain('Zelda');
    expect(html).not.toContain(volunteerEmail.toLowerCase());
    expect(html).not.toContain('PRIVATE-DOOR-CODE');
    expect(html).not.toContain(c.emails.rsPres!);
  });

  it('is noindex both ways', async () => {
    const { res, html } = await page(`/serve/${c.prefix}`);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it('the QR and link use the ward short link when set, else the direct address', async () => {
    let { html } = await page(`/serve/${c.prefix}`);
    expect(html).toContain(`localhost:8787/serve/${c.prefix}`);
    await env.DB.prepare(`UPDATE wards SET serve_short_url = 'https://zippa.run/tServe' WHERE id = ?`).bind(c.wardId).run();
    ({ html } = await page(`/serve/${c.prefix}`));
    expect(html).toContain('zippa.run/tServe');
    expect(html).toContain('href="https://zippa.run/tServe"');
    await env.DB.prepare(`UPDATE wards SET serve_short_url = NULL WHERE id = ?`).bind(c.wardId).run();
  });

  it('the Create Service Opportunity button shows for a creator session, never anonymously', async () => {
    const anon = (await page(`/serve/${c.prefix}`)).html;
    expect(anon).not.toContain('Create Service Opportunity');
    const signedIn = (await page(`/serve/${c.prefix}`, await asUser(c.rsPres))).html;
    expect(signedIn).toContain('Create Service Opportunity');
    expect(signedIn).toContain(`/w/${c.wardId}/vol/new`);
    const plain = (await page(`/serve/${c.prefix}`, await asUser(c.plainMember))).html;
    expect(plain).not.toContain('Create Service Opportunity');
  });

  it('an unknown or suspended ward gets the branded 404, noindex', async () => {
    const r = await page('/serve/nosuchward');
    expect(r.res.status).toBe(404);
    expect(r.res.headers.get('x-robots-tag')).toBe('noindex');
    await env.DB.prepare(`UPDATE wards SET status = 'suspended' WHERE id = ?`).bind(c.wardId).run();
    expect((await page(`/serve/${c.prefix}`)).res.status).toBe(404);
    await env.DB.prepare(`UPDATE wards SET status = 'active' WHERE id = ?`).bind(c.wardId).run();
  });

  it('with nothing open: "No open opportunities right now."', async () => {
    const empty = await makeServiceCast();
    const { html } = await page(`/serve/${empty.prefix}`);
    expect(html).toContain('No open opportunities right now.');
    expect(await listServePosts(env, empty.wardId, new Date())).toEqual([]);
  });
});

describe('listServePosts loads only posts that can still show', () => {
  it('a long-past post is never loaded; a dateless post is skipped in SQL too', async () => {
    const c = await makeServiceCast();
    const today = wardToday('America/Denver', new Date());
    const mk = async (title: string, date: string | null) => {
      const id = await createPost(env, c.wardId, c.spaces['relief-society']!, c.rsPres, {
        title, public_note: null, private_details: null, cancel_cutoff_hours: 24, categoryId: await catId(c.wardId, 'meal'),
      });
      if (date) {
        const d = await addDate(env, c.wardId, id, date, '10:00');
        await addRole(env, c.wardId, d, { name: 'Cooks', needed: 2, start_time: null, end_time: null, note: null, bring_prompt: null });
      }
      return id;
    };
    const old = await mk('Ancient meal', addDays(today, -400));
    const none = await mk('No dates yet', null);
    const live = await mk('Live meal', futureDate(4));
    // Record every post id the page loads with getPost (SELECT * FROM vol_posts WHERE id = ?).
    const loaded: unknown[] = [];
    const db = new Proxy(env.DB, {
      get(target, prop) {
        if (prop === 'prepare') {
          return (sql: string) => {
            const st = target.prepare(sql);
            if (!sql.startsWith('SELECT * FROM vol_posts WHERE id = ?')) return st;
            return new Proxy(st, {
              get(t, p) {
                if (p === 'bind') return (...args: unknown[]) => (loaded.push(args[0]), t.bind(...args));
                const v = Reflect.get(t, p, t);
                return typeof v === 'function' ? v.bind(t) : v;
              },
            });
          };
        }
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
    const sections = await listServePosts({ ...env, DB: db } as typeof env, c.wardId, new Date());
    expect(sections.flatMap((s) => s.entries.map((e) => e.title))).toEqual(['Live meal']);
    expect(loaded).toContain(live);
    expect(loaded).not.toContain(old);
    expect(loaded).not.toContain(none);
  });
});
