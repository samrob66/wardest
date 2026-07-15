// Stateless signed tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
// Used for the session cookie and the short-lived OAuth transaction cookie.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signToken(payload: object, secret: string): Promise<string> {
  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
  return `${body}.${b64urlEncode(sig)}`;
}

// Verifies signature (constant-time via subtle.verify) and returns the parsed payload, or null.
export async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const key = await hmacKey(secret);
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), encoder.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    return JSON.parse(decoder.decode(b64urlDecode(body))) as T;
  } catch {
    return null;
  }
}

// Decode a JWT payload WITHOUT signature verification. Only safe for the Google id_token
// received directly from Google's token endpoint over server-to-server TLS (authorization-code
// flow) — never for a token supplied by a browser.
export function decodeJwtPayload<T>(jwt: string): T | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(decoder.decode(b64urlDecode(parts[1] as string))) as T;
  } catch {
    return null;
  }
}
