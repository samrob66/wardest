import type { Env } from '../types';
import { newId } from './ids';

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
}

// Ensure a space portal has a go4 short link (idempotent). Returns the slug. Destination is
// the space's portal URL (public portal → /p/<prefix>; other portals → the authed portal URL).
export async function ensurePortalShortLink(
  env: Env,
  o: { wardId: string; spaceId: string; prefix: string; spaceName: string; destUrl: string; createdBy: string },
): Promise<string> {
  const existing = await env.DB.prepare(
    `SELECT slug FROM short_links WHERE target_type = 'portal' AND target_space_id = ?`,
  )
    .bind(o.spaceId)
    .first<{ slug: string }>();
  if (existing) return existing.slug;

  const base = o.prefix + compact(o.spaceName);
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await env.DB.prepare(`SELECT 1 AS x FROM short_links WHERE slug = ?`).bind(slug).first();
    if (!hit) break;
    slug = `${base}${i}`;
  }
  await env.DB.prepare(
    `INSERT INTO short_links (id, ward_id, slug, destination_url, target_type, target_space_id, created_by_user_id)
     VALUES (?, ?, ?, ?, 'portal', ?, ?)`,
  )
    .bind(newId('sl'), o.wardId, slug, o.destUrl, o.spaceId, o.createdBy)
    .run();
  await env.GO4_LINKS.put(slug, o.destUrl);
  return slug;
}
