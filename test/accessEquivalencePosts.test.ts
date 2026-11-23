// Equivalence harness, part 1 of 3: posts, orgs and volunteers (see test/accessEquivalenceKit.ts).
import { describe, it, expect, beforeAll } from 'vitest';
import {
  SLOW, USERS, compare, makeEquivCast, postTable, reference, renullLegacy, snapPostTable, type Cast,
} from './accessEquivalenceKit';

let c: Cast;
beforeAll(async () => {
  c = await makeEquivCast();
}, SLOW);

describe('access equivalence: posts, orgs and volunteers', () => {
  beforeAll(async () => renullLegacy(c), SLOW);
  for (const key of USERS) {
    it(`${key}`, async () => compare(`posts ${key}`, (impl) => postTable(impl, c, c.users[key]!)), SLOW);
    it(`${key} (one snapshot)`, async () => {
      expect(await snapPostTable(c, c.users[key]!)).toEqual(await reference(`posts ${key}`, (impl) => postTable(impl, c, c.users[key]!)));
    }, SLOW);
  }
});
