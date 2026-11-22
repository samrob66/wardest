// The hourly volunteer cron (wrangler.toml [triggers] "0 * * * *"). Per ward, in its time zone:
//  - Reminder: confirmed sign-ups for tomorrow, from 9:00 ward time, once each (with private
//    details, the other volunteers' names, cancel and My sign-ups links; Discord too if connected).
//  - 48h nudge: a date starting within 48 hours with someone verified but still waiting for
//    approval -> the post's approvers, once per date.
//  - Lapse: waiting sign-ups whose date is over (spec item 17: never before).
//  - Cleanup: rate events older than 2 days, verify tokens expired more than 7 days ago.
import type { Env } from '../types';
import { approverEmails, deliver, type OutgoingMessage } from './volMessages';
import * as E from './volEmails';
import { emailPost, getPost, roleStartTime, whenText } from './volPosts';
import { accessUrl, cancelUrl } from './volSignup';
import { addDays, localToUtc, wardHour, wardToday } from './wardTime';

export interface CronCounts {
  reminders: number;
  nudges: number;
  lapsed: number;
}

const HOUR = 3_600_000;

async function remindersFor(env: Env, ward: { id: string; timezone: string }, now: Date): Promise<OutgoingMessage[]> {
  if (wardHour(ward.timezone, now) < 9) return [];
  const tomorrow = addDays(wardToday(ward.timezone, now), 1);
  const rows = await env.DB.prepare(
    `SELECT s.id AS signup_id, s.post_id, s.role_id, s.bringing, v.id AS vid, v.email, v.name, v.approval
       FROM vol_signups s
       JOIN vol_roles r ON r.id = s.role_id AND r.ward_id = s.ward_id
       JOIN vol_dates d ON d.id = r.date_id AND d.ward_id = s.ward_id
       JOIN volunteers v ON v.id = s.volunteer_id AND v.ward_id = s.ward_id
      WHERE s.ward_id = ? AND s.status = 'confirmed' AND s.reminded_at IS NULL AND d.date = ?`,
  )
    .bind(ward.id, tomorrow)
    .all<{ signup_id: string; post_id: string; role_id: string; bringing: string | null; vid: string; email: string; name: string; approval: string }>();
  const out: OutgoingMessage[] = [];
  for (const r of rows.results ?? []) {
    // Claim first so overlapping runs can't send twice.
    const claim = await env.DB.prepare(
      `UPDATE vol_signups SET reminded_at = ? WHERE id = ? AND ward_id = ? AND reminded_at IS NULL`,
    )
      .bind(now.toISOString(), r.signup_id, ward.id)
      .run();
    if (!claim.meta.changes) continue;
    // Private details only ever go to approved volunteers.
    if (r.approval !== 'approved') continue;
    const post = await getPost(env, ward.id, r.post_id);
    const d = post?.dates.find((x) => x.roles.some((y) => y.id === r.role_id));
    const role = d?.roles.find((y) => y.id === r.role_id);
    if (!post || !d || !role) continue;
    const names = await env.DB.prepare(
      `SELECT DISTINCT v.name AS name FROM vol_signups x JOIN volunteers v ON v.id = x.volunteer_id AND v.ward_id = x.ward_id
        WHERE x.ward_id = ? AND x.post_id = ? AND x.status = 'confirmed' AND x.volunteer_id <> ? ORDER BY v.name`,
    )
      .bind(ward.id, post.id, r.vid)
      .all<{ name: string }>();
    out.push(
      E.reminder({
        to: r.email,
        volunteerId: r.vid,
        name: r.name,
        post: emailPost(post, env.APP_URL),
        when: whenText(d, role),
        roleName: role.name,
        bringing: r.bringing,
        privateDetails: post.private_details,
        otherNames: (names.results ?? []).map((n) => n.name),
        cancelUrl: await cancelUrl(env, ward.id, r.signup_id, now),
        mySignupsUrl: await accessUrl(env, ward.id, r.vid, now),
      }),
    );
  }
  return out;
}

async function nudgesFor(env: Env, ward: { id: string; timezone: string }, now: Date): Promise<{ msgs: OutgoingMessage[]; n: number }> {
  const today = wardToday(ward.timezone, now);
  // Dates from today to 3 days out cover "within the next 48 hours" in any zone.
  const dates = await env.DB.prepare(
    `SELECT id, post_id, date, start_time FROM vol_dates
      WHERE ward_id = ? AND approval_nudged_at IS NULL AND date >= ? AND date <= ?`,
  )
    .bind(ward.id, today, addDays(today, 3))
    .all<{ id: string; post_id: string; date: string; start_time: string | null }>();
  const msgs: OutgoingMessage[] = [];
  let n = 0;
  for (const d of dates.results ?? []) {
    const roles = await env.DB.prepare(`SELECT start_time FROM vol_roles WHERE date_id = ? AND ward_id = ?`)
      .bind(d.id, ward.id)
      .all<{ start_time: string | null }>();
    const starts = (roles.results ?? []).map((r) => localToUtc(d.date, roleStartTime(d, r), ward.timezone).getTime());
    if (!starts.length) continue;
    const earliest = Math.min(...starts);
    if (earliest <= now.getTime() || earliest - now.getTime() > 48 * HOUR) continue;
    const waiting = await env.DB.prepare(
      `SELECT DISTINCT v.name AS name FROM vol_signups s
         JOIN vol_roles r ON r.id = s.role_id AND r.ward_id = s.ward_id
         JOIN volunteers v ON v.id = s.volunteer_id AND v.ward_id = s.ward_id
        WHERE s.ward_id = ? AND r.date_id = ? AND s.status = 'waiting' AND v.approval = 'pending'
        ORDER BY v.name`,
    )
      .bind(ward.id, d.id)
      .all<{ name: string }>();
    const names = (waiting.results ?? []).map((w) => w.name);
    if (!names.length) continue;
    const claim = await env.DB.prepare(
      `UPDATE vol_dates SET approval_nudged_at = ? WHERE id = ? AND ward_id = ? AND approval_nudged_at IS NULL`,
    )
      .bind(now.toISOString(), d.id, ward.id)
      .run();
    if (!claim.meta.changes) continue;
    const post = await getPost(env, ward.id, d.post_id);
    if (!post) continue;
    n++;
    const ep = emailPost(post, env.APP_URL);
    for (const to of await approverEmails(env, ward.id, post.id)) {
      msgs.push(
        E.approverNudge48h({
          to, post: ep, when: whenText(d, { start_time: null, end_time: null }), waitingNames: names,
          manageUrl: `${env.APP_URL}/w/${ward.id}/vol/${post.id}`,
        }),
      );
    }
  }
  return { msgs, n };
}

async function lapseFor(env: Env, ward: { id: string; timezone: string }, now: Date): Promise<number> {
  // A date is over at 00:00 ward-local the next day, i.e. every date before ward-today.
  const today = wardToday(ward.timezone, now);
  const res = await env.DB.prepare(
    `UPDATE vol_signups SET status = 'lapsed', ended_at = ?
      WHERE ward_id = ? AND status = 'waiting'
        AND role_id IN (SELECT r.id FROM vol_roles r JOIN vol_dates d ON d.id = r.date_id AND d.ward_id = r.ward_id
                         WHERE r.ward_id = ? AND d.date < ?)`,
  )
    .bind(now.toISOString(), ward.id, ward.id, today)
    .run();
  return res.meta.changes ?? 0;
}

// `o.wardIds` limits the run to some wards (tests); the scheduled handler runs every ward.
export async function runVolunteerCron(env: Env, now: Date, o: { wardIds?: string[] } = {}): Promise<CronCounts> {
  const counts: CronCounts = { reminders: 0, nudges: 0, lapsed: 0 };
  const wards = await env.DB.prepare(
    `SELECT DISTINCT w.id AS id, w.timezone AS timezone FROM wards w JOIN vol_posts p ON p.ward_id = w.id WHERE w.status = 'active'`,
  ).all<{ id: string; timezone: string }>();
  const messages: OutgoingMessage[] = [];
  for (const ward of wards.results ?? []) {
    if (o.wardIds && !o.wardIds.includes(ward.id)) continue;
    try {
      const rem = await remindersFor(env, ward, now);
      counts.reminders += rem.length;
      messages.push(...rem);
      const nud = await nudgesFor(env, ward, now);
      counts.nudges += nud.n;
      messages.push(...nud.msgs);
      counts.lapsed += await lapseFor(env, ward, now);
    } catch (e) {
      // One ward's trouble mustn't stop the others.
      console.error(`[volCron] ward ${ward.id}: ${(e as Error).message}`);
    }
  }
  await env.DB.prepare(`DELETE FROM vol_rate_events WHERE created_at < ?`).bind(new Date(now.getTime() - 48 * HOUR).toISOString()).run();
  await env.DB.prepare(`DELETE FROM vol_tokens WHERE expires_at < ?`).bind(new Date(now.getTime() - 7 * 24 * HOUR).toISOString()).run();
  await deliver(env, messages);
  console.log(`[volCron] ${now.toISOString()} reminders=${counts.reminders} nudges=${counts.nudges} lapsed=${counts.lapsed}`);
  return counts;
}
