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
  share_url: string | null;
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
    `SELECT id, portal_title, portal_published, share_url
       FROM spaces
      WHERE ward_id = ? AND kind = 'public' AND archived = 0`,
  )
    .bind(wardId)
    .first<PublicSpace>();
}

interface PortalCardRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  short_url: string | null;
}

// Deliverables published to a space's portal. A file/image's destination is its /f/<id>
// serving URL, so it links and QR-codes like a URL deliverable.
export async function getPortalCards(env: Env, spaceId: string): Promise<PortalCard[]> {
  const res = await env.DB.prepare(
    `SELECT d.id          AS id,
            d.title       AS title,
            d.description AS description,
            d.type        AS type,
            d.url         AS url,
            d.short_url   AS short_url
       FROM deliverable_spaces ds
       JOIN deliverables d ON d.id = ds.deliverable_id
      WHERE ds.space_id = ? AND ds.include_in_portal = 1
      ORDER BY ds.position ASC, d.title ASC`,
  )
    .bind(spaceId)
    .all<PortalCardRow>();
  return (res.results ?? []).map((r) => ({
    title: r.title,
    description: r.description,
    type: r.type,
    destination: r.url ?? `${env.APP_URL}/f/${r.id}`,
    short_url: r.short_url,
  }));
}
