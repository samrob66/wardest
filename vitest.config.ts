import { configDefaults, defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export const EQUIV_TESTS = 'test/accessEquivalence*.test.ts';

// Tests run inside the Workers runtime (Miniflare) against a local D1. The schema is applied
// once per isolate by test/setup.ts; every outbound fetch (Turnstile, Discord) is intercepted
// there and the EMAIL binding is swapped for a recording fake, so nothing reaches the network.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        bindings: {
          SESSION_SECRET: 'test-session-secret-0123456789abcdef',
          APP_URL: 'http://localhost:8787',
          // Send mode: mail goes to the recording fake EMAIL binding (test/helpers.ts), even
          // when the local .dev.vars says EMAIL_DELIVERY=log.
          EMAIL_DELIVERY: '',
          TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
          TURNSTILE_SECRET_KEY: 'test',
          DISCORD_BOT_TOKEN: 'test',
          DISCORD_CLIENT_ID: 'test-client',
          DISCORD_CLIENT_SECRET: 'test-secret',
          OPERATOR_EMAILS: '',
          CONTACT_EMAIL: '',
          DEV_LOGIN: '0',
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/setup.ts'],
    // Build worktrees live under .claude/worktrees; never pick up their copies of the tests.
    // google-portal/ has its own Node config (google-portal/vitest.config.mjs), run by `npm test` after this one.
    // The access equivalence harness runs on its own: `npm run test:equiv` (vitest.equiv.config.ts).
    exclude: [...configDefaults.exclude, '.claude/**', 'google-portal/**', EQUIV_TESTS],
  },
});
