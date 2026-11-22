// Shared fixtures for the sign-up engine tests: a ward with an EQ president, a post on a date
// after NOW, and helpers to read state and pull tokens out of emails.
import { env, makeWard, makeLeader, uniqueEmail } from './helpers';
import { addDate, addRole, createPost, getPost } from '../src/lib/volPosts';
import type { OutgoingMessage } from '../src/lib/volMessages';
import { addEditor } from '../src/lib/volEditors';
import { addDays, wardToday } from '../src/lib/wardTime';

export const NOW = new Date('2026-11-21T18:00:00Z'); // Saturday 11:00 in Denver

// A Denver date `days` after today on the real clock, for route tests whose handlers use the
// real clock (a fixed calendar date would make them fail once it passes).
export function futureDate(days = 30): string {
  return addDays(wardToday('America/Denver', new Date()), days);
}

export interface Fx {
  wardId: string;
  prefix: string;
  spaces: Record<string, string>;
  eqPres: string;
  eqPresEmail: string;
  counselor: string;
  counselorEmail: string;
  postId: string;
  dateId: string;
  roleId: string; // needs 1
  bigRoleId: string; // needs 5
  publicId: string;
}

export async function fixture(o: { date?: string; time?: string; cutoff?: number; timezone?: string } = {}): Promise<Fx> {
  const w = await makeWard(env, { timezone: o.timezone });
  const eqPresEmail = uniqueEmail('eqpres');
  const eqPres = await makeLeader(env, w.wardId, { email: eqPresEmail, name: 'EQ Pres', spaces: [['elders-quorum', 'owner']] });
  const counselorEmail = uniqueEmail('counselor');
  const counselor = await makeLeader(env, w.wardId, { email: counselorEmail, name: 'Counselor', spaces: [['elders-quorum', 'member']] });
  await addEditor(env, w.wardId, w.spaces['elders-quorum']!, counselor, eqPres);
  const postId = await createPost(env, w.wardId, w.spaces['elders-quorum']!, eqPres, {
    title: 'Help the Jensens move in', public_note: 'Wear shoes', private_details: 'Door code 4242', cancel_cutoff_hours: o.cutoff ?? 24,
  });
  const dateId = await addDate(env, w.wardId, postId, o.date ?? '2026-12-06', o.time ?? '09:00');
  const roleId = await addRole(env, w.wardId, dateId, { name: 'Truck driver', needed: 1, start_time: null, end_time: null, note: null, bring_prompt: null });
  const bigRoleId = await addRole(env, w.wardId, dateId, { name: 'Movers', needed: 5, start_time: null, end_time: null, note: null, bring_prompt: 'Bringing a dolly?' });
  const p = (await getPost(env, w.wardId, postId))!;
  return {
    wardId: w.wardId, prefix: w.prefix, spaces: w.spaces, eqPres, eqPresEmail: eqPresEmail.toLowerCase(), counselor,
    counselorEmail: counselorEmail.toLowerCase(), postId, dateId, roleId, bigRoleId, publicId: p.public_id,
  };
}

export async function counts(fx: Fx, roleId: string): Promise<{ confirmed: number; waiting: number }> {
  const p = (await getPost(env, fx.wardId, fx.postId))!;
  const r = p.dates.flatMap((d) => d.roles).find((x) => x.id === roleId)!;
  return { confirmed: r.confirmed, waiting: r.waiting };
}

export function linkFrom(m: OutgoingMessage | undefined, path: string): string {
  if (!m) throw new Error('no message');
  const re = new RegExp(`href="(https?://[^"]*${path.replace(/\//g, '\\/')}[^"]*)"`);
  const hit = m.html.match(re);
  if (!hit) throw new Error(`no ${path} link in ${m.kind}`);
  return hit[1]!.replace(/&amp;/g, '&');
}

export function tokenFrom(m: OutgoingMessage | undefined, path: string): string {
  const url = linkFrom(m, path);
  return decodeURIComponent(url.slice(url.indexOf(path) + path.length).split(/[?#"]/)[0]!);
}

export async function volunteerRow(wardId: string, email: string) {
  return env.DB.prepare(`SELECT * FROM volunteers WHERE ward_id = ? AND email = ?`)
    .bind(wardId, email.toLowerCase())
    .first<{ id: string; approval: string; email_verified_at: string | null; name: string; discord_user_id: string | null }>();
}

export async function signupRows(wardId: string, roleId: string) {
  return (
    await env.DB.prepare(
      `SELECT s.*, v.email AS email FROM vol_signups s JOIN volunteers v ON v.id = s.volunteer_id
        WHERE s.ward_id = ? AND s.role_id = ? ORDER BY s.created_at, s.id`,
    )
      .bind(wardId, roleId)
      .all<{ id: string; status: string; over_limit: number; email: string; confirmed_at: string | null; confirm_seq: number | null; volunteer_id: string; bringing: string | null }>()
  ).results;
}
