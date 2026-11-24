import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The Google-only portal's tests run in plain Node (not the Workers pool): each test loads the
// generated Apps Script code into a `vm` context with in-memory Google fakes (test/fakes.mjs).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'node',
    include: ['test/**/*.test.mjs'],
  },
});
