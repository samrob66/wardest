// D1 statement counts for the leader pages that check permissions per category or per post
// (plan 2026-11-23-access-batching, Task 2). Each test views a page once with the ward's 11
// default categories, adds 20 more categories, and views it again: the count must not grow
// with the number of categories, and must stay small.
//
// Counts before the batching (main @ b44a212), 11 -> 31 categories:
//   service hub: RS president 204 -> 459, bishop 99 -> 249
//   Relief Society space page: RS president 130 -> 275
//   Ward Council space page: RS president 135 -> 280, counselor 80 -> 155
//   Bishopric space page: bishop 80 -> 155
//   Public space page: bishop 9 -> 9
//   ward page: RS president 23 -> 23, bishop 24 -> 24, plain member 201 -> 541 (hasServiceRole
//     stops at the first category for a leader, walks them all for everyone else)
//   category picker (/vol/new): RS president 96 -> 241, bishop 47 -> 122
//   My service opportunities: 17 -> 17 (both)
//   requests inbox: bishop 20 -> 40, EQ president 25 -> 65
// and 1 -> 11 posts: Relief Society page 130 -> 160; Ward Council page RS president 119 -> 179,
// counselor 72 -> 152; Bishopric page 74 -> 154; My service opportunities 17 -> 147 (13 per post).
//
// After (one AccessSnapshot per request; loadAccess is one batch of 5 statements), the same
// whatever the number of categories or posts: service hub 12 (both); Relief Society page 28;
// Ward Council page 23 (both); Bishopric page 25; Public page 9; ward page 24 (all three), 26
// since the Start here card (2026-11-23: one batch of 2, plus canViewImplementation only for a
// step's 'restricted' entry);
// category picker 11 (both); My service opportunities 17 + 7 per post; requests inbox 12 (both).
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { asUser, countQueries, env } from './helpers';
import { insertPost, makeServiceCast, type ServiceCast } from './serviceCast';
import { newId } from '../src/lib/ids';

const MAX = 30;
// getPost (5 statements) + its sign-ups + its warnings; the view check itself adds none.
const PER_POST_MINE = 7;

async function add20Categories(c: ServiceCast): Promise<void> {
  const stmts: D1PreparedStatement[] = [];
  const add = (kind: 'opportunity' | 'request', owner: string, council: number, i: number) => {
    const id = newId('scat');
    stmts.push(
      env.DB.prepare(
        `INSERT INTO service_categories (id, ward_id, kind, slug, name, council_may_create, position) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, c.wardId, kind, `extra-${i}`, `Extra ${i}`, council, 100 + i),
      env.DB.prepare(`INSERT INTO service_category_spaces (id, ward_id, category_id, space_id) VALUES (?, ?, ?, ?)`).bind(
        newId('scs'), c.wardId, id, c.spaces[owner]!,
      ),
    );
  };
  for (let i = 0; i < 10; i++) add('opportunity', 'relief-society', 0, i);
  for (let i = 10; i < 15; i++) add('opportunity', 'ward-council', 1, i);
  for (let i = 15; i < 20; i++) add('request', 'bishopric', 0, i);
  await env.DB.batch(stmts);
}

async function viewCount(path: string, userId: string): Promise<number> {
  const cookie = await asUser(userId);
  let status = 0;
  const n = await countQueries(async () => {
    const res = await SELF.fetch(`http://localhost${path}`, { headers: { cookie } });
    status = res.status;
    await res.text();
  });
  expect(status, path).toBe(200);
  return n;
}

type Who = 'rsPres' | 'bishop' | 'counselor' | 'eqPres' | 'plainMember';
const PAGES: Array<[name: string, path: (c: ServiceCast) => string, users: Who[]]> = [
  ['service hub', (c) => `/w/${c.wardId}/service`, ['rsPres', 'bishop']],
  ['Relief Society space page', (c) => `/w/${c.wardId}/space/${c.spaces['relief-society']}`, ['rsPres']],
  ['Ward Council space page', (c) => `/w/${c.wardId}/space/${c.spaces['ward-council']}`, ['rsPres', 'counselor']],
  ['Bishopric space page', (c) => `/w/${c.wardId}/space/${c.spaces.bishopric}`, ['bishop']],
  ['Public space page', (c) => `/w/${c.wardId}/space/${c.spaces.public}`, ['bishop']],
  ['ward page', (c) => `/w/${c.wardId}`, ['rsPres', 'bishop', 'plainMember']],
  ['category picker', (c) => `/w/${c.wardId}/vol/new`, ['rsPres', 'bishop']],
  ['My service opportunities', (c) => `/w/${c.wardId}/service/mine`, ['rsPres', 'bishop']],
  ['requests inbox', (c) => `/w/${c.wardId}/requests`, ['bishop', 'eqPres']],
];

describe('D1 statements per leader page do not grow with the number of categories', () => {
  for (const [name, path, users] of PAGES) {
    for (const who of users) {
      it(`${name} as ${who}`, async () => {
        const c = await makeServiceCast();
        await insertPost(c.wardId, { spaceId: c.spaces['relief-society']!, categoryId: c.cat.meal!.id, createdBy: c.rsPres, title: 'Meals' });
        await insertPost(c.wardId, { spaceId: c.spaces['ward-council']!, categoryId: c.cat['helping-hand']!.id, createdBy: c.bishop, title: 'Help' });
        const before = await viewCount(path(c), c[who]);
        await add20Categories(c);
        const after = await viewCount(path(c), c[who]);
        expect(after, `${name} as ${who}: ${before} with 11 categories, ${after} with 31`).toBe(before);
        expect(after).toBeLessThanOrEqual(MAX);
      }, 30_000);
    }
  }
});

// Space pages check every listed post; My service opportunities every post the person coordinates
// or created. Ten more posts (5 in Relief Society, 5 in Ward Council, all by the RS president).
async function add10Posts(c: ServiceCast): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await insertPost(c.wardId, { spaceId: c.spaces['relief-society']!, categoryId: c.cat.meal!.id, createdBy: c.rsPres, title: `Meal ${i}` });
    await insertPost(c.wardId, { spaceId: c.spaces['ward-council']!, categoryId: c.cat['helping-hand']!.id, createdBy: c.rsPres, title: `Hand ${i}` });
  }
}

const POST_PAGES: Array<[name: string, path: (c: ServiceCast) => string, users: Who[]]> = [
  ['Relief Society space page', (c) => `/w/${c.wardId}/space/${c.spaces['relief-society']}`, ['rsPres']],
  ['Ward Council space page', (c) => `/w/${c.wardId}/space/${c.spaces['ward-council']}`, ['rsPres', 'counselor']],
  ['Bishopric space page', (c) => `/w/${c.wardId}/space/${c.spaces.bishopric}`, ['bishop']],
];

describe('D1 statements per space page do not grow with the number of posts', () => {
  for (const [name, path, users] of POST_PAGES) {
    for (const who of users) {
      it(`${name} as ${who}`, async () => {
        const c = await makeServiceCast();
        await insertPost(c.wardId, { spaceId: c.spaces['relief-society']!, categoryId: c.cat.meal!.id, createdBy: c.rsPres, title: 'Meals' });
        const before = await viewCount(path(c), c[who]);
        await add10Posts(c);
        const after = await viewCount(path(c), c[who]);
        expect(after, `${name} as ${who}: ${before} with 1 post, ${after} with 11`).toBe(before);
        expect(after).toBeLessThanOrEqual(MAX);
      }, 30_000);
    }
  }
});

// My service opportunities reads each post in full (dates, roles, sign-ups, warnings), so it
// grows with posts by design; its permission checks must not add to that per post.
describe('My service opportunities: statements per post', () => {
  it('as the RS president, 1 -> 11 posts', async () => {
    const c = await makeServiceCast();
    await insertPost(c.wardId, { spaceId: c.spaces['relief-society']!, categoryId: c.cat.meal!.id, createdBy: c.rsPres, title: 'Meals' });
    const before = await viewCount(`/w/${c.wardId}/service/mine`, c.rsPres);
    await add10Posts(c);
    const after = await viewCount(`/w/${c.wardId}/service/mine`, c.rsPres);
    expect((after - before) / 10, `${before} with 1 post, ${after} with 11`).toBeLessThanOrEqual(PER_POST_MINE);
  }, 30_000);
});
