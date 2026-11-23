import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser } from './helpers';
import { makeCast, type Cast } from './cast';
import { addDate, addRole, createPost } from '../src/lib/volPosts';
import { addDays, wardToday } from '../src/lib/wardTime';
import { catId } from './volFixtures';

async function page(uid: string, wardId: string, spaceId: string): Promise<string> {
  const res = await SELF.fetch(`http://localhost/w/${wardId}/space/${spaceId}`, { headers: { cookie: await asUser(uid) } });
  expect(res.status).toBe(200);
  return res.text();
}

function section(html: string): string {
  const i = html.indexOf('id="volunteer-posts"');
  return i < 0 ? '' : html.slice(i);
}

describe('volunteer sections on space pages', () => {
  let c: Cast;
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    c = await makeCast();
    const today = wardToday('America/Denver', new Date());
    const mk = async (key: string, space: string, title: string, date: string) => {
      const categoryId = await catId(c.wardId, space === 'relief-society' ? 'meal' : 'move');
      const id = await createPost(env, c.wardId, c.spaces[space]!, c.eqPres, { title, public_note: null, private_details: null, cancel_cutoff_hours: 24, categoryId });
      const d = await addDate(env, c.wardId, id, date, null);
      await addRole(env, c.wardId, d, { name: 'Helpers', needed: 3, start_time: null, end_time: null, note: null, bring_prompt: null });
      ids[key] = id;
    };
    // eqPres can't create for RS via the UI, but the data layer doesn't check; fine for fixtures.
    await mk('soon', 'elders-quorum', 'EQ soon post', addDays(today, 10));
    await mk('later', 'elders-quorum', 'EQ later post', addDays(today, 20));
    await mk('past', 'elders-quorum', 'EQ past post', addDays(today, -3));
    await mk('rs', 'relief-society', 'RS meals post', addDays(today, 5));
  });

  it('Ward Council page: every open post, grouped by organization, short-and-soon first; past only under Past', async () => {
    const s = section(await page(c.rsPres, c.wardId, c.spaces['ward-council']!));
    expect(s).toContain('EQ soon post');
    expect(s).toContain('EQ later post');
    expect(s).toContain('RS meals post');
    expect(s).toContain('Elders Quorum');
    expect(s).toContain('Relief Society');
    const shortSoon = s.slice(s.indexOf('Short and soon'), s.indexOf('id="vol-open"'));
    expect(shortSoon).toContain('EQ soon post');
    expect(shortSoon).toContain('RS meals post');
    expect(shortSoon).not.toContain('EQ later post');
    const past = s.slice(s.indexOf('id="vol-past"'));
    expect(past).toContain('EQ past post');
    expect(s.slice(0, s.indexOf('id="vol-past"'))).not.toContain('EQ past post');
    expect(s).toContain(`/w/${c.wardId}/vol/${ids.soon}`);
    expect(s).toContain('0 of 3 filled');
    // Ward council members can't copy (no create rights for EQ).
    expect(s).not.toContain(`/w/${c.wardId}/vol/${ids.past}/copy`);
  });

  // One space-page view per test (each runs ~150 D1 queries).
  it("an org page shows that org's posts only, with New and Copy for its managers", async () => {
    const s = section(await page(c.eqPres, c.wardId, c.spaces['elders-quorum']!));
    expect(s).toContain('EQ soon post');
    expect(s).not.toContain('RS meals post');
    expect(s).toContain(`/w/${c.wardId}/vol/new?space=${c.spaces['elders-quorum']}`);
    expect(s).toContain(`/w/${c.wardId}/vol/${ids.past}/copy`);
  });

  it("an org member who can't manage posts sees them, without New", async () => {
    const teacher = section(await page(c.eqTeacher, c.wardId, c.spaces['elders-quorum']!));
    expect(teacher).toContain('EQ soon post');
    expect(teacher).not.toContain('/vol/new');
  });

  it('the Ward Mission leader (not in ward council) does not see EQ posts on their page', async () => {
    const s = section(await page(c.wmLeader, c.wardId, c.spaces['ward-mission']!));
    expect(s).not.toContain('EQ soon post');
    expect(s).not.toContain('RS meals post');
  });

  it('the Bishopric page lists everything and links to the volunteers list', async () => {
    const s = section(await page(c.bishop, c.wardId, c.spaces['bishopric']!));
    expect(s).toContain('EQ soon post');
    expect(s).toContain('RS meals post');
    expect(s).toContain(`/w/${c.wardId}/volunteers`);
  });
});
