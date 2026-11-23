// Writes for service categories: add/edit/archive, delegates (incl. inviting one by email),
// each manager's fill-warning preference, and the Discord channel webhook. Route handlers
// check serviceAccess first; these re-check only what a caller could get wrong (ward scope,
// valid input) and throw ServiceInputError with a friendly message.
import type { Env } from '../types';
import { newId } from './ids';
import { normalizeEmail } from './volSignup';
import { upsertInvite, sendInviteEmail } from './invites';
import { ICONS, parseAudiences, type CategoryKind } from './serviceCategories';

export class ServiceInputError extends Error {}

function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ServiceInputError(msg);
}

function cleanName(raw: string): string {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  need(name.length >= 1 && name.length <= 60, 'The name must be 1–60 characters.');
  return name;
}

function cleanIcon(raw: string): string {
  return Object.hasOwn(ICONS, raw) ? raw : 'other';
}

function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || 'category';
}

// Spaces that may own a category (spec §3): org, bishopric or ward_council, not archived.
export async function eligibleOwnerSpace(env: Env, wardId: string, spaceId: string): Promise<{ id: string; kind: string } | null> {
  if (!spaceId) return null;
  return env.DB.prepare(
    `SELECT id, kind FROM spaces WHERE id = ? AND ward_id = ? AND archived = 0 AND kind IN ('org','bishopric','ward_council')`,
  )
    .bind(spaceId, wardId)
    .first<{ id: string; kind: string }>();
}

export interface NewCategoryInput {
  kind: string;
  name: string;
  icon: string;
  spaceId: string;
  audiences: string | string[];
  confidential?: boolean;
}

// The route has checked the user may add a category to input.spaceId.
export async function createCategory(env: Env, wardId: string, input: NewCategoryInput): Promise<string> {
  const kind: CategoryKind = input.kind === 'request' ? 'request' : 'opportunity';
  const name = cleanName(input.name);
  need(await eligibleOwnerSpace(env, wardId, input.spaceId), 'Pick one of the ward’s organizations, the Bishopric or the Ward Council.');
  const audiences = kind === 'opportunity' ? parseAudiences(input.audiences) : [];
  need(kind === 'request' || audiences.length > 0, 'Pick at least one audience: brothers, sisters, youth or children.');
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await env.DB.prepare(`SELECT 1 AS x FROM service_categories WHERE ward_id = ? AND slug = ?`).bind(wardId, slug).first(); i++) {
    slug = `${base}-${i}`;
  }
  const pos = await env.DB.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM service_categories WHERE ward_id = ?`)
    .bind(wardId)
    .first<{ p: number }>();
  const id = newId('scat');
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO service_categories (id, ward_id, kind, slug, name, icon, default_audiences, confidential, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, wardId, kind, slug, name, cleanIcon(input.icon), audiences.join(','), kind === 'request' && input.confidential ? 1 : 0, pos?.p ?? 0),
    env.DB.prepare(`INSERT INTO service_category_spaces (id, ward_id, category_id, space_id) VALUES (?, ?, ?, ?)`).bind(
      newId('scs'), wardId, id, input.spaceId,
    ),
  ]);
  return id;
}

export interface CategoryEdit {
  name: string;
  icon: string;
  audiences: string | string[];
  council_may_create: boolean;
  confidential: boolean;
  opportunity_category_id: string;
}

export async function updateCategory(env: Env, wardId: string, categoryId: string, e: CategoryEdit): Promise<void> {
  const cat = await env.DB.prepare(`SELECT kind FROM service_categories WHERE id = ? AND ward_id = ?`)
    .bind(categoryId, wardId)
    .first<{ kind: string }>();
  need(cat, 'That category no longer exists.');
  const name = cleanName(e.name);
  if (cat.kind === 'opportunity') {
    const audiences = parseAudiences(e.audiences);
    need(audiences.length > 0, 'Pick at least one audience: brothers, sisters, youth or children.');
    await env.DB.prepare(
      `UPDATE service_categories SET name = ?, icon = ?, default_audiences = ?, council_may_create = ? WHERE id = ? AND ward_id = ?`,
    )
      .bind(name, cleanIcon(e.icon), audiences.join(','), e.council_may_create ? 1 : 0, categoryId, wardId)
      .run();
    return;
  }
  let opp: string | null = null;
  if (e.opportunity_category_id) {
    const o = await env.DB.prepare(`SELECT id FROM service_categories WHERE id = ? AND ward_id = ? AND kind = 'opportunity'`)
      .bind(e.opportunity_category_id, wardId)
      .first<{ id: string }>();
    need(o, 'Pick one of the ward’s opportunity categories.');
    opp = o.id;
  }
  await env.DB.prepare(
    `UPDATE service_categories SET name = ?, icon = ?, confidential = ?, opportunity_category_id = ? WHERE id = ? AND ward_id = ?`,
  )
    .bind(name, cleanIcon(e.icon), e.confidential ? 1 : 0, opp, categoryId, wardId)
    .run();
}

export async function setCategoryArchived(env: Env, wardId: string, categoryId: string, archived: boolean): Promise<void> {
  await env.DB.prepare(`UPDATE service_categories SET archived = ? WHERE id = ? AND ward_id = ?`)
    .bind(archived ? 1 : 0, categoryId, wardId)
    .run();
}

// ---------------------------------------------------------------- delegates

async function isWardMember(env: Env, wardId: string, userId: string): Promise<boolean> {
  const r = await env.DB.prepare(`SELECT 1 AS ok FROM ward_memberships WHERE ward_id = ? AND user_id = ?`).bind(wardId, userId).first();
  return r != null;
}

export async function addDelegate(env: Env, wardId: string, categoryId: string, userId: string, byUserId: string): Promise<void> {
  need(await isWardMember(env, wardId, userId), 'That person is not a member of this ward.');
  const cat = await env.DB.prepare(`SELECT 1 AS ok FROM service_categories WHERE id = ? AND ward_id = ?`).bind(categoryId, wardId).first();
  need(cat, 'That category no longer exists.');
  await env.DB.prepare(
    `INSERT OR IGNORE INTO service_delegates (id, ward_id, category_id, user_id, added_by_user_id) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(newId('sdel'), wardId, categoryId, userId, byUserId)
    .run();
}

export async function removeDelegate(env: Env, wardId: string, categoryId: string, userId: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM service_delegates WHERE ward_id = ? AND category_id = ? AND user_id = ?`)
    .bind(wardId, categoryId, userId)
    .run();
}

// Adds a delegate by email: a ward member is added at once ('added'); anyone else gets an
// invitation to the ward as an ordinary member (no spaces) that makes them a delegate of this
// category when accepted ('invited'). A pending invite someone already has keeps its role and
// space assignments; the delegation is added to it.
export async function delegateByEmail(
  env: Env,
  o: { wardId: string; wardName: string; categoryId: string; email: string; byUserId: string },
): Promise<'added' | 'invited'> {
  const email = normalizeEmail(o.email);
  need(email, 'Please enter a valid email address.');
  const member = await env.DB.prepare(
    `SELECT u.id FROM users u JOIN ward_memberships wm ON wm.user_id = u.id AND wm.ward_id = ? WHERE LOWER(u.email) = ?`,
  )
    .bind(o.wardId, email)
    .first<{ id: string }>();
  if (member) {
    await addDelegate(env, o.wardId, o.categoryId, member.id, o.byUserId);
    return 'added';
  }
  const existing = await env.DB.prepare(
    `SELECT id, token, status, (expires_at > datetime('now')) AS live FROM invites WHERE ward_id = ? AND email = ?`,
  )
    .bind(o.wardId, email)
    .first<{ id: string; token: string; status: string; live: number }>();
  let inviteId: string;
  let token: string;
  if (existing && existing.status === 'pending' && existing.live) {
    inviteId = existing.id;
    token = existing.token;
  } else {
    // A stale invite must not bring back old space roles or delegations: "member, no spaces".
    if (existing) {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM invite_space_roles WHERE invite_id = ?`).bind(existing.id),
        env.DB.prepare(`DELETE FROM invite_category_delegations WHERE invite_id = ?`).bind(existing.id),
      ]);
    }
    const fresh = await upsertInvite(env, { wardId: o.wardId, email, wardRole: 'member', calling: null, invitedBy: o.byUserId });
    inviteId = fresh.id;
    token = fresh.token;
  }
  await env.DB.prepare(`INSERT OR IGNORE INTO invite_category_delegations (id, invite_id, category_id) VALUES (?, ?, ?)`)
    .bind(newId('icd'), inviteId, o.categoryId)
    .run();
  await sendInviteEmail(env, { to: email, wardName: o.wardName, acceptUrl: `${env.APP_URL}/invite/${token}` });
  return 'invited';
}

// ---------------------------------------------------------------- warnings

// Whole hours 1–336 (digits only), default 48 when blank is NOT assumed: blank is an error.
export function parseHours(raw: string): number {
  const s = String(raw ?? '').trim();
  need(/^\d{1,3}$/.test(s), 'Hours must be a whole number from 1 to 336.');
  const n = Number(s);
  need(n >= 1 && n <= 336, 'Hours must be a whole number from 1 to 336.');
  return n;
}

export async function setWarnPref(
  env: Env,
  wardId: string,
  categoryId: string,
  userId: string,
  o: { warnMe: boolean; hours: string; others: string[] },
): Promise<void> {
  const hours = parseHours(o.hours);
  const others: string[] = [];
  for (const id of [...new Set(o.others.filter(Boolean))]) {
    if (id !== userId && (await isWardMember(env, wardId, id))) others.push(id);
  }
  await env.DB.prepare(
    `INSERT INTO service_warn_prefs (id, ward_id, category_id, user_id, warn_me, hours) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(category_id, user_id) DO UPDATE SET warn_me = excluded.warn_me, hours = excluded.hours`,
  )
    .bind(newId('swp'), wardId, categoryId, userId, o.warnMe ? 1 : 0, hours)
    .run();
  const pref = await env.DB.prepare(`SELECT id FROM service_warn_prefs WHERE category_id = ? AND user_id = ? AND ward_id = ?`)
    .bind(categoryId, userId, wardId)
    .first<{ id: string }>();
  if (!pref) return;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM service_warn_others WHERE pref_id = ? AND ward_id = ?`).bind(pref.id, wardId),
    ...others.map((uid) =>
      env.DB.prepare(`INSERT OR IGNORE INTO service_warn_others (id, ward_id, pref_id, user_id) VALUES (?, ?, ?, ?)`).bind(
        newId('swo'), wardId, pref.id, uid,
      ),
    ),
  ]);
}

export async function getWarnPref(
  env: Env,
  wardId: string,
  categoryId: string,
  userId: string,
): Promise<{ warn_me: number; hours: number; others: string[] } | null> {
  const p = await env.DB.prepare(`SELECT id, warn_me, hours FROM service_warn_prefs WHERE category_id = ? AND user_id = ? AND ward_id = ?`)
    .bind(categoryId, userId, wardId)
    .first<{ id: string; warn_me: number; hours: number }>();
  if (!p) return null;
  const o = await env.DB.prepare(`SELECT user_id FROM service_warn_others WHERE pref_id = ? AND ward_id = ?`)
    .bind(p.id, wardId)
    .all<{ user_id: string }>();
  return { warn_me: p.warn_me, hours: p.hours, others: (o.results ?? []).map((r) => r.user_id) };
}

// ---------------------------------------------------------------- Discord webhook

export const WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

// A secret: stored, never echoed or logged. '' clears it.
export async function setWebhook(env: Env, wardId: string, categoryId: string, raw: string): Promise<void> {
  const url = String(raw ?? '').trim();
  need(url === '' || WEBHOOK_RE.test(url), 'That isn’t a Discord channel webhook link (https://discord.com/api/webhooks/…).');
  await env.DB.prepare(`UPDATE service_categories SET discord_webhook_url = ? WHERE id = ? AND ward_id = ?`)
    .bind(url || null, categoryId, wardId)
    .run();
}

// Only the Discord poster reads this.
export async function getWebhook(env: Env, wardId: string, categoryId: string): Promise<string | null> {
  const r = await env.DB.prepare(`SELECT discord_webhook_url FROM service_categories WHERE id = ? AND ward_id = ?`)
    .bind(categoryId, wardId)
    .first<{ discord_webhook_url: string | null }>();
  const u = r?.discord_webhook_url ?? null;
  return u && WEBHOOK_RE.test(u) ? u : null;
}


