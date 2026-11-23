// The one export test/helpers.ts uses from @cloudflare/vitest-plugin's internal module (see
// settle() there). Resolves once every promise registered through ctx.waitUntil has settled.
declare module 'cloudflare:test-internal' {
  export function waitForGlobalWaitUntil(): Promise<void>;
}
