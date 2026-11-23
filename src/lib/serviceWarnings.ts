// Fill warnings (spec §4), run by the hourly cron: one email per post date and recipient when
// some role on the date is still short at that recipient's lead time.
//  - A date starts at its start_time, else the earliest role start_time, else 00:00, in the
//    ward's time zone.
//  - Recipients for a post's category, with their lead hours: each manager whose pref has
//    "warn me" on, at that pref's hours; each pref's "others", at that pref's hours; the
//    category's delegates, at the LARGEST hours among the category's prefs (48 with none).
//    Someone reached several ways uses the largest hours. Only current ward members.
//  - Sent when start - hours <= now < start. Claimed with INSERT OR IGNORE into vol_warn_sent
//    (UNIQUE date_id, user_id) so it never goes twice, even with overlapping runs.
import type { Env } from '../types';
import { newId } from './ids';
import type { OutgoingMessage } from './volMessages';
import { fillWarning } from './volEmails';
import { emailPost, getPost, whenText } from './volPosts';
import { addDays, localToUtc, wardToday } from './wardTime';

const HOUR = 3_600_000;
const DEFAULT_HOURS = 48;

// userId -> lead hours, for one category (current ward members only).
async function recipientsFor(env: Env, wardId: string, categoryId: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const put = (uid: string, h: number) => out.set(uid, Math.max(out.get(uid) ?? 0, h));
  const prefs = await env.DB.prepare(`SELECT id, user_id, warn_me, hours FROM service_warn_prefs WHERE category_id = ? AND ward_id = ?`)
    .bind(categoryId, wardId)
    .all<{ id: string; user_id: string; warn_me: number; hours: number }>();
  let largest = 0;
  for (const p of prefs.results ?? []) {
    largest = Math.max(largest, p.hours);
    if (p.warn_me) put(p.user_id, p.hours);
    const others = await env.DB.prepare(`SELECT user_id FROM service_warn_others WHERE pref_id = ? AND ward_id = ?`)
      .bind(p.id, wardId)
      .all<{ user_id: string }>();
    for (const o of others.results ?? []) put(o.user_id, p.hours);
  }
  const delegates = await env.DB.prepare(`SELECT user_id FROM service_delegates WHERE category_id = ? AND ward_id = ?`)
    .bind(categoryId, wardId)
    .all<{ user_id: string }>();
  for (const d of delegates.results ?? []) put(d.user_id, largest || DEFAULT_HOURS);
  if (!out.size) return out;
  const ids = [...out.keys()];
  const members = await env.DB.prepare(
    `SELECT user_id FROM ward_memberships WHERE ward_id = ? AND user_id IN (${ids.map(() => '?').join(',')})`,
  )
    .bind(wardId, ...ids)
    .all<{ user_id: string }>();
  const keep = new Set((members.results ?? []).map((m) => m.user_id));
  for (const id of ids) if (!keep.has(id)) out.delete(id);
  return out;
}

export async function warningsFor(env: Env, ward: { id: string; timezone: string }, now: Date): Promise<OutgoingMessage[]> {
  const today = wardToday(ward.timezone, now);
  // Lead times are at most 336 hours (14 days); from yesterday covers any zone's "started".
  const dates = await env.DB.prepare(
    `SELECT d.id, d.post_id, d.date, d.start_time, p.category_id
       FROM vol_dates d JOIN vol_posts p ON p.id = d.post_id AND p.ward_id = d.ward_id
      WHERE d.ward_id = ? AND p.category_id IS NOT NULL AND d.date >= ? AND d.date <= ?`,
  )
    .bind(ward.id, addDays(today, -1), addDays(today, 15))
    .all<{ id: string; post_id: string; date: string; start_time: string | null; category_id: string }>();
  const recipientCache = new Map<string, Map<string, number>>();
  const out: OutgoingMessage[] = [];
  for (const d of dates.results ?? []) {
    const post = await getPost(env, ward.id, d.post_id);
    const date = post?.dates.find((x) => x.id === d.id);
    if (!post || !date) continue;
    const roleStarts = date.roles.map((r) => r.start_time).filter((t): t is string => !!t).sort();
    const shownTime = date.start_time ?? roleStarts[0] ?? null;
    const start = localToUtc(date.date, shownTime ?? '00:00', ward.timezone).getTime();
    if (now.getTime() >= start) continue;
    const short = date.roles.filter((r) => r.confirmed < r.needed);
    if (!short.length) continue;
    if (!recipientCache.has(d.category_id)) recipientCache.set(d.category_id, await recipientsFor(env, ward.id, d.category_id));
    const recipients = recipientCache.get(d.category_id)!;
    for (const [userId, hours] of recipients) {
      if (start - hours * HOUR > now.getTime()) continue;
      const claim = await env.DB.prepare(
        `INSERT OR IGNORE INTO vol_warn_sent (id, ward_id, date_id, user_id, sent_at) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(newId('vws'), ward.id, d.id, userId, now.toISOString())
        .run();
      if (!claim.meta.changes) continue;
      const u = await env.DB.prepare(`SELECT LOWER(email) AS email FROM users WHERE id = ?`).bind(userId).first<{ email: string }>();
      if (!u) continue;
      out.push(
        fillWarning({
          to: u.email,
          post: emailPost(post, env.APP_URL),
          when: whenText({ date: date.date, start_time: shownTime }, { start_time: null, end_time: null }),
          shortRoles: short.map((r) => ({ name: r.name, confirmed: r.confirmed, needed: r.needed })),
          manageUrl: `${env.APP_URL}/w/${ward.id}/vol/${post.id}`,
        }),
      );
    }
  }
  return out;
}
