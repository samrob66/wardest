// Volunteer posts, their dates and helper roles: CRUD, counts, copy date / copy post, and the
// ward listings. Every query filters ward_id; an id from another ward behaves as "not found".
// Permission checks happen in the routes (volAccess.ts) before these are called.
import type { Env } from '../types';
import { newId, randomToken } from './ids';
import type { OutgoingMessage } from './volMessages';
import { roleChanged, signupRemoved, type EmailPost } from './volEmails';
import {
  addDays, dateOverAt, diffDays, formatTime, formatWhen, isValidDate, isValidTime, wardToday,
} from './wardTime';
import { categorySpaceIds, defaultCategoryForSpace, ensureServiceCategories, getCategoryRow, parseAudiences } from './serviceCategories';

export class VolInputError extends Error {}

export interface PostInput {
  title: string;
  public_note: string | null;
  private_details: string | null;
  cancel_cutoff_hours: number;
  // Service spec §5. createPost: the category (its owning spaces must include the post's space;
  // when absent, the space's default category, see defaultCategoryForSpace) and who it's for
  // (when absent, the category's default audiences). updatePost: audiences change only when given.
  categoryId?: string | null;
  audiences?: string | string[];
}

export interface RoleInput {
  name: string;
  needed: number;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  bring_prompt: string | null;
}

export interface PostRow {
  id: string;
  ward_id: string;
  space_id: string;
  public_id: string;
  category_id: string | null;
  audiences: string;
  title: string;
  public_note: string | null;
  private_details: string | null;
  cancel_cutoff_hours: number;
  full_notified_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DateRow {
  id: string;
  ward_id: string;
  post_id: string;
  date: string;
  start_time: string | null;
  approval_nudged_at: string | null;
  position: number;
}

export interface RoleRow {
  id: string;
  ward_id: string;
  post_id: string;
  date_id: string;
  name: string;
  needed: number;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  bring_prompt: string | null;
  position: number;
}

export interface RoleFull extends RoleRow {
  confirmed: number;
  waiting: number;
}

export interface DateFull extends DateRow {
  roles: RoleFull[];
}

export interface WardInfo {
  id: string;
  name: string;
  prefix: string;
  timezone: string;
}

export interface PostFull extends PostRow {
  org_name: string;
  category_name: string | null;
  category_icon: string | null;
  ward: WardInfo;
  dates: DateFull[];
}

export interface PostSummary {
  id: string;
  public_id: string;
  title: string;
  org_name: string;
  space_id: string;
  category_id: string | null;
  audiences: string;
  created_by_user_id: string | null;
  first_date: string | null;
  last_date: string | null;
  confirmed: number;
  needed: number;
  waiting: number;
  short_soon: boolean;
}

// ---------------------------------------------------------------- time helpers

// Role start = role.start_time ?? date.start_time ?? '00:00' on date.date, ward-local.
export function roleStartTime(date: { start_time: string | null }, role: { start_time: string | null }): string {
  return role.start_time ?? date.start_time ?? '00:00';
}

// 'Sunday, Dec 6 · 9:00 AM – 11:00 AM' (no time -> just the day).
export function whenText(
  date: { date: string; start_time: string | null },
  role: { start_time: string | null; end_time: string | null },
): string {
  const start = role.start_time ?? date.start_time;
  const base = formatWhen(date.date, start);
  return start && role.end_time ? `${base} – ${formatTime(role.end_time)}` : base;
}

export function isDateOver(date: string, tz: string, now: Date): boolean {
  return now.getTime() >= dateOverAt(date, tz).getTime();
}

// A post is over (past) when all its dates are over. A post with no dates isn't.
export function isPostOver(post: { dates: Array<{ date: string }>; ward: { timezone: string } }, now: Date): boolean {
  if (!post.dates.length) return false;
  return post.dates.every((d) => isDateOver(d.date, post.ward.timezone, now));
}

// A role as it reads in a message to a parent who signed up a child: "Helpers (for Ana)".
export function roleLabel(roleName: string, childName: string | null | undefined): string {
  return childName ? `${roleName} (for ${childName})` : roleName;
}

// Who is serving, as leaders see it: "Ana (signed up by Jane Doe)".
export function serverName(name: string, childName: string | null | undefined): string {
  return childName ? `${childName} (signed up by ${name})` : name;
}

export function emailPost(post: { org_name: string; title: string; public_id: string }, appUrl: string): EmailPost {
  return { orgName: post.org_name, title: post.title, publicUrl: `${appUrl}/v/${post.public_id}` };
}

// ---------------------------------------------------------------- validation

function req(cond: boolean, msg: string): void {
  if (!cond) throw new VolInputError(msg);
}

function cleanText(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  return s ? s : null;
}

// Who a post is for, as stored: canonical, non-empty (spec §5).
function checkAudiences(raw: string | string[]): string {
  const list = parseAudiences(raw);
  req(list.length > 0, 'Pick at least one: brothers, sisters, youth or children.');
  return list.join(',');
}

// Posts with youth or children audiences let a parent sign up a child (spec §5).
export function takesChildren(post: { audiences: string }): boolean {
  const a = parseAudiences(post.audiences ?? '');
  return a.includes('youth') || a.includes('children');
}

function checkPost(i: PostInput): PostInput {
  const title = (i.title ?? '').trim();
  req(title.length >= 1 && title.length <= 120, 'Title must be 1–120 characters.');
  const public_note = cleanText(i.public_note);
  const private_details = cleanText(i.private_details);
  req(!public_note || public_note.length <= 4000, 'The public note is too long (4000 characters at most).');
  req(!private_details || private_details.length <= 4000, 'The private details are too long (4000 characters at most).');
  req(
    Number.isInteger(i.cancel_cutoff_hours) && i.cancel_cutoff_hours >= 0 && i.cancel_cutoff_hours <= 336,
    'The cancel cutoff must be a whole number of hours from 0 to 336.',
  );
  return { title, public_note, private_details, cancel_cutoff_hours: i.cancel_cutoff_hours };
}

function checkDate(date: string, startTime: string | null): { date: string; start: string | null } {
  req(isValidDate(date), 'Dates must be real dates (YYYY-MM-DD).');
  const start = cleanText(startTime);
  req(!start || isValidTime(start), 'Times must be HH:MM (24-hour).');
  return { date, start };
}

function checkRole(i: RoleInput): RoleInput {
  const name = (i.name ?? '').trim();
  req(name.length >= 1 && name.length <= 80, 'Role names must be 1–80 characters.');
  req(Number.isInteger(i.needed) && i.needed >= 1 && i.needed <= 500, 'The number needed must be from 1 to 500.');
  const start_time = cleanText(i.start_time);
  const end_time = cleanText(i.end_time);
  req(!start_time || isValidTime(start_time), 'Times must be HH:MM (24-hour).');
  req(!end_time || isValidTime(end_time), 'Times must be HH:MM (24-hour).');
  req(!(start_time && end_time) || end_time > start_time, 'The end time must be after the start time.');
  const note = cleanText(i.note);
  const bring_prompt = cleanText(i.bring_prompt);
  req(!note || note.length <= 4000, 'The role note is too long (4000 characters at most).');
  req(!bring_prompt || bring_prompt.length <= 200, 'The "what are you bringing?" prompt is too long (200 at most).');
  return { name, needed: i.needed, start_time, end_time, note, bring_prompt };
}

// A post's space: an org, the Ward Council or the Bishopric (service spec §3), not archived.
async function requirePostSpace(env: Env, wardId: string, spaceId: string): Promise<void> {
  const sp = await env.DB.prepare(
    `SELECT 1 AS ok FROM spaces WHERE id = ? AND ward_id = ? AND kind IN ('org','ward_council','bishopric') AND archived = 0`,
  )
    .bind(spaceId, wardId)
    .first();
  req(sp != null, 'Pick one of this ward’s organizations.');
}

async function postRow(env: Env, wardId: string, postId: string): Promise<PostRow | null> {
  return env.DB.prepare(`SELECT * FROM vol_posts WHERE id = ? AND ward_id = ?`).bind(postId, wardId).first<PostRow>();
}

async function dateRow(env: Env, wardId: string, dateId: string): Promise<DateRow | null> {
  return env.DB.prepare(`SELECT * FROM vol_dates WHERE id = ? AND ward_id = ?`).bind(dateId, wardId).first<DateRow>();
}

async function roleRow(env: Env, wardId: string, roleId: string): Promise<RoleRow | null> {
  return env.DB.prepare(`SELECT * FROM vol_roles WHERE id = ? AND ward_id = ?`).bind(roleId, wardId).first<RoleRow>();
}

// ---------------------------------------------------------------- posts

// The route checks the right to create (serviceAccess.canCreateInCategory) first; this checks
// the data: the space may hold posts and owns the category, and the category is an opportunity
// category of this ward.
export async function createPost(env: Env, wardId: string, spaceId: string, byUserId: string, input: PostInput): Promise<string> {
  const p = checkPost(input);
  await requirePostSpace(env, wardId, spaceId);
  let categoryId = input.categoryId ?? null;
  let defaults = 'brothers,sisters';
  if (categoryId) {
    const cat = await getCategoryRow(env, wardId, categoryId);
    req(cat != null && cat.kind === 'opportunity', 'Pick one of this ward’s service categories.');
    req((await categorySpaceIds(env, wardId, categoryId)).includes(spaceId), 'That organization doesn’t own this category.');
    defaults = cat!.default_audiences || defaults;
  } else {
    await ensureServiceCategories(env, wardId);
    categoryId = await defaultCategoryForSpace(env, wardId, spaceId);
    const cat = categoryId ? await getCategoryRow(env, wardId, categoryId) : null;
    defaults = cat?.default_audiences || defaults;
  }
  const audiences = checkAudiences(input.audiences !== undefined ? input.audiences : defaults);
  const id = newId('vp');
  await env.DB.prepare(
    `INSERT INTO vol_posts (id, ward_id, space_id, category_id, audiences, public_id, title, public_note, private_details, cancel_cutoff_hours, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, wardId, spaceId, categoryId, audiences, randomToken(12), p.title, p.public_note, p.private_details, p.cancel_cutoff_hours, byUserId)
    .run();
  return id;
}

export async function updatePost(env: Env, wardId: string, postId: string, input: PostInput): Promise<void> {
  const p = checkPost(input);
  const old = await postRow(env, wardId, postId);
  req(old != null, 'That post no longer exists.');
  const audiences = input.audiences !== undefined ? checkAudiences(input.audiences) : old!.audiences;
  await env.DB.prepare(
    `UPDATE vol_posts SET title = ?, public_note = ?, private_details = ?, cancel_cutoff_hours = ?, audiences = ?, updated_at = datetime('now')
      WHERE id = ? AND ward_id = ?`,
  )
    .bind(p.title, p.public_note, p.private_details, p.cancel_cutoff_hours, audiences, postId, wardId)
    .run();
}

// ---------------------------------------------------------------- dates

export async function addDate(env: Env, wardId: string, postId: string, date: string, startTime: string | null): Promise<string> {
  const d = checkDate(date, startTime);
  req((await postRow(env, wardId, postId)) != null, 'That post no longer exists.');
  const pos = await env.DB.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM vol_dates WHERE post_id = ? AND ward_id = ?`)
    .bind(postId, wardId)
    .first<{ p: number }>();
  const id = newId('vd');
  await env.DB.prepare(`INSERT INTO vol_dates (id, ward_id, post_id, date, start_time, position) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, wardId, postId, d.date, d.start, pos?.p ?? 0)
    .run();
  return id;
}

interface AffectedSignup {
  signup_id: string;
  role_id: string;
  email: string;
  name: string;
  child_name: string;
  status: string;
  verified: string | null;
  date: string;
  date_start: string | null;
  role_name: string;
  role_start: string | null;
  role_end: string | null;
}

async function affectedSignups(env: Env, wardId: string, where: string, id: string): Promise<AffectedSignup[]> {
  const res = await env.DB.prepare(
    `SELECT s.id AS signup_id, s.role_id AS role_id, v.email AS email, v.name AS name, s.child_name AS child_name, s.status AS status,
            v.email_verified_at AS verified, d.date AS date, d.start_time AS date_start,
            r.name AS role_name, r.start_time AS role_start, r.end_time AS role_end
       FROM vol_signups s
       JOIN volunteers v ON v.id = s.volunteer_id AND v.ward_id = s.ward_id
       JOIN vol_roles r ON r.id = s.role_id AND r.ward_id = s.ward_id
       JOIN vol_dates d ON d.id = r.date_id AND d.ward_id = s.ward_id
      WHERE s.ward_id = ? AND ${where} = ? AND s.status IN ('waiting','confirmed')`,
  )
    .bind(wardId, id)
    .all<AffectedSignup>();
  return res.results ?? [];
}

async function postHeader(env: Env, wardId: string, postId: string): Promise<{ post: EmailPost; prefix: string; tz: string } | null> {
  const r = await env.DB.prepare(
    `SELECT p.title AS title, p.public_id AS public_id, s.name AS org_name, w.prefix AS prefix, w.timezone AS tz
       FROM vol_posts p JOIN spaces s ON s.id = p.space_id JOIN wards w ON w.id = p.ward_id
      WHERE p.id = ? AND p.ward_id = ?`,
  )
    .bind(postId, wardId)
    .first<{ title: string; public_id: string; org_name: string; prefix: string; tz: string }>();
  if (!r) return null;
  return { post: emailPost(r, env.APP_URL), prefix: r.prefix, tz: r.tz };
}

// Changing a date (or its start time) tells confirmed volunteers whose role time changed.
// Saving it unchanged does nothing; a date that was already over tells no one.
export async function updateDate(
  env: Env,
  wardId: string,
  dateId: string,
  date: string,
  startTime: string | null,
  now: Date = new Date(),
): Promise<OutgoingMessage[]> {
  const d = checkDate(date, startTime);
  const old = await dateRow(env, wardId, dateId);
  req(old != null, 'That date no longer exists.');
  if (old!.date === d.date && (old!.start_time ?? null) === d.start) return [];
  // A date that's over keeps its history; moving it would carry its volunteers to a date they
  // never chose (round 2). Reuse it with Copy date instead.
  const tzRow = await env.DB.prepare(`SELECT timezone FROM wards WHERE id = ?`).bind(wardId).first<{ timezone: string }>();
  req(tzRow != null && !isDateOver(old!.date, tzRow.timezone, now), 'This date is over; use Copy date to reuse it.');
  const before = await affectedSignups(env, wardId, 'd.id', dateId);
  await env.DB.prepare(`UPDATE vol_dates SET date = ?, start_time = ?, approval_nudged_at = NULL WHERE id = ? AND ward_id = ?`)
    .bind(d.date, d.start, dateId, wardId)
    .run();
  // A moved date gets a fresh reminder (and a fresh 48h nudge, above).
  await env.DB.prepare(
    `UPDATE vol_signups SET reminded_at = NULL
      WHERE ward_id = ? AND role_id IN (SELECT id FROM vol_roles WHERE date_id = ? AND ward_id = ?)`,
  )
    .bind(wardId, dateId, wardId)
    .run();
  const head = await postHeader(env, wardId, old!.post_id);
  if (!head || isDateOver(old!.date, head.tz, now) || isDateOver(d.date, head.tz, now)) return [];
  const out: OutgoingMessage[] = [];
  for (const s of before) {
    if (s.status !== 'confirmed') continue;
    const role = { start_time: s.role_start, end_time: s.role_end };
    const oldWhen = whenText({ date: s.date, start_time: s.date_start }, role);
    const newWhen = whenText({ date: d.date, start_time: d.start }, role);
    if (oldWhen === newWhen) continue;
    out.push(
      roleChanged({
        to: s.email, name: s.name, post: head.post, roleName: roleLabel(s.role_name, s.child_name), oldWhen, newWhen,
        mySignupsUrl: `${env.APP_URL}/vol/${head.prefix}/me`,
      }),
    );
  }
  return out;
}

// New date with the same start time and roles, no sign-ups ("copy this date").
export async function copyDate(env: Env, wardId: string, dateId: string, newDate: string): Promise<string> {
  const src = await dateRow(env, wardId, dateId);
  req(src != null, 'That date no longer exists.');
  const id = await addDate(env, wardId, src!.post_id, newDate, src!.start_time);
  const roles = await env.DB.prepare(`SELECT * FROM vol_roles WHERE date_id = ? AND ward_id = ? ORDER BY position, rowid`)
    .bind(dateId, wardId)
    .all<RoleRow>();
  for (const r of roles.results ?? []) {
    await addRole(env, wardId, id, r);
  }
  return id;
}

function removalMessages(env: Env, rows: AffectedSignup[], head: { post: EmailPost; tz: string }, now: Date): OutgoingMessage[] {
  const out: OutgoingMessage[] = [];
  for (const s of rows) {
    if (isDateOver(s.date, head.tz, now)) continue;
    if (s.status === 'waiting' && !s.verified) continue;
    out.push(
      signupRemoved({
        to: s.email, name: s.name, post: head.post,
        when: whenText({ date: s.date, start_time: s.date_start }, { start_time: s.role_start, end_time: s.role_end }),
        roleName: roleLabel(s.role_name, s.child_name), reason: 'deleted',
      }),
    );
  }
  return out;
}

export async function deleteDate(env: Env, wardId: string, dateId: string, now: Date = new Date()): Promise<OutgoingMessage[]> {
  const d = await dateRow(env, wardId, dateId);
  if (!d) return [];
  const head = await postHeader(env, wardId, d.post_id);
  const rows = await affectedSignups(env, wardId, 'd.id', dateId);
  await env.DB.prepare(`DELETE FROM vol_dates WHERE id = ? AND ward_id = ?`).bind(dateId, wardId).run();
  return head ? removalMessages(env, rows, head, now) : [];
}

// ---------------------------------------------------------------- roles

export async function addRole(env: Env, wardId: string, dateId: string, input: RoleInput): Promise<string> {
  const r = checkRole(input);
  const d = await dateRow(env, wardId, dateId);
  req(d != null, 'That date no longer exists.');
  const pos = await env.DB.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM vol_roles WHERE date_id = ? AND ward_id = ?`)
    .bind(dateId, wardId)
    .first<{ p: number }>();
  const id = newId('vr');
  await env.DB.prepare(
    `INSERT INTO vol_roles (id, ward_id, post_id, date_id, name, needed, start_time, end_time, note, bring_prompt, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, wardId, d!.post_id, dateId, r.name, r.needed, r.start_time, r.end_time, r.note, r.bring_prompt, pos?.p ?? 0)
    .run();
  await resetFullIfShort(env, wardId, d!.post_id);
  return id;
}

// Changing a role's times tells its confirmed volunteers; other edits send nothing.
export async function updateRole(
  env: Env,
  wardId: string,
  roleId: string,
  input: RoleInput,
  now: Date = new Date(),
): Promise<OutgoingMessage[]> {
  const r = checkRole(input);
  const old = await roleRow(env, wardId, roleId);
  req(old != null, 'That role no longer exists.');
  await env.DB.prepare(
    `UPDATE vol_roles SET name = ?, needed = ?, start_time = ?, end_time = ?, note = ?, bring_prompt = ?
      WHERE id = ? AND ward_id = ?`,
  )
    .bind(r.name, r.needed, r.start_time, r.end_time, r.note, r.bring_prompt, roleId, wardId)
    .run();
  await resetFullIfShort(env, wardId, old!.post_id);
  if (r.needed > old!.needed) await clearOverLimit(env, wardId, roleId);
  if (old!.start_time === r.start_time && old!.end_time === r.end_time) return [];
  const d = await dateRow(env, wardId, old!.date_id);
  const head = await postHeader(env, wardId, old!.post_id);
  if (!d || !head || isDateOver(d.date, head.tz, now)) return [];
  const oldWhen = whenText(d, old!);
  const newWhen = whenText(d, r);
  if (oldWhen === newWhen) return [];
  const rows = await affectedSignups(env, wardId, 's.role_id', roleId);
  if (r.start_time !== old!.start_time) {
    await env.DB.prepare(`UPDATE vol_signups SET reminded_at = NULL WHERE role_id = ? AND ward_id = ?`).bind(roleId, wardId).run();
  }
  return rows
    .filter((s) => s.status === 'confirmed')
    .map((s) =>
      roleChanged({
        to: s.email, name: s.name, post: head.post, roleName: roleLabel(r.name, s.child_name), oldWhen, newWhen,
        mySignupsUrl: `${env.APP_URL}/vol/${head.prefix}/me`,
      }),
    );
}

export async function deleteRole(env: Env, wardId: string, roleId: string, now: Date = new Date()): Promise<OutgoingMessage[]> {
  const r = await roleRow(env, wardId, roleId);
  if (!r) return [];
  const head = await postHeader(env, wardId, r.post_id);
  const rows = await affectedSignups(env, wardId, 's.role_id', roleId);
  await env.DB.prepare(`DELETE FROM vol_roles WHERE id = ? AND ward_id = ?`).bind(roleId, wardId).run();
  return head ? removalMessages(env, rows, head, now) : [];
}

export async function deletePost(env: Env, wardId: string, postId: string, now: Date = new Date()): Promise<OutgoingMessage[]> {
  const p = await postRow(env, wardId, postId);
  if (!p) return [];
  const head = await postHeader(env, wardId, postId);
  const rows = await affectedSignups(env, wardId, 's.post_id', postId);
  await env.DB.prepare(`DELETE FROM vol_posts WHERE id = ? AND ward_id = ?`).bind(postId, wardId).run();
  return head ? removalMessages(env, rows, head, now) : [];
}

// New post from an old one: every date shifted by (newFirstDate − old first date) days, new
// public id, no sign-ups ("Copy this post").
export async function copyPost(env: Env, wardId: string, postId: string, newFirstDate: string, byUserId: string): Promise<string> {
  req(isValidDate(newFirstDate), 'Pick a real first date.');
  const src = await getPost(env, wardId, postId);
  req(src != null, 'That post no longer exists.');
  const id = await createPost(env, wardId, src!.space_id, byUserId, {
    title: src!.title,
    public_note: src!.public_note,
    private_details: src!.private_details,
    cancel_cutoff_hours: src!.cancel_cutoff_hours,
    categoryId: src!.category_id,
    audiences: src!.audiences,
  });
  const first = src!.dates[0]?.date;
  const shift = first ? diffDays(first, newFirstDate) : 0;
  for (const d of src!.dates) {
    const nd = await addDate(env, wardId, id, addDays(d.date, shift), d.start_time);
    for (const r of d.roles) await addRole(env, wardId, nd, r);
  }
  return id;
}

// ---------------------------------------------------------------- reads

async function loadFull(env: Env, p: PostRow): Promise<PostFull | null> {
  const head = await env.DB.prepare(
    `SELECT s.name AS org_name, w.id AS wid, w.name AS wname, w.prefix AS prefix, w.timezone AS tz,
            c.name AS category_name, c.icon AS category_icon
       FROM spaces s JOIN wards w ON w.id = s.ward_id
       LEFT JOIN service_categories c ON c.id = ? AND c.ward_id = w.id
      WHERE s.id = ? AND s.ward_id = ? AND w.id = ?`,
  )
    .bind(p.category_id, p.space_id, p.ward_id, p.ward_id)
    .first<{ org_name: string; wid: string; wname: string; prefix: string; tz: string; category_name: string | null; category_icon: string | null }>();
  if (!head) return null;
  const dates = await env.DB.prepare(`SELECT * FROM vol_dates WHERE post_id = ? AND ward_id = ? ORDER BY date, start_time, position`)
    .bind(p.id, p.ward_id)
    .all<DateRow>();
  const roles = await env.DB.prepare(`SELECT * FROM vol_roles WHERE post_id = ? AND ward_id = ? ORDER BY position, rowid`)
    .bind(p.id, p.ward_id)
    .all<RoleRow>();
  const counts = await env.DB.prepare(
    `SELECT role_id, SUM(status = 'confirmed') AS confirmed, SUM(status = 'waiting') AS waiting
       FROM vol_signups WHERE post_id = ? AND ward_id = ? GROUP BY role_id`,
  )
    .bind(p.id, p.ward_id)
    .all<{ role_id: string; confirmed: number; waiting: number }>();
  const byRole = new Map((counts.results ?? []).map((c) => [c.role_id, c]));
  const full: DateFull[] = (dates.results ?? []).map((d) => ({
    ...d,
    roles: (roles.results ?? [])
      .filter((r) => r.date_id === d.id)
      .map((r) => ({ ...r, confirmed: byRole.get(r.id)?.confirmed ?? 0, waiting: byRole.get(r.id)?.waiting ?? 0 })),
  }));
  return {
    ...p,
    org_name: head.org_name,
    category_name: head.category_name ?? null,
    category_icon: head.category_icon ?? null,
    ward: { id: head.wid, name: head.wname, prefix: head.prefix, timezone: head.tz },
    dates: full,
  };
}

export async function getPost(env: Env, wardId: string, postId: string): Promise<PostFull | null> {
  const p = await postRow(env, wardId, postId);
  return p ? loadFull(env, p) : null;
}

// Public ids are globally unique; everything after this lookup is scoped to the post's ward.
// A suspended ward's posts are not found (like its public portal).
export async function getPostByPublicId(env: Env, publicId: string): Promise<PostFull | null> {
  if (!publicId || publicId.length > 64) return null;
  const p = await env.DB.prepare(
    `SELECT p.* FROM vol_posts p JOIN wards w ON w.id = p.ward_id WHERE p.public_id = ? AND w.status = 'active'`,
  )
    .bind(publicId)
    .first<PostRow>();
  return p ? loadFull(env, p) : null;
}

// Every role full (and at least one role)?
export function postIsFull(post: { dates: Array<{ roles: Array<{ confirmed: number; needed: number }> }> }): boolean {
  const roles = post.dates.flatMap((d) => d.roles);
  return roles.length > 0 && roles.every((r) => r.confirmed >= r.needed);
}

// Rule 14: the "fully filled" email can fire again once the post drops below full.
export async function resetFullIfShort(env: Env, wardId: string, postId: string): Promise<void> {
  const p = await getPost(env, wardId, postId);
  if (p && p.full_notified_at && !postIsFull(p)) {
    await env.DB.prepare(`UPDATE vol_posts SET full_notified_at = NULL WHERE id = ? AND ward_id = ?`).bind(postId, wardId).run();
  }
}

// "Over the limit" means the need was already met when this sign-up counted. Once someone ahead
// of them leaves (or the number needed goes up) they're needed after all: clear the flag for the
// confirmed sign-ups that now fall within the role's number. It is never set here (whoever
// lands over is told by email at the time, with a withdraw link).
export async function clearOverLimit(env: Env, wardId: string, roleId: string): Promise<void> {
  const role = await roleRow(env, wardId, roleId);
  if (!role) return;
  const rows = await env.DB.prepare(
    `SELECT id, over_limit FROM vol_signups WHERE role_id = ? AND ward_id = ? AND status = 'confirmed'
      ORDER BY confirm_seq, confirmed_at, id`,
  )
    .bind(roleId, wardId)
    .all<{ id: string; over_limit: number }>();
  for (const r of (rows.results ?? []).slice(0, role.needed)) {
    if (r.over_limit) {
      await env.DB.prepare(`UPDATE vol_signups SET over_limit = 0 WHERE id = ? AND ward_id = ?`).bind(r.id, wardId).run();
    }
  }
}

// Open posts (soonest first) or past posts (most recent first) for the ward, optionally one org.
export async function listWardPosts(
  env: Env,
  wardId: string,
  o: { spaceId?: string; past: boolean; now: Date },
): Promise<PostSummary[]> {
  const ward = await env.DB.prepare(`SELECT timezone FROM wards WHERE id = ?`).bind(wardId).first<{ timezone: string }>();
  if (!ward) return [];
  const tz = ward.timezone;
  const posts = await env.DB.prepare(
    `SELECT p.id, p.public_id, p.title, p.space_id, p.category_id, p.audiences, p.created_by_user_id, s.name AS org_name
       FROM vol_posts p JOIN spaces s ON s.id = p.space_id AND s.ward_id = p.ward_id
      WHERE p.ward_id = ? ${o.spaceId ? 'AND p.space_id = ?' : ''}`,
  )
    .bind(...(o.spaceId ? [wardId, o.spaceId] : [wardId]))
    .all<{ id: string; public_id: string; title: string; space_id: string; category_id: string | null; audiences: string; created_by_user_id: string | null; org_name: string }>();
  const roles = await env.DB.prepare(
    `SELECT r.post_id AS post_id, r.needed AS needed, d.date AS date,
            (SELECT COUNT(*) FROM vol_signups s WHERE s.role_id = r.id AND s.ward_id = r.ward_id AND s.status = 'confirmed') AS confirmed,
            (SELECT COUNT(*) FROM vol_signups s WHERE s.role_id = r.id AND s.ward_id = r.ward_id AND s.status = 'waiting') AS waiting
       FROM vol_roles r JOIN vol_dates d ON d.id = r.date_id AND d.ward_id = r.ward_id
      WHERE r.ward_id = ?`,
  )
    .bind(wardId)
    .all<{ post_id: string; needed: number; date: string; confirmed: number; waiting: number }>();
  const dates = await env.DB.prepare(`SELECT post_id, date FROM vol_dates WHERE ward_id = ?`)
    .bind(wardId)
    .all<{ post_id: string; date: string }>();
  const today = wardToday(tz, o.now);
  const soonEnd = addDays(today, 14);
  const out: PostSummary[] = [];
  for (const p of posts.results ?? []) {
    const ds = (dates.results ?? []).filter((d) => d.post_id === p.id).map((d) => d.date).sort();
    const rs = (roles.results ?? []).filter((r) => r.post_id === p.id);
    const over = ds.length > 0 && ds.every((d) => isDateOver(d, tz, o.now));
    if (over !== o.past) continue;
    out.push({
      id: p.id,
      public_id: p.public_id,
      title: p.title,
      org_name: p.org_name,
      space_id: p.space_id,
      category_id: p.category_id,
      audiences: p.audiences,
      created_by_user_id: p.created_by_user_id,
      first_date: ds[0] ?? null,
      last_date: ds[ds.length - 1] ?? null,
      confirmed: rs.reduce((a, r) => a + r.confirmed, 0),
      needed: rs.reduce((a, r) => a + r.needed, 0),
      waiting: rs.reduce((a, r) => a + r.waiting, 0),
      short_soon: rs.some((r) => r.confirmed < r.needed && r.date >= today && r.date <= soonEnd),
    });
  }
  out.sort((a, b) =>
    o.past
      ? (b.last_date ?? '').localeCompare(a.last_date ?? '')
      : (a.first_date ?? '9999').localeCompare(b.first_date ?? '9999') || a.title.localeCompare(b.title),
  );
  return out;
}

export interface PostSignupRow {
  id: string;
  role_id: string;
  volunteer_id: string;
  child_name: string;
  status: string;
  over_limit: number;
  bringing: string | null;
  name: string;
  email: string;
  approval: string;
  email_verified_at: string | null;
}

// Active (waiting or confirmed) sign-ups on a post, for leaders who may view it.
export async function listPostSignups(env: Env, wardId: string, postId: string): Promise<PostSignupRow[]> {
  const res = await env.DB.prepare(
    `SELECT s.id, s.role_id, s.volunteer_id, s.child_name, s.status, s.over_limit, s.bringing,
            v.name, v.email, v.approval, v.email_verified_at
       FROM vol_signups s JOIN volunteers v ON v.id = s.volunteer_id AND v.ward_id = s.ward_id
      WHERE s.ward_id = ? AND s.post_id = ? AND s.status IN ('waiting','confirmed')
      ORDER BY s.status = 'waiting', s.confirmed_at, s.created_at, s.id`,
  )
    .bind(wardId, postId)
    .all<PostSignupRow>();
  return res.results ?? [];
}

// What confirmed volunteers are bringing, per role, with no names (public: spec item 8).
export async function listPublicBringing(env: Env, wardId: string, postId: string): Promise<Array<{ role_id: string; bringing: string }>> {
  const res = await env.DB.prepare(
    `SELECT role_id, bringing FROM vol_signups
      WHERE ward_id = ? AND post_id = ? AND status = 'confirmed' AND bringing IS NOT NULL AND bringing <> ''
      ORDER BY confirmed_at, id`,
  )
    .bind(wardId, postId)
    .all<{ role_id: string; bringing: string }>();
  return res.results ?? [];
}

// Posts in a category this person coordinates (still a ward member) or that they created,
// for "My service opportunities". The route re-checks each with canViewPost.
export async function listUserPostIds(env: Env, wardId: string, userId: string): Promise<string[]> {
  const res = await env.DB.prepare(
    `SELECT p.id FROM vol_posts p
      WHERE p.ward_id = ? AND (
        p.created_by_user_id = ?
        OR p.category_id IN (SELECT d.category_id FROM service_delegates d
                               JOIN ward_memberships wm ON wm.user_id = d.user_id AND wm.ward_id = d.ward_id
                              WHERE d.ward_id = ? AND d.user_id = ?))`,
  )
    .bind(wardId, userId, wardId, userId)
    .all<{ id: string }>();
  return (res.results ?? []).map((r) => r.id);
}
