// Slugs are lowercased on write AND lookup so links are case-insensitive.
export function normalizeSlug(s: string): string {
  return s.trim().toLowerCase();
}

export const SLUG_RE = /^[a-z0-9-]{2,64}$/;

// Reserved slugs rejected at creation (Phase 1+). The redirect handler already routes
// robots.txt / favicon.ico via explicit routes, but they're listed for completeness.
const RESERVED = new Set([
  'api', 'app', 'admin', 'www', 'p', 'qr', 'auth', 'static',
  'robots.txt', 'favicon.ico', 'sign-in', 'signin', 'login', 'logout',
  'dashboard', 'operator', 'wardest', 'help', 'about',
]);

export function isReservedSlug(s: string): boolean {
  return RESERVED.has(s.toLowerCase());
}
