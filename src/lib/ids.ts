// App-generated primary keys: readable prefix + UUID. crypto.randomUUID() is available in
// the Workers runtime.
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// A URL-safe random token (for invites, OAuth state, etc.).
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bin = '';
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
