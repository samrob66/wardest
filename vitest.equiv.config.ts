// `npm run test:equiv`: only the access equivalence harness (test/accessEquivalence*.test.ts),
// which the default `npm test` leaves out. Same runtime, bindings and setup as vitest.config.ts.
import { configDefaults } from 'vitest/config';
import base, { EQUIV_TESTS } from './vitest.config';

export default {
  ...base,
  test: {
    ...base.test,
    include: [EQUIV_TESTS],
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
};
