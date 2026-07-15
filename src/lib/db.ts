import type { Env, PortalCard } from '../types';

export interface Ward {
  id: string;
  name: string;
  prefix: string;
  status: string;
}

export interface PublicSpace {
  id: string;
  portal_title: string | null;
  portal_published: number;
}

export interface RedirectRow {
  destination_url: string;
  disabled: number;
  ward_status: string;
}

export async function getWardByPrefix(env: Env, prefix: string): Promise<Ward | null> {
  return env.DB.prepare(
    `SELECT id, name, prefix, status FROM wards WHERE prefix = ? AND status = 'active'`,
  )
    .bind(prefix)
    .first<Ward>();
}

export async function getPublicSpace(env: Env, wardId: string): Promise<PublicSpace | null> {
  return env.DB.prepare(
    `SELECT id, portal_title, portal_published
       FROM spaces
      WHERE ward_id = ? AND kind = 'public' AND archived = 0`,
  )
    .bind(wardId)
    .first<PublicSpace>();
}

// Deliverables published to a space's portal, joined to their go4.cc short link (if any).
export async function getPortalCards(env: Env, spaceId: string): Promise<PortalCard[]> {
  const res = await env.DB.prepare(
    `SELECT d.title        AS title,
            d.description  AS description,
            d.type         AS type,
            d.url          AS url,
            sl.slug        AS short_slug
       FROM deliverable_spaces ds
       JOIN deliverables d ON d.id = ds.deliverable_id
       LEFT JOIN short_links sl
         ON sl.target_type = 'deliverable' AND sl.target_deliverable_id = d.id
      WHERE ds.space_id = ? AND ds.include_in_portal = 1
      ORDER BY ds.position ASC, d.title ASC`,
  )
    .bind(spaceId)
    .all<PortalCard>();
  return res.results ?? [];
}

export async function getPortalShortSlug(env: Env, spaceId: string): Promise<string | null> {
  const r = await env.DB.prepare(
    `SELECT slug FROM short_links WHERE target_type = 'portal' AND target_space_id = ? LIMIT 1`,
  )
    .bind(spaceId)
    .first<{ slug: string }>();
  return r?.slug ?? null;
}

// Redirect lookup: destination + the flags the redirect path must re-check.
export async function lookupShortLink(env: Env, slug: string): Promise<RedirectRow | null> {
  return env.DB.prepare(
    `SELECT s.destination_url AS destination_url,
            s.disabled        AS disabled,
            w.status          AS ward_status
       FROM short_links s
       JOIN wards w ON w.id = s.ward_id
      WHERE s.slug = ?`,
  )
    .bind(slug)
    .first<RedirectRow>();
}
