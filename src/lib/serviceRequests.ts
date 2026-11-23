// Members' requests for help (spec §6). Minimal by design (General Handbook 38.8.32 treats
// temporal needs as confidential): name, email (verified by an emailed link), optional phone, an
// optional one-line note; moving adds in/out + a preferred date; Christmas adds own/other
// family. Nothing else is stored, whatever else is posted.
//
// Requesters are not volunteers: their own table, tokens and rate-limit buckets, no approval.
// Leaders are told by email only, and that email never carries the request's details.
// Functions return Outcome<T> (messages for deliver()); permission checks happen in the routes
// (serviceAccess.ts) before these are called. Every query filters ward_id.
import type { Env } from '../types';
import { newId, randomToken } from './ids';
import type { Outcome, OutgoingMessage } from './volMessages';
import { normalizeEmail } from './volSignup';
import { sha256Hex } from './volSession';
import { isValidDate } from './wardTime';
import { delegateUserIds, requestNotifyEmails } from './serviceAccess';
import { getCategoryRow, type CategoryRow } from './serviceCategories';
import * as RE from './requestEmails';

export class RequestInputError extends Error {}

export const REQUEST_STATUSES = ['new', 'in_progress', 'done', 'declined'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const STATUS_LABELS: Record<string, string> = {
  unverified: 'Not confirmed yet',
  new: 'New',
  in_progress: 'In progress',
  done: 'Done',
  declined: 'Declined',
};

const VERIFY_HOURS = 48;
const DAY = 86_400_000;

export interface RequestRow {
  id: string;
  ward_id: string;
  category_id: string;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  moving_dir: 'in' | 'out' | null;
  preferred_date: string | null;
  christmas_for: 'own' | 'other' | null;
  status: string;
  assigned_user_id: string | null;
  private_note: string | null;
  verified_at: string | null;
  closed_at: string | null;
  created_at: string;
}

// Which extra fields a request category asks for (the defaults' slugs).
export function requestKind(cat: { slug: string }): 'moving' | 'christmas' | 'other' {
  if (cat.slug === 'req-moving') return 'moving';
  if (cat.slug === 'req-christmas') return 'christmas';
  return 'other';
}

function join(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// The form's plain "who will see this" line (spec §6.1).
export async function whoSeesText(env: Env, wardId: string, cat: CategoryRow): Promise<string> {
  const spaces = await env.DB.prepare(
    `SELECT s.name, s.kind FROM service_category_spaces cs JOIN spaces s ON s.id = cs.space_id AND s.ward_id = cs.ward_id
      WHERE cs.category_id = ? AND cs.ward_id = ? ORDER BY s.position`,
  )
    .bind(cat.id, wardId)
    .all<{ name: string; kind: string }>();
  const list = spaces.results ?? [];
  if (cat.confidential) {
    if (!list.length || list.every((s) => s.kind === 'bishopric')) return 'Only the bishop and the people he asks to help will see this.';
    return `Only the ${join(list.map((s) => s.name))} leaders and the people they ask to help will see this.`;
  }
  const names = list.filter((s) => s.kind !== 'bishopric').map((s) => s.name);
  if (!names.length) return 'Only the bishopric and the people they ask to help will see this.';
  return `Only the ${join(names)} leaders, the bishopric and the people they ask to help will see this.`;
}

export interface RequestInput {
  name: string;
  email: string;
  phone: string;
  note: string;
  moving_dir: string;
  preferred_date: string;
  christmas_for: string;
}

export interface CleanRequest {
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  moving_dir: 'in' | 'out' | null;
  preferred_date: string | null;
  christmas_for: 'own' | 'other' | null;
}

function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new RequestInputError(msg);
}

// Validates exactly the fields this category asks for; everything else is dropped.
export function checkRequest(cat: { slug: string }, i: RequestInput): CleanRequest {
  const name = String(i.name ?? '').replace(/\s+/g, ' ').trim();
  need(name.length >= 1 && name.length <= 80, 'Please enter your name (80 characters at most).');
  const email = normalizeEmail(String(i.email ?? ''));
  need(email, 'Please enter a valid email address.');
  const phone = String(i.phone ?? '').trim() || null;
  need(!phone || phone.length <= 30, 'The phone number is too long (30 characters at most).');
  const note = String(i.note ?? '').replace(/\s+/g, ' ').trim() || null;
  need(!note || note.length <= 200, 'The note is too long (200 characters at most). We’ll talk through the details with you in person.');
  const kind = requestKind(cat);
  let moving_dir: 'in' | 'out' | null = null;
  let preferred_date: string | null = null;
  let christmas_for: 'own' | 'other' | null = null;
  if (kind === 'moving') {
    need(i.moving_dir === 'in' || i.moving_dir === 'out', 'Please say whether you are moving in or moving out.');
    moving_dir = i.moving_dir;
    const d = String(i.preferred_date ?? '').trim();
    need(!d || isValidDate(d), 'Pick a real date (or leave the date empty).');
    preferred_date = d || null;
  }
  if (kind === 'christmas') {
    need(i.christmas_for === 'own' || i.christmas_for === 'other', 'Please say whether this is for your family or another family.');
    christmas_for = i.christmas_for;
  }
  return { name, email, phone, note, moving_dir, preferred_date, christmas_for };
}

// Creates an unverified request and emails a single-use, 48-hour confirm link.
export async function submitRequest(
  env: Env,
  o: { wardId: string; wardName: string; category: CategoryRow; input: CleanRequest; now: Date },
): Promise<Outcome<string>> {
  const id = newId('sreq');
  const token = randomToken(24);
  const r = o.input;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO service_requests
         (id, ward_id, category_id, name, email, phone, note, moving_dir, preferred_date, christmas_for, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?)`,
    ).bind(id, o.wardId, o.category.id, r.name, r.email, r.phone, r.note, r.moving_dir, r.preferred_date, r.christmas_for, o.now.toISOString()),
    env.DB.prepare(
      `INSERT INTO request_tokens (id, ward_id, request_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      newId('rtk'), o.wardId, id, await sha256Hex(token), new Date(o.now.getTime() + VERIFY_HOURS * 3_600_000).toISOString(), o.now.toISOString(),
    ),
  ]);
  return {
    result: id,
    messages: [
      RE.requestVerify({
        to: r.email, name: r.name, wardName: o.wardName, categoryName: o.category.name,
        verifyUrl: `${env.APP_URL}/help/verify/${token}`, ref: id, wardId: o.wardId,
      }),
    ],
  };
}

// The confirm link's POST: the request becomes 'new'; the requester gets an acknowledgment and
// the category's people a notice with no details. A used, expired or unknown token -> 'invalid'.
export async function verifyRequest(env: Env, token: string, now: Date): Promise<Outcome<'verified' | 'invalid'> & { prefix?: string }> {
  const invalid = { result: 'invalid' as const, messages: [] };
  if (!token || token.length > 200) return invalid;
  const row = await env.DB.prepare(
    `SELECT t.id, t.ward_id, t.request_id FROM request_tokens t JOIN wards w ON w.id = t.ward_id
      WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > ? AND w.status = 'active'`,
  )
    .bind(await sha256Hex(token), now.toISOString())
    .first<{ id: string; ward_id: string; request_id: string }>();
  if (!row) return invalid;
  const claim = await env.DB.prepare(`UPDATE request_tokens SET used_at = ? WHERE id = ? AND ward_id = ? AND used_at IS NULL`)
    .bind(now.toISOString(), row.id, row.ward_id)
    .run();
  if (!claim.meta.changes) return invalid;
  const moved = await env.DB.prepare(
    `UPDATE service_requests SET status = 'new', verified_at = ? WHERE id = ? AND ward_id = ? AND status = 'unverified'`,
  )
    .bind(now.toISOString(), row.request_id, row.ward_id)
    .run();
  const req = await getRequest(env, row.ward_id, row.request_id);
  const ward = await env.DB.prepare(`SELECT name, prefix FROM wards WHERE id = ?`).bind(row.ward_id).first<{ name: string; prefix: string }>();
  if (!req || !ward) return invalid;
  if (!moved.meta.changes) return { result: 'verified', messages: [], prefix: ward.prefix };
  const cat = await getCategoryRow(env, row.ward_id, req.category_id);
  const categoryName = cat?.name ?? 'help';
  const messages: OutgoingMessage[] = [
    RE.requestAck({ to: req.email, name: req.name, wardName: ward.name, categoryName, ref: req.id, wardId: row.ward_id }),
  ];
  for (const to of await requestNotifyEmails(env, row.ward_id, req.category_id)) {
    messages.push(
      RE.requestNotice({ to, categoryName, url: `${env.APP_URL}/w/${row.ward_id}/requests/${req.id}`, ref: req.id, wardId: row.ward_id }),
    );
  }
  return { result: 'verified', messages, prefix: ward.prefix };
}

export async function getRequest(env: Env, wardId: string, id: string): Promise<RequestRow | null> {
  if (!wardId || !id) return null;
  return env.DB.prepare(`SELECT * FROM service_requests WHERE id = ? AND ward_id = ?`).bind(id, wardId).first<RequestRow>();
}

export interface InboxRow extends RequestRow {
  category_name: string;
  category_icon: string;
  assigned_name: string | null;
}

// Verified requests in the given categories (the route passes the ones the user may see),
// newest first, optionally one status.
export async function listRequests(env: Env, wardId: string, categoryIds: string[], status?: string): Promise<InboxRow[]> {
  if (!categoryIds.length) return [];
  const where = [`r.ward_id = ?`, `r.status <> 'unverified'`, `r.category_id IN (${categoryIds.map(() => '?').join(',')})`];
  const binds: unknown[] = [wardId, ...categoryIds];
  if (status && (REQUEST_STATUSES as readonly string[]).includes(status)) {
    where.push('r.status = ?');
    binds.push(status);
  }
  const res = await env.DB.prepare(
    `SELECT r.*, c.name AS category_name, c.icon AS category_icon, u.name AS assigned_name
       FROM service_requests r
       JOIN service_categories c ON c.id = r.category_id AND c.ward_id = r.ward_id
       LEFT JOIN users u ON u.id = r.assigned_user_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC, r.id`,
  )
    .bind(...binds)
    .all<InboxRow>();
  return res.results ?? [];
}

export interface RequestUpdate {
  status: string;
  privateNote: string;
  assignedUserId: string;
  closingMessage: string;
}

// Status, private note (≤200), assignee (one of the category's delegates, or nobody). The save
// that closes it (done/declined) stamps closed_at (the 30-day clock) and, with a message
// (≤500), emails the requester once; reopening clears closed_at.
export async function updateRequest(env: Env, wardId: string, id: string, u: RequestUpdate, now: Date): Promise<Outcome<void>> {
  const req = await getRequest(env, wardId, id);
  need(req && req.status !== 'unverified', 'That request no longer exists.');
  need((REQUEST_STATUSES as readonly string[]).includes(u.status), 'Pick a status.');
  const privateNote = String(u.privateNote ?? '').replace(/\s+/g, ' ').trim() || null;
  need(!privateNote || privateNote.length <= 200, 'The private note is too long (200 characters at most). Keep details in person.');
  let assigned: string | null = null;
  if (u.assignedUserId) {
    need((await delegateUserIds(env, wardId, req.category_id)).includes(u.assignedUserId), 'Assign it to one of this category’s helpers.');
    assigned = u.assignedUserId;
  }
  const message = String(u.closingMessage ?? '').trim();
  need(message.length <= 500, 'The message is too long (500 characters at most).');
  const wasClosed = req.status === 'done' || req.status === 'declined';
  const closing = u.status === 'done' || u.status === 'declined';
  const closedAt = closing ? (wasClosed ? req.closed_at : now.toISOString()) : null;
  await env.DB.prepare(
    `UPDATE service_requests SET status = ?, private_note = ?, assigned_user_id = ?, closed_at = ? WHERE id = ? AND ward_id = ?`,
  )
    .bind(u.status, privateNote, assigned, closedAt, id, wardId)
    .run();
  const messages: OutgoingMessage[] = [];
  if (closing && !wasClosed && message) {
    const ward = await env.DB.prepare(`SELECT name FROM wards WHERE id = ?`).bind(wardId).first<{ name: string }>();
    messages.push(RE.requestClosed({ to: req.email, name: req.name, wardName: ward?.name ?? 'Your ward', message, ref: id, wardId }));
  }
  return { result: undefined, messages };
}

// Hourly: requests closed more than 30 days ago (row, contact and notes), unverified ones older
// than 7 days, and expired tokens. Open requests are kept.
export async function purgeRequests(env: Env, now: Date): Promise<number> {
  const closedBefore = new Date(now.getTime() - 30 * DAY).toISOString();
  const unverifiedBefore = new Date(now.getTime() - 7 * DAY).toISOString();
  const res = await env.DB.batch([
    env.DB.prepare(`DELETE FROM service_requests WHERE status IN ('done','declined') AND closed_at IS NOT NULL AND closed_at < ?`).bind(closedBefore),
    env.DB.prepare(`DELETE FROM service_requests WHERE status = 'unverified' AND created_at < ?`).bind(unverifiedBefore),
    env.DB.prepare(`DELETE FROM request_tokens WHERE expires_at < ?`).bind(now.toISOString()),
  ]);
  return (res[0]?.meta.changes ?? 0) + (res[1]?.meta.changes ?? 0);
}
