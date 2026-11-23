// Service categories (spec 2026-11-22 §3): what an opportunity (volunteer post) or a member's
// request for help is about. Every ward gets the defaults below, lazily: listCategories calls
// ensureServiceCategories first, so wards made before this feature (and seeds) get them too.
// Permission decisions are NOT made here; see src/lib/serviceAccess.ts.
import type { Env } from '../types';
import { newId } from './ids';

export type CategoryKind = 'opportunity' | 'request';

// Who an opportunity is for: the serve page's sections, in this order.
export const AUDIENCES = ['brothers', 'sisters', 'youth', 'children'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  brothers: 'Brothers',
  sisters: 'Sisters',
  youth: 'Youth',
  children: 'Children',
};

// Canonical order, no duplicates, unknown values dropped. An empty result is the caller's
// error to report ("pick at least one").
export function parseAudiences(raw: string | string[]): Audience[] {
  const parts = (Array.isArray(raw) ? raw : String(raw ?? '').split(','))
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);
  return AUDIENCES.filter((a) => parts.includes(a));
}

export function audiencesText(list: readonly Audience[]): string {
  return list.join(',');
}

// Small inline illustrations in the canvas palette (navy #1d3557, blue #4a6fa5, gold #c9b882).
// Fixed keys; a category stores the key. All are decorative (aria-hidden).
const svg = (body: string) =>
  `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" fill="none" stroke="#1d3557" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS: Record<string, string> = {
  meal: svg(
    '<path d="M8 26h32a16 16 0 0 1-32 0z" fill="#c9b882"/><path d="M6 26h36"/><path d="M18 18c0-3 3-3 3-6M26 18c0-3 3-3 3-6"/>',
  ),
  hand: svg(
    '<path d="M10 30l8-8a4 4 0 0 1 5 0l3 3h8a3 3 0 0 1 0 6H24"/><path d="M6 34l6 6h14l12-10a3 3 0 0 0-4-4l-8 6" fill="#c9b882"/><path d="M30 12a4 4 0 0 1 6 5l-6 6-6-6a4 4 0 0 1 6-5z" fill="#4a6fa5"/>',
  ),
  activity: svg(
    '<path d="M24 6l4 10 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z" fill="#c9b882"/><path d="M10 40h28"/>',
  ),
  building: svg(
    '<path d="M8 40V22L24 10l16 12v18z" fill="#c9b882"/><path d="M20 40V30h8v10"/><path d="M24 10V4"/><path d="M6 40h36"/>',
  ),
  temple: svg(
    '<path d="M10 40V24h28v16z" fill="#c9b882"/><path d="M18 24V16h12v8"/><path d="M24 16V4"/><path d="M22 6h4"/><path d="M6 40h36"/><path d="M16 32h4M28 32h4"/>',
  ),
  primary: svg(
    '<circle cx="17" cy="16" r="5" fill="#c9b882"/><circle cx="31" cy="18" r="4" fill="#4a6fa5"/><path d="M9 38c0-7 4-12 8-12s8 5 8 12M25 38c0-6 3-10 6-10s6 4 6 10"/>',
  ),
  sundayschool: svg(
    '<path d="M24 12c-4-3-10-3-16-2v26c6-1 12-1 16 2 4-3 10-3 16-2V10c-6-1-12-1-16 2z" fill="#c9b882"/><path d="M24 12v26"/>',
  ),
  moving: svg(
    '<path d="M6 20h22v16H6z" fill="#c9b882"/><path d="M6 20l4-6h14l4 6"/><path d="M28 24h8l6 6v6H28z" fill="#4a6fa5"/><circle cx="13" cy="38" r="3" fill="#fff"/><circle cx="35" cy="38" r="3" fill="#fff"/>',
  ),
  present: svg(
    '<path d="M8 20h32v20H8z" fill="#c9b882"/><path d="M6 14h36v6H6z" fill="#4a6fa5"/><path d="M24 14v26"/><path d="M24 14c-4-6-10-6-10-2s6 2 10 2c4 0 10 2 10-2s-6-4-10 2z"/>',
  ),
  other: svg(
    '<circle cx="24" cy="24" r="16" fill="#c9b882"/><path d="M18 20a6 6 0 1 1 8 5c-2 1-2 2-2 4"/><path d="M24 34h.01"/>',
  ),
};

export function iconSvg(key: string | null | undefined): string {
  return ICONS[key ?? ''] ?? ICONS.other!;
}

export interface DefaultCategory {
  slug: string;
  kind: CategoryKind;
  name: string;
  icon: string;
  owners: string[]; // space slugs; missing or archived ones are skipped (none left -> bishopric)
  audiences: string;
  council_may_create?: boolean;
  confidential?: boolean;
  opportunity?: string; // request -> the opportunity category slug "Turn into" starts in
}

// Spec §2 items 8–9 and §3.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { slug: 'meal', kind: 'opportunity', name: 'Provide a Meal', icon: 'meal', owners: ['relief-society'], audiences: 'sisters' },
  { slug: 'helping-hand', kind: 'opportunity', name: 'Lend a Helping Hand', icon: 'hand', owners: ['ward-council'], audiences: 'brothers,sisters', council_may_create: true },
  { slug: 'activity', kind: 'opportunity', name: 'Help with an Activity', icon: 'activity', owners: ['activities-committee'], audiences: 'brothers,sisters' },
  { slug: 'clean-building', kind: 'opportunity', name: 'Clean the Building', icon: 'building', owners: ['bishopric'], audiences: 'brothers,sisters' },
  { slug: 'clean-temple', kind: 'opportunity', name: 'Clean the Temple', icon: 'temple', owners: ['relief-society', 'elders-quorum'], audiences: 'brothers,sisters' },
  { slug: 'sub-primary', kind: 'opportunity', name: 'Substitute in Primary', icon: 'primary', owners: ['primary'], audiences: 'brothers,sisters' },
  { slug: 'sub-sunday-school', kind: 'opportunity', name: 'Substitute in Sunday School', icon: 'sundayschool', owners: ['sunday-school'], audiences: 'brothers,sisters' },
  { slug: 'move', kind: 'opportunity', name: 'Help Someone Move (in/out)', icon: 'moving', owners: ['elders-quorum'], audiences: 'brothers' },
  { slug: 'req-moving', kind: 'request', name: 'Get Help Moving', icon: 'moving', owners: ['elders-quorum'], audiences: '', opportunity: 'move' },
  { slug: 'req-christmas', kind: 'request', name: 'Request a Christmas or Presents', icon: 'present', owners: ['bishopric'], audiences: '', confidential: true },
  { slug: 'req-other', kind: 'request', name: 'Other Requests', icon: 'other', owners: ['bishopric'], audiences: '', confidential: true },
];

export interface CategoryRow {
  id: string;
  ward_id: string;
  kind: CategoryKind;
  slug: string;
  name: string;
  icon: string;
  default_audiences: string;
  council_may_create: number;
  confidential: number;
  opportunity_category_id: string | null;
  position: number;
  archived: number;
  created_at: string;
  // The webhook itself never leaves the DB through a listing (spec §9: a secret).
  has_webhook: number;
  webhook_tail: string | null;
}

export interface CategoryFull extends CategoryRow {
  spaces: Array<{ id: string; kind: string; name: string }>;
  delegates: Array<{ user_id: string; name: string | null; email: string }>;
}

export const CATEGORY_COLUMNS = `c.id, c.ward_id, c.kind, c.slug, c.name, c.icon, c.default_audiences, c.council_may_create,
  c.confidential, c.opportunity_category_id, c.position, c.archived, c.created_at,
  (c.discord_webhook_url IS NOT NULL AND c.discord_webhook_url <> '') AS has_webhook,
  CASE WHEN c.discord_webhook_url IS NULL THEN NULL ELSE substr(c.discord_webhook_url, -4) END AS webhook_tail`;

// Inserts any default whose slug is missing; never touches existing rows (a renamed or archived
// default stays as the ward left it). Then backfills posts that have no category yet.
export async function ensureServiceCategories(env: Env, wardId: string): Promise<void> {
  if (!wardId) return;
  const existing = await env.DB.prepare(`SELECT id, slug FROM service_categories WHERE ward_id = ?`)
    .bind(wardId)
    .all<{ id: string; slug: string }>();
  const ids = new Map((existing.results ?? []).map((r) => [r.slug, r.id]));
  const missing = DEFAULT_CATEGORIES.filter((d) => !ids.has(d.slug));
  if (missing.length) {
    const spaces = await env.DB.prepare(`SELECT id, slug FROM spaces WHERE ward_id = ? AND archived = 0`)
      .bind(wardId)
      .all<{ id: string; slug: string }>();
    const bySlug = new Map((spaces.results ?? []).map((s) => [s.slug, s.id]));
    for (const d of missing) {
      const id = newId('scat');
      let owners = d.owners.map((s) => bySlug.get(s)).filter((x): x is string => !!x);
      if (!owners.length && bySlug.has('bishopric')) owners = [bySlug.get('bishopric')!];
      const position = DEFAULT_CATEGORIES.indexOf(d);
      const opp = d.opportunity ? (ids.get(d.opportunity) ?? null) : null;
      // One transaction. When another request inserted the same slug first, our INSERT is
      // ignored and the owner rows (which need our id to exist) insert nothing.
      const stmts: D1PreparedStatement[] = [
        env.DB.prepare(
          `INSERT OR IGNORE INTO service_categories
             (id, ward_id, kind, slug, name, icon, default_audiences, council_may_create, confidential, opportunity_category_id, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(id, wardId, d.kind, d.slug, d.name, d.icon, d.audiences, d.council_may_create ? 1 : 0, d.confidential ? 1 : 0, opp, position),
        ...owners.map((sid) =>
          env.DB.prepare(
            `INSERT OR IGNORE INTO service_category_spaces (id, ward_id, category_id, space_id)
             SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM service_categories WHERE id = ? AND ward_id = ?)`,
          ).bind(newId('scs'), wardId, id, sid, id, wardId),
        ),
      ];
      await env.DB.batch(stmts);
      const row = await env.DB.prepare(`SELECT id FROM service_categories WHERE ward_id = ? AND slug = ?`)
        .bind(wardId, d.slug)
        .first<{ id: string }>();
      if (row) ids.set(d.slug, row.id);
    }
  }
  await backfillPostCategories(env, wardId);
}

// Posts without a category (an upgraded database): the ward's opportunity category owned by the
// post's space with the lowest position, else helping-hand.
export async function backfillPostCategories(env: Env, wardId: string): Promise<void> {
  const posts = await env.DB.prepare(`SELECT id, space_id FROM vol_posts WHERE ward_id = ? AND category_id IS NULL`)
    .bind(wardId)
    .all<{ id: string; space_id: string }>();
  for (const p of posts.results ?? []) {
    const cat = await defaultCategoryForSpace(env, wardId, p.space_id);
    if (!cat) continue;
    await env.DB.prepare(`UPDATE vol_posts SET category_id = ? WHERE id = ? AND ward_id = ? AND category_id IS NULL`)
      .bind(cat, p.id, wardId)
      .run();
  }
}

// The opportunity category a post in `spaceId` falls under when none was chosen.
export async function defaultCategoryForSpace(env: Env, wardId: string, spaceId: string): Promise<string | null> {
  const own = await env.DB.prepare(
    `SELECT c.id FROM service_categories c JOIN service_category_spaces cs ON cs.category_id = c.id AND cs.ward_id = c.ward_id
      WHERE c.ward_id = ? AND cs.space_id = ? AND c.kind = 'opportunity'
      ORDER BY c.archived, c.position, c.created_at LIMIT 1`,
  )
    .bind(wardId, spaceId)
    .first<{ id: string }>();
  if (own) return own.id;
  const hh = await env.DB.prepare(`SELECT id FROM service_categories WHERE ward_id = ? AND slug = 'helping-hand'`)
    .bind(wardId)
    .first<{ id: string }>();
  return hh?.id ?? null;
}

export async function listCategories(
  env: Env,
  wardId: string,
  o: { kind?: CategoryKind; includeArchived?: boolean } = {},
): Promise<CategoryRow[]> {
  await ensureServiceCategories(env, wardId);
  const where = ['c.ward_id = ?'];
  const binds: unknown[] = [wardId];
  if (o.kind) {
    where.push('c.kind = ?');
    binds.push(o.kind);
  }
  if (!o.includeArchived) where.push('c.archived = 0');
  const res = await env.DB.prepare(
    `SELECT ${CATEGORY_COLUMNS} FROM service_categories c WHERE ${where.join(' AND ')} ORDER BY c.position, c.created_at, c.name`,
  )
    .bind(...binds)
    .all<CategoryRow>();
  return res.results ?? [];
}

export async function getCategoryRow(env: Env, wardId: string, id: string): Promise<CategoryRow | null> {
  if (!wardId || !id) return null;
  return env.DB.prepare(`SELECT ${CATEGORY_COLUMNS} FROM service_categories c WHERE c.id = ? AND c.ward_id = ?`)
    .bind(id, wardId)
    .first<CategoryRow>();
}

export async function getCategory(env: Env, wardId: string, id: string): Promise<CategoryFull | null> {
  const row = await getCategoryRow(env, wardId, id);
  if (!row) return null;
  const spaces = await env.DB.prepare(
    `SELECT s.id, s.kind, s.name FROM service_category_spaces cs JOIN spaces s ON s.id = cs.space_id AND s.ward_id = cs.ward_id
      WHERE cs.category_id = ? AND cs.ward_id = ? ORDER BY s.position, s.name`,
  )
    .bind(id, wardId)
    .all<{ id: string; kind: string; name: string }>();
  // Only delegates who are still ward members count (fail closed, like serviceAccess).
  const delegates = await env.DB.prepare(
    `SELECT u.id AS user_id, u.name AS name, LOWER(u.email) AS email
       FROM service_delegates d JOIN users u ON u.id = d.user_id
       JOIN ward_memberships wm ON wm.user_id = d.user_id AND wm.ward_id = d.ward_id
      WHERE d.category_id = ? AND d.ward_id = ? ORDER BY u.name, u.email`,
  )
    .bind(id, wardId)
    .all<{ user_id: string; name: string | null; email: string }>();
  return { ...row, spaces: spaces.results ?? [], delegates: delegates.results ?? [] };
}

export async function getCategoryBySlug(env: Env, wardId: string, slug: string): Promise<CategoryRow | null> {
  await ensureServiceCategories(env, wardId);
  return env.DB.prepare(`SELECT ${CATEGORY_COLUMNS} FROM service_categories c WHERE c.ward_id = ? AND c.slug = ?`)
    .bind(wardId, slug)
    .first<CategoryRow>();
}

// The owning space ids of a category (ward-scoped).
export async function categorySpaceIds(env: Env, wardId: string, categoryId: string): Promise<string[]> {
  const res = await env.DB.prepare(
    `SELECT cs.space_id FROM service_category_spaces cs JOIN spaces s ON s.id = cs.space_id AND s.ward_id = cs.ward_id
      WHERE cs.category_id = ? AND cs.ward_id = ?`,
  )
    .bind(categoryId, wardId)
    .all<{ space_id: string }>();
  return (res.results ?? []).map((r) => r.space_id);
}
