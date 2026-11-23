// Outgoing volunteer messages. Domain functions never send anything: they return
// OutgoingMessage[] and the route (or the cron) hands them to deliver(), the only place that
// talks to Resend (and, best-effort, Discord). Email always goes; Discord is extra.
import type { Env } from '../types';
import { listEditorUserIds } from './volEditors';
import { sendDiscordDm } from './discord';

export interface OutgoingMessage {
  kind: string; // e.g. 'vol_verify', 'vol_confirmed', 'approver_waiting'
  to: string; // lowercased email
  subject: string;
  html: string;
  discordText?: string; // set only for volunteer confirmations/reminders (spec §6.9)
  volunteerId?: string; // lets deliver() find a connected Discord account
  wardId?: string; // the volunteer's ward (every lookup is ward-scoped)
  ref?: string; // what it's about (e.g. the sign-up id), for failure logs
}

export type Outcome<T> = { result: T; messages: OutgoingMessage[] };

const FROM = 'Wardest <no-reply@send.wardest.com>';

function dedupe(msgs: OutgoingMessage[]): OutgoingMessage[] {
  const seen = new Set<string>();
  const out: OutgoingMessage[] = [];
  for (const m of msgs) {
    // Only truly identical messages collapse: two reminders for two roles on one post share a
    // subject but not a body, and both must go.
    const key = `${m.to.toLowerCase()}\u0000${m.kind}\u0000${m.subject}\u0000${m.html}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

function devLog(m: OutgoingMessage): void {
  const hrefs = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => (x[1] ?? '').replace(/&amp;/g, '&'));
  const text = m.html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim();
  console.log(
    `[dev email] kind=${m.kind}\n  to: ${m.to}\n  subject: ${m.subject}\n` +
      hrefs.map((h) => `  link: ${h}`).join('\n') +
      `\n  ---\n  ${text.split('\n').join('\n  ')}\n  ---`,
  );
}

// One log tag for a failed message: ward, what it's about, and kind (round 3: a lost
// confirmation must be traceable to its sign-up).
function tag(m: OutgoingMessage): string {
  return `ward=${m.wardId ?? '-'} ref=${m.ref ?? '-'} kind=${m.kind}`;
}

async function sendEmail(env: Env, m: OutgoingMessage): Promise<void> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [m.to], subject: m.subject, html: m.html }),
    });
    if (!res.ok) console.error(`[deliver] Resend ${res.status} ${tag(m)}`);
  } catch (e) {
    console.error(`[deliver] Resend error ${tag(m)}: ${(e as Error).message}`);
  }
}

// Best-effort Discord DM for a confirmation/reminder: only to a volunteer who is approved and
// has connected Discord (spec §6.9). Email has already gone; failures are logged, never thrown.
async function sendDiscord(env: Env, m: OutgoingMessage): Promise<void> {
  if (!m.volunteerId || !m.wardId) return;
  const v = await env.DB.prepare(`SELECT approval, discord_user_id FROM volunteers WHERE id = ? AND ward_id = ?`)
    .bind(m.volunteerId, m.wardId)
    .first<{ approval: string; discord_user_id: string | null }>();
  if (!v || v.approval !== 'approved' || !v.discord_user_id) return;
  const r = await sendDiscordDm(env, v.discord_user_id, m.discordText ?? '');
  if (r !== 'sent') console.log(`[deliver] Discord DM ${r} for kind=${m.kind}; email was sent`);
}

// Sends every message; never throws. With RESEND_API_KEY empty or 'dev', prints each message
// (recipient, subject, every link, and the text) to the console so a local tester can click
// the links.
export async function deliver(env: Env, msgs: OutgoingMessage[]): Promise<void> {
  const key = (env.RESEND_API_KEY ?? '').trim();
  for (const m of dedupe(msgs)) {
    try {
      if (!key || key === 'dev') devLog(m);
      else await sendEmail(env, m);
      if (m.discordText && m.volunteerId && m.wardId) await sendDiscord(env, m);
    } catch (e) {
      console.error(`[deliver] ${tag(m)}: ${(e as Error).message}`);
    }
  }
}

// Post creator + that organization's volunteer editors, lowercased and deduplicated
// (spec §6.6: one email per person).
export async function approverEmails(env: Env, wardId: string, postId: string): Promise<string[]> {
  const post = await env.DB.prepare(
    `SELECT p.created_by_user_id AS creator, p.space_id AS space_id
       FROM vol_posts p WHERE p.id = ? AND p.ward_id = ?`,
  )
    .bind(postId, wardId)
    .first<{ creator: string | null; space_id: string }>();
  if (!post) return [];
  const ids = new Set(await listEditorUserIds(env, wardId, post.space_id));
  if (post.creator) ids.add(post.creator);
  if (!ids.size) return [];
  // Only people who are still members of this ward get organizer email.
  const list = [...ids];
  const rows = await env.DB.prepare(
    `SELECT LOWER(u.email) AS email FROM users u
       JOIN ward_memberships wm ON wm.user_id = u.id AND wm.ward_id = ?
      WHERE u.id IN (${list.map(() => '?').join(',')})`,
  )
    .bind(wardId, ...list)
    .all<{ email: string }>();
  return [...new Set((rows.results ?? []).map((r) => r.email))];
}
