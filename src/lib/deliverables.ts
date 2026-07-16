import type { Env } from '../types';
import type { ImplementationVisibility } from './visibility';
import { newId } from './ids';

export interface DeliverableRow {
  id: string;
  title: string;
  type: string;
  url: string | null;
  short_slug: string | null;
}

// Allowed upload content-types → deliverable type. 10 MB cap (IMPLEMENTATION rule 11).
const ALLOWED_UPLOADS = new Map<string, 'file' | 'image'>([
  ['application/pdf', 'file'],
  ['image/png', 'image'],
  ['image/jpeg', 'image'],
  ['image/webp', 'image'],
  ['image/svg+xml', 'image'],
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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
    `SELECT d.id AS id, d.title AS title, d.type AS type, d.url AS url, sl.slug AS short_slug
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

// Upload a file/image deliverable to R2 and mint its go4 short link (→ the /f/<id> serving URL,
// so it behaves like a URL deliverable on portals + gets a QR). Returns an error string on
// validation failure.
export async function createFileDeliverable(
  env: Env,
  o: {
    wardId: string;
    implementationId: string;
    prefix: string;
    title: string;
    file: File;
    createdBy: string;
    appUrl: string;
  },
): Promise<{ deliverableId: string; slug: string } | { error: string }> {
  const kind = ALLOWED_UPLOADS.get(o.file.type);
  if (!kind) return { error: 'Unsupported file type (allowed: PDF, PNG, JPEG, WebP, SVG).' };
  if (o.file.size > MAX_UPLOAD_BYTES) return { error: 'File too large (max 10 MB).' };

  const deliverableId = newId('dlv');
  const safeName = (o.file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const key = `w/${o.wardId}/${deliverableId}/${safeName}`;
  await env.FILES.put(key, await o.file.arrayBuffer(), { httpMetadata: { contentType: o.file.type } });

  const slug = await uniqueShortSlug(env, o.prefix, o.title);
  const dest = `${o.appUrl}/f/${deliverableId}`;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO deliverables (id, ward_id, implementation_id, title, type, file_key, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(deliverableId, o.wardId, o.implementationId, o.title, kind, key, o.createdBy),
    env.DB.prepare(
      `INSERT INTO short_links (id, ward_id, slug, destination_url, target_type, target_deliverable_id, created_by_user_id)
       VALUES (?, ?, ?, ?, 'deliverable', ?, ?)`,
    ).bind(newId('sl'), o.wardId, slug, dest, deliverableId, o.createdBy),
  ]);
  await env.GO4_LINKS.put(slug, dest);
  return { deliverableId, slug };
}

export interface FileDeliverable {
  id: string;
  ward_id: string;
  file_key: string | null;
}

export async function getFileDeliverable(env: Env, id: string): Promise<FileDeliverable | null> {
  return env.DB.prepare(`SELECT id, ward_id, file_key FROM deliverables WHERE id = ?`)
    .bind(id)
    .first<FileDeliverable>();
}

// Is this deliverable published to a public space (→ servable to anyone)?
export async function deliverableIsPublic(env: Env, deliverableId: string): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS ok FROM deliverable_spaces ds JOIN spaces s ON s.id = ds.space_id
      WHERE ds.deliverable_id = ? AND s.kind = 'public' LIMIT 1`,
  )
    .bind(deliverableId)
    .first();
  return r != null;
}

// Can this user view a (non-public) deliverable's file? Creator, ward superadmin, a member of
// any space it's published to, or a member of a space those are shared with.
export async function canViewDeliverable(env: Env, userId: string, deliverableId: string): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS ok FROM deliverables WHERE id = ? AND created_by_user_id = ?
     UNION ALL
     SELECT 1 FROM deliverables d JOIN ward_memberships wm ON wm.ward_id = d.ward_id
       WHERE d.id = ? AND wm.user_id = ? AND wm.role = 'superadmin'
     UNION ALL
     SELECT 1 FROM deliverable_spaces ds JOIN space_memberships sm ON sm.space_id = ds.space_id
       WHERE ds.deliverable_id = ? AND sm.user_id = ?
     UNION ALL
     SELECT 1 FROM deliverable_spaces ds JOIN space_shares ss ON ss.space_id = ds.space_id
       JOIN space_memberships sm ON sm.space_id = ss.shared_with_space_id
       WHERE ds.deliverable_id = ? AND sm.user_id = ?
     LIMIT 1`,
  )
    .bind(deliverableId, userId, deliverableId, userId, deliverableId, userId, deliverableId, userId)
    .first();
  return r != null;
}

// The parent implementation's visibility fields, for routing file access through
// canViewImplementation. Null for ad-hoc deliverables (no implementation).
export async function getDeliverableImplVisibility(
  env: Env,
  deliverableId: string,
): Promise<ImplementationVisibility | null> {
  return env.DB.prepare(
    `SELECT i.id AS id, i.ward_id AS ward_id, i.space_id AS space_id,
            i.visibility AS visibility, i.owner_user_id AS owner_user_id
       FROM deliverables d JOIN implementations i ON i.id = d.implementation_id
      WHERE d.id = ?`,
  )
    .bind(deliverableId)
    .first<ImplementationVisibility>();
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
