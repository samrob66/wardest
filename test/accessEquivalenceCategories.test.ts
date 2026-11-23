// Equivalence harness, part 2 of 3: categories and requests (see test/accessEquivalenceKit.ts).
import { describe, it, expect, beforeAll } from 'vitest';
import * as curS from '../src/lib/serviceAccess';
import * as refS from './reference/serviceAccessRef';
import {
  SLOW, USERS, categoryTable, compare, makeEquivCast, reference, snapCategoryTable, type Cast,
} from './accessEquivalenceKit';

let c: Cast;
beforeAll(async () => {
  c = await makeEquivCast();
}, SLOW);

describe('access equivalence: categories and requests', () => {
  for (const key of USERS) {
    it(`${key}`, async () => compare(`cats ${key}`, (impl) => categoryTable(impl, c, c.users[key]!)), SLOW);
    it(`${key} (one snapshot)`, async () => {
      expect(await snapCategoryTable(c, c.users[key]!)).toEqual(await reference(`cats ${key}`, (impl) => categoryTable(impl, c, c.users[key]!)));
    }, SLOW);
  }
});

describe('access equivalence: aliases', () => {
  // canManageCategory / canManageRequest are the same functions as isCategoryManager /
  // canSeeRequest (so the tables above check them too).
  it('stay aliases', () => {
    for (const s of [refS, curS]) {
      expect(s.canManageCategory).toBe(s.isCategoryManager);
      expect(s.canManageRequest).toBe(s.canSeeRequest);
    }
  });
});
