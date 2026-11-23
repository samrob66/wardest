// Links a leader pastes in: a deliverable's destination, or a short link they made on
// zippa.run (WardForward never creates short links itself).

// Normalize a pasted link. Adds https:// when the scheme is missing (leaders paste
// "zippa.run/m44Links" the way it's printed) and accepts only http(s), so a javascript: or
// data: URL can never reach an href. Returns null when the input isn't a usable web address.
export function normalizeHttpUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const candidate = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (!u.hostname || u.username || u.password) return null;
  return u.href;
}

// Render-time guard for stored links: only http(s) ever becomes an href.
export function safeHref(u: string | null | undefined): string {
  return u && /^https?:\/\//i.test(u) ? u : '#';
}

// How a link reads in print: no scheme, no trailing slash ("zippa.run/m44Bulletin").
export function displayUrl(u: string): string {
  return u.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
