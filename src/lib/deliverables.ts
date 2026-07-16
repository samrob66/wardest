import type { Env } from '../types';
import { newId } from './ids';

export interface DeliverableRow {
  id: string;
  title: string;
  url: string | null;
  short_slug: string | null;
}

export interface Publication {
  deliverable_id: string;
  space_id: string;
  space_name: string;
  kind: string;
}

function slugPart(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
}

// Prefix-namespaced, globally-unique short-link slug (rule 4).
async function uniqueShortSlug(env: Env, prefix: string, title: string): Promise<string> {
  const base = prefix + (slugPart(title) || 'link');
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await env.DB.prepare(`SELECT 1 AS x FROM short_links WHERE slug = ?`).bind(slug).first();
    if (!hit) return slug;
    slug = `${base}${i}`;
  }
}

export async function listDeliverables(env: Env, implementationId: string): Promise<DeliverableRow[]> {
  const res = await env.DB.prepare(
    `SELECT d.id AS id, d.title AS title, d.url AS url, sl.slug AS short_slug
       FROM deliverables d
       LEFT JOIN short_links sl ON sl.target_type = 'deliverable' AND sl.target_deliverable_id = d.id
      WHERE d.implementation_id = ?
      ORDER BY d.created_at ASC`,
  )
    .bind(implementationId)
    .all<DeliverableRow>();
  return res.results ?? [];
}

// Which spaces each of an implementation's deliverables is published to.
export async function listPublications(env: Env, implementationId: string): Promise<Publication[]> {
  const res = await env.DB.prepare(
    `SELECT ds.deliverable_id AS deliverable_id, ds.space_id AS space_id,
            s.name AS space_name, s.kind AS kind
       FROM deliverables d
       JOIN deliverable_spaces ds ON ds.deliverable_id = d.id
       JOIN spaces s ON s.id = ds.space_id
      WHERE d.implementation_id = ?`,
  )
    .bind(implementationId)
    .all<Publication>();
  return res.results ?? [];
}

// Create a URL deliverable + its prefix-namespaced go4.cc short link (D1 + KV write-through).
export async function createUrlDeliverable(
  env: Env,
  o: {
    wardId: string;
    implementationId: string;
    prefix: string;
    title: string;
    url: string;
    createdBy: string;
  },
): Promise<{ deliverableId: string; slug: string }> {
  const deliverableId = newId('dlv');
  const slug = await uniqueShortSlug(env, o.prefix, o.title);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO deliverables (id, ward_id, implementation_id, title, type, url, created_by_user_id)
       VALUES (?, ?, ?, ?, 'url', ?, ?)`,
    ).bind(deliverableId, o.wardId, o.implementationId, o.title, o.url, o.createdBy),
    env.DB.prepare(
      `INSERT INTO short_links (id, ward_id, slug, destination_url, target_type, target_deliverable_id, created_by_user_id)
       VALUES (?, ?, ?, ?, 'deliverable', ?, ?)`,
    ).bind(newId('sl'), o.wardId, slug, o.url, deliverableId, o.createdBy),
  ]);
  await env.GO4_LINKS.put(slug, o.url);
  return { deliverableId, slug };
}

export interface DeliverableOwner {
  id: string;
  ward_id: string;
  created_by_user_id: string;
}

export async function getDeliverable(env: Env, id: string): Promise<DeliverableOwner | null> {
  return env.DB.prepare(`SELECT id, ward_id, created_by_user_id FROM deliverables WHERE id = ?`)
    .bind(id)
    .first<DeliverableOwner>();
}

// Publish a deliverable onto a space's portal (idempotent, appended to the end).
export async function publishToSpace(
  env: Env,
  wardId: string,
  deliverableId: string,
  spaceId: string,
): Promise<void> {
  const pos = await env.DB.prepare(
    `SELECT COALESCE(MAX(position), -1) + 1 AS p FROM deliverable_spaces WHERE space_id = ?`,
  )
    .bind(spaceId)
    .first<{ p: number }>();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO deliverable_spaces (id, ward_id, deliverable_id, space_id, include_in_portal, position)
     VALUES (?, ?, ?, ?, 1, ?)`,
  )
    .bind(newId('dsp'), wardId, deliverableId, spaceId, pos?.p ?? 0)
    .run();
}

export async function unpublishFromSpace(
  env: Env,
  deliverableId: string,
  spaceId: string,
): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM deliverable_spaces WHERE deliverable_id = ? AND space_id = ?`,
  )
    .bind(deliverableId, spaceId)
    .run();
}
