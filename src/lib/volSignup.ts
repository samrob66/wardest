// The sign-up engine (spec §6.3–§6.5, items 17–19). Functions return Outcome<T>: a result plus
// the messages to deliver; they never send anything themselves. Every query filters ward_id.
//
// Key rules:
//  - Waiting sign-ups (address unconfirmed, or not yet approved) never count or hold a spot.
//  - A role that is full turns new sign-ups away (role_full). Over-filling only happens through
//    a race for the last spot or a late approval; whoever counts after the role was full gets
//    over_limit = 1 and is offered a one-click withdraw. Order of confirmation per role is
//    confirm_seq, assigned atomically in the same statement that confirms the sign-up.
//  - Private details reach a volunteer only by email (or Discord DM) and only once they are
//    verified + approved; never on the screen after the public form.
import type { Env } from '../types';
import { newId, randomToken } from './ids';
import { approverEmails, type Outcome, type OutgoingMessage } from './volMessages';
import * as E from './volEmails';
import {
  emailPost, getPost, isDateOver, isPostOver, listWardPosts, postIsFull, resetFullIfShort, roleStartTime, whenText,
  VolInputError, type PostFull, type DateFull, type RoleFull,
} from './volPosts';
import { hitLimit } from './volRate';
import { makeLinkToken, sha256Hex } from './volSession';
import { localToUtc } from './wardTime';

export type SubmitResult =
  | 'confirmed'
  | 'confirmed_over'
  | 'waiting_verify'
  | 'waiting_approval'
  | 'declined_email'
  | 'role_full'
  | 'already_signed'
  | 'closed'
  | 'rate_limited';

export interface VolunteerRow {
  id: string;
  ward_id: string;
  email: string;
  name: string;
  approval: 'none' | 'pending' | 'approved' | 'declined';
  email_verified_at: string | null;
  decided_by_user_id: string | null;
  decided_at: string | null;
  discord_user_id: string | null;
  created_at: string;
}

export interface SignupRow {
  id: string;
  ward_id: string;
  post_id: string;
  role_id: string;
  volunteer_id: string;
  bringing: string | null;
  status: string;
  over_limit: number;
  confirmed_at: string | null;
  confirm_seq: number | null;
  ended_at: string | null;
  reminded_at: string | null;
  created_at: string;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;
const VERIFY_HOURS = 72;

export function normalizeEmail(raw: string): string | null {
  const e = (raw ?? '').trim().toLowerCase();
  if (e.length > 200 || !EMAIL_RE.test(e)) return null;
  return e;
}

// ---------------------------------------------------------------- lookups

export async function getVolunteer(env: Env, wardId: string, id: string): Promise<VolunteerRow | null> {
  return env.DB.prepare(`SELECT * FROM volunteers WHERE id = ? AND ward_id = ?`).bind(id, wardId).first<VolunteerRow>();
}

export async function getVolunteerByEmail(env: Env, wardId: string, email: string): Promise<VolunteerRow | null> {
  return env.DB.prepare(`SELECT * FROM volunteers WHERE ward_id = ? AND email = ?`).bind(wardId, email).first<VolunteerRow>();
}

export async function getSignup(env: Env, wardId: string, id: string): Promise<SignupRow | null> {
  return env.DB.prepare(`SELECT * FROM vol_signups WHERE id = ? AND ward_id = ?`).bind(id, wardId).first<SignupRow>();
}

async function isWardMemberEmail(env: Env, wardId: string, email: string): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT 1 AS ok FROM users u JOIN ward_memberships wm ON wm.user_id = u.id
      WHERE LOWER(u.email) = ? AND wm.ward_id = ? LIMIT 1`,
  )
    .bind(email, wardId)
    .first();
  return r != null;
}

function findRole(post: PostFull, roleId: string): { date: DateFull; role: RoleFull } | null {
  for (const d of post.dates) {
    const r = d.roles.find((x) => x.id === roleId);
    if (r) return { date: d, role: r };
  }
  return null;
}

// ---------------------------------------------------------------- links

function manageUrl(env: Env, wardId: string, postId: string): string {
  return `${env.APP_URL}/w/${wardId}/vol/${postId}`;
}

export async function accessUrl(env: Env, wardId: string, volunteerId: string, now: Date): Promise<string> {
  return `${env.APP_URL}/vol/access/${await makeLinkToken(env, { typ: 'vacc', wardId, id: volunteerId }, now)}`;
}

export async function cancelUrl(env: Env, wardId: string, signupId: string, now: Date): Promise<string> {
  return `${env.APP_URL}/vol/cancel/${await makeLinkToken(env, { typ: 'vcan', wardId, id: signupId }, now)}`;
}

export async function withdrawUrl(env: Env, wardId: string, signupId: string, now: Date): Promise<string> {
  return `${env.APP_URL}/vol/withdraw/${await makeLinkToken(env, { typ: 'vwd', wardId, id: signupId }, now)}`;
}

// The ward's other open posts that still need help, with counts only (spec §6.4, item 23).
export async function otherOpenPosts(env: Env, wardId: string, excludePostIds: string[], now: Date): Promise<E.OtherPost[]> {
  const open = await listWardPosts(env, wardId, { past: false, now });
  return open
    .filter((p) => !excludePostIds.includes(p.id) && p.needed > 0 && p.confirmed < p.needed)
    .slice(0, 5)
    .map((p) => ({
      orgName: p.org_name, title: p.title, confirmed: p.confirmed, needed: p.needed,
      publicUrl: `${env.APP_URL}/v/${p.public_id}`,
    }));
}

// ---------------------------------------------------------------- confirmation core

// Marks a sign-up confirmed (from 'waiting', or a fresh insert already 'confirmed') with the
// next confirm_seq for its role, in one statement, then decides whether it's over the limit:
// it is when more than `needed` sign-ups on the role were confirmed before it (by confirm_seq).
async function stampConfirmed(env: Env, wardId: string, signupId: string, roleId: string, needed: number, at: Date): Promise<boolean> {
  await env.DB.prepare(
    `UPDATE vol_signups
        SET status = 'confirmed',
            confirmed_at = ?,
            confirm_seq = (SELECT COALESCE(MAX(confirm_seq), 0) + 1 FROM vol_signups WHERE role_id = ? AND ward_id = ?)
      WHERE id = ? AND ward_id = ? AND confirm_seq IS NULL`,
  )
    .bind(at.toISOString(), roleId, wardId, signupId, wardId)
    .run();
  const rank = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM vol_signups
      WHERE role_id = ? AND ward_id = ? AND status = 'confirmed'
        AND confirm_seq <= (SELECT confirm_seq FROM vol_signups WHERE id = ? AND ward_id = ?)`,
  )
    .bind(roleId, wardId, signupId, wardId)
    .first<{ n: number }>();
  const over = (rank?.n ?? 0) > needed;
  if (over) {
    await env.DB.prepare(`UPDATE vol_signups SET over_limit = 1 WHERE id = ? AND ward_id = ?`).bind(signupId, wardId).run();
  }
  return over;
}

// "Fully filled" email to the post's approvers, at most once per time it fills (rule 14 resets).
async function filledMessages(env: Env, wardId: string, postId: string, now: Date): Promise<OutgoingMessage[]> {
  const post = await getPost(env, wardId, postId);
  if (!post || !postIsFull(post)) return [];
  const claim = await env.DB.prepare(
    `UPDATE vol_posts SET full_notified_at = ? WHERE id = ? AND ward_id = ? AND full_notified_at IS NULL`,
  )
    .bind(now.toISOString(), postId, wardId)
    .run();
  if (!claim.meta.changes) return [];
  const ep = emailPost(post, env.APP_URL);
  return (await approverEmails(env, wardId, postId)).map((to) =>
    E.approverFilled({ to, post: ep, manageUrl: manageUrl(env, wardId, postId) }),
  );
}

async function confirmationMessage(
  env: Env,
  v: VolunteerRow,
  post: PostFull,
  date: DateFull,
  role: RoleFull,
  signupId: string,
  bringing: string | null,
  over: boolean,
  now: Date,
): Promise<OutgoingMessage> {
  return E.signupConfirmed({
    to: v.email,
    volunteerId: v.id,
    name: v.name,
    post: emailPost(post, env.APP_URL),
    when: whenText(date, role),
    roleName: role.name,
    bringing,
    privateDetails: post.private_details,
    cancelUrl: await cancelUrl(env, post.ward_id, signupId, now),
    mySignupsUrl: await accessUrl(env, post.ward_id, v.id, now),
    overLimit: over,
    withdrawUrl: over ? await withdrawUrl(env, post.ward_id, signupId, now) : null,
    otherPosts: await otherOpenPosts(env, post.ward_id, [post.id], now),
  });
}

async function approverWaitingFor(env: Env, v: VolunteerRow, postIds: string[]): Promise<OutgoingMessage[]> {
  const byApprover = new Map<string, Array<E.EmailPost & { manageUrl: string }>>();
  for (const pid of [...new Set(postIds)]) {
    const post = await getPost(env, v.ward_id, pid);
    if (!post) continue;
    const item = { ...emailPost(post, env.APP_URL), manageUrl: manageUrl(env, v.ward_id, pid) };
    for (const to of await approverEmails(env, v.ward_id, pid)) {
      const list = byApprover.get(to) ?? [];
      list.push(item);
      byApprover.set(to, list);
    }
  }
  return [...byApprover].map(([to, posts]) =>
    E.approverWaiting({ to, volunteerName: v.name, volunteerEmail: v.email, posts }),
  );
}

// ---------------------------------------------------------------- submit

export async function submitSignup(
  env: Env,
  o: { wardId: string; postId: string; roleId: string; name: string; email: string; bringing: string | null; now: Date },
): Promise<Outcome<SubmitResult>> {
  const none = (result: SubmitResult): Outcome<SubmitResult> => ({ result, messages: [] });
  const { wardId, now } = o;

  // 1. The role must belong to this post in this ward, and its date must not be over.
  const post = await getPost(env, wardId, o.postId);
  if (!post) return none('closed');
  const found = findRole(post, o.roleId);
  if (!found || isDateOver(found.date.date, post.ward.timezone, now)) return none('closed');
  const { date, role } = found;

  // 2. Inputs.
  const email = normalizeEmail(o.email);
  if (!email) throw new VolInputError('Please enter a valid email address.');
  const name = (o.name ?? '').trim();
  if (name.length < 1 || name.length > 80) throw new VolInputError('Please enter your name (80 characters at most).');
  const bringingRaw = (o.bringing ?? '').trim().slice(0, 200);
  const bringing = role.bring_prompt && bringingRaw ? bringingRaw : null;

  // 3. The volunteer (never overwriting an existing name). Ward members are approved.
  let v = await getVolunteerByEmail(env, wardId, email);
  const member = await isWardMemberEmail(env, wardId, email);
  if (!v || (v.approval === 'none' && !member)) {
    // New (or still unverified) addresses are what can be abused: cap them per post.
    if (await hitLimit(env, wardId, 'newsignup:' + o.postId, 60, 60, now)) return none('rate_limited');
  }
  if (!v) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO volunteers (id, ward_id, email, name, approval, created_at) VALUES (?, ?, ?, ?, 'none', ?)`,
    )
      .bind(newId('vv'), wardId, email, name, now.toISOString())
      .run();
    v = await getVolunteerByEmail(env, wardId, email);
    if (!v) return none('closed');
  }
  if (member && v.approval !== 'approved') {
    await env.DB.prepare(
      `UPDATE volunteers SET approval = 'approved', email_verified_at = COALESCE(email_verified_at, ?), decided_at = ?
        WHERE id = ? AND ward_id = ?`,
    )
      .bind(now.toISOString(), now.toISOString(), v.id, wardId)
      .run();
    v = (await getVolunteer(env, wardId, v.id))!;
  }

  // 4. Declined addresses can't sign up again (no email either).
  if (v.approval === 'declined') return none('declined_email');

  // 5. Already on this role.
  const active = await env.DB.prepare(
    `SELECT 1 AS ok FROM vol_signups WHERE ward_id = ? AND role_id = ? AND volunteer_id = ? AND status IN ('waiting','confirmed')`,
  )
    .bind(wardId, role.id, v.id)
    .first();
  if (active) return none('already_signed');

  // 6. Full roles turn everyone away (the button was closed; this is a stale page).
  if (role.confirmed >= role.needed) return none('role_full');

  const signupId = newId('vs');
  // Every sign-up starts as 'waiting'; stampConfirmed promotes an approved one atomically.
  const insert = async (): Promise<boolean> => {
    try {
      await env.DB.prepare(
        `INSERT INTO vol_signups (id, ward_id, post_id, role_id, volunteer_id, bringing, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(signupId, wardId, post.id, role.id, v!.id, bringing, 'waiting', now.toISOString())
        .run();
      return true;
    } catch (e) {
      // The partial unique index: a double click raced us to it.
      if (/UNIQUE/i.test((e as Error).message)) return false;
      throw e;
    }
  };

  // 7. Approved: counts at once.
  if (v.approval === 'approved') {
    if (!(await insert())) return none('already_signed');
    const over = await stampConfirmed(env, wardId, signupId, role.id, role.needed, now);
    const messages = [await confirmationMessage(env, v, post, date, role, signupId, bringing, over, now)];
    messages.push(...(await filledMessages(env, wardId, post.id, now)));
    return { result: over ? 'confirmed_over' : 'confirmed', messages };
  }

  // 8. Address not verified yet: waiting + a confirm-your-address email (capped per address).
  if (v.approval === 'none') {
    if (!(await insert())) return none('already_signed');
    const messages: OutgoingMessage[] = [];
    if (!(await hitLimit(env, wardId, 'verify:' + email, 3, 1440, now))) {
      const token = randomToken(24);
      await env.DB.prepare(
        `INSERT INTO vol_tokens (id, ward_id, volunteer_id, purpose, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, 'verify', ?, ?, ?)`,
      )
        .bind(
          newId('vt'), wardId, v.id, await sha256Hex(token),
          new Date(now.getTime() + VERIFY_HOURS * 3_600_000).toISOString(), now.toISOString(),
        )
        .run();
      messages.push(
        E.verifyEmail({ to: v.email, name: v.name, post: emailPost(post, env.APP_URL), verifyUrl: `${env.APP_URL}/vol/verify/${token}` }),
      );
    }
    return { result: 'waiting_verify', messages };
  }

  // 9. Verified, waiting for a leader: tell this post's approvers.
  if (!(await insert())) return none('already_signed');
  return { result: 'waiting_approval', messages: await approverWaitingFor(env, v, [post.id]) };
}

// ---------------------------------------------------------------- verify

export async function verifyAddress(env: Env, token: string, now: Date): Promise<Outcome<'verified' | 'invalid'>> {
  const invalid = { result: 'invalid' as const, messages: [] };
  if (!token || token.length > 200) return invalid;
  const row = await env.DB.prepare(
    `SELECT id, ward_id, volunteer_id FROM vol_tokens
      WHERE token_hash = ? AND purpose = 'verify' AND used_at IS NULL AND expires_at > ?`,
  )
    .bind(await sha256Hex(token), now.toISOString())
    .first<{ id: string; ward_id: string; volunteer_id: string }>();
  if (!row) return invalid;
  const claim = await env.DB.prepare(`UPDATE vol_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL`)
    .bind(now.toISOString(), row.id)
    .run();
  if (!claim.meta.changes) return invalid;
  const wardId = row.ward_id;
  let v = await getVolunteer(env, wardId, row.volunteer_id);
  if (!v) return invalid;
  await env.DB.prepare(`UPDATE volunteers SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ? AND ward_id = ?`)
    .bind(now.toISOString(), v.id, wardId)
    .run();
  if (v.approval === 'none') {
    if (await isWardMemberEmail(env, wardId, v.email)) {
      // Became a leader in the meantime: approved, and their waiting sign-ups count now.
      await env.DB.prepare(`UPDATE volunteers SET approval = 'pending' WHERE id = ? AND ward_id = ?`).bind(v.id, wardId).run();
      const a = await approveVolunteer(env, wardId, v.id, null, now);
      return { result: 'verified', messages: a.messages };
    }
    await env.DB.prepare(`UPDATE volunteers SET approval = 'pending' WHERE id = ? AND ward_id = ? AND approval = 'none'`)
      .bind(v.id, wardId)
      .run();
  }
  v = (await getVolunteer(env, wardId, v.id))!;
  if (v.approval !== 'pending') return { result: 'verified', messages: [] };
  const waiting = await upcomingSignups(env, wardId, v.id, 'waiting', now);
  return { result: 'verified', messages: await approverWaitingFor(env, v, waiting.map((s) => s.signup.post_id)) };
}

interface SignupWithPost {
  signup: SignupRow;
  post: PostFull;
  date: DateFull;
  role: RoleFull;
}

// A volunteer's sign-ups of one status whose date isn't over, oldest first.
async function upcomingSignups(env: Env, wardId: string, volunteerId: string, status: string, now: Date): Promise<SignupWithPost[]> {
  const rows = await env.DB.prepare(
    `SELECT * FROM vol_signups WHERE ward_id = ? AND volunteer_id = ? AND status = ? ORDER BY created_at, id`,
  )
    .bind(wardId, volunteerId, status)
    .all<SignupRow>();
  const out: SignupWithPost[] = [];
  const cache = new Map<string, PostFull | null>();
  for (const s of rows.results ?? []) {
    if (!cache.has(s.post_id)) cache.set(s.post_id, await getPost(env, wardId, s.post_id));
    const post = cache.get(s.post_id);
    if (!post) continue;
    const f = findRole(post, s.role_id);
    if (!f || isDateOver(f.date.date, post.ward.timezone, now)) continue;
    out.push({ signup: s, post, date: f.date, role: f.role });
  }
  return out;
}

// ---------------------------------------------------------------- approve / decline

// Approve a verified volunteer for the whole ward: their waiting sign-ups (dates not over)
// count now, in the order they signed up; any that land after a role filled are over the limit.
// byUserId is null when the system approves (a ward member's address was just verified).
export async function approveVolunteer(
  env: Env,
  wardId: string,
  volunteerId: string,
  byUserId: string | null,
  now: Date,
): Promise<Outcome<void>> {
  const v = await getVolunteer(env, wardId, volunteerId);
  if (!v || v.approval !== 'pending' || !v.email_verified_at) return { result: undefined, messages: [] };
  const claim = await env.DB.prepare(
    `UPDATE volunteers SET approval = 'approved', decided_by_user_id = ?, decided_at = ?
      WHERE id = ? AND ward_id = ? AND approval = 'pending'`,
  )
    .bind(byUserId, now.toISOString(), v.id, wardId)
    .run();
  if (!claim.meta.changes) return { result: undefined, messages: [] };
  const approvedV: VolunteerRow = { ...v, approval: 'approved' };

  const items: E.ApprovedSignup[] = [];
  const touchedPosts = new Set<string>();
  for (const s of await upcomingSignups(env, wardId, v.id, 'waiting', now)) {
    // Each confirmation reads the role's current count, so order within the batch holds.
    const over = await stampConfirmed(env, wardId, s.signup.id, s.role.id, s.role.needed, now);
    touchedPosts.add(s.post.id);
    items.push({
      post: emailPost(s.post, env.APP_URL),
      when: whenText(s.date, s.role),
      roleName: s.role.name,
      privateDetails: s.post.private_details,
      cancelUrl: await cancelUrl(env, wardId, s.signup.id, now),
      overLimit: over,
      withdrawUrl: over ? await withdrawUrl(env, wardId, s.signup.id, now) : null,
    });
  }
  const ward = await env.DB.prepare(`SELECT name FROM wards WHERE id = ?`).bind(wardId).first<{ name: string }>();
  const messages: OutgoingMessage[] = [
    E.approved({
      to: v.email, volunteerId: v.id, name: approvedV.name, wardName: ward?.name ?? 'Your ward',
      mySignupsUrl: await accessUrl(env, wardId, v.id, now), signups: items,
    }),
  ];
  for (const pid of touchedPosts) messages.push(...(await filledMessages(env, wardId, pid, now)));
  return { result: undefined, messages };
}

export async function declineVolunteer(
  env: Env,
  wardId: string,
  volunteerId: string,
  byUserId: string,
  now: Date,
): Promise<Outcome<void>> {
  const v = await getVolunteer(env, wardId, volunteerId);
  if (!v || (v.approval !== 'pending' && v.approval !== 'none')) return { result: undefined, messages: [] };
  const claim = await env.DB.prepare(
    `UPDATE volunteers SET approval = 'declined', decided_by_user_id = ?, decided_at = ?
      WHERE id = ? AND ward_id = ? AND approval IN ('pending','none')`,
  )
    .bind(byUserId, now.toISOString(), v.id, wardId)
    .run();
  if (!claim.meta.changes) return { result: undefined, messages: [] };
  await env.DB.prepare(
    `UPDATE vol_signups SET status = 'declined', ended_at = ? WHERE ward_id = ? AND volunteer_id = ? AND status = 'waiting'`,
  )
    .bind(now.toISOString(), wardId, v.id)
    .run();
  const ward = await env.DB.prepare(`SELECT name FROM wards WHERE id = ?`).bind(wardId).first<{ name: string }>();
  return { result: undefined, messages: [E.declined({ to: v.email, name: v.name, wardName: ward?.name ?? 'Your ward' })] };
}

// Bishopric: declined -> 'pending' if the address was verified, else 'none'.
export async function undoDecline(env: Env, wardId: string, volunteerId: string, byUserId: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE volunteers
        SET approval = CASE WHEN email_verified_at IS NOT NULL THEN 'pending' ELSE 'none' END,
            decided_by_user_id = ?, decided_at = NULL
      WHERE id = ? AND ward_id = ? AND approval = 'declined'`,
  )
    .bind(byUserId, volunteerId, wardId)
    .run();
}

// ---------------------------------------------------------------- cancel helpers (Task 11 uses these too)

// The cancel cutoff: the role's start (ward-local) minus the post's cancel_cutoff_hours.
export function cutoffInstant(
  post: { cancel_cutoff_hours: number; ward: { timezone: string } },
  date: { date: string; start_time: string | null },
  role: { start_time: string | null },
): Date {
  const start = localToUtc(date.date, roleStartTime(date, role), post.ward.timezone);
  return new Date(start.getTime() - post.cancel_cutoff_hours * 3_600_000);
}

// Approver email after a confirmed sign-up stops counting (cancel, revoke, withdraw-that-shorts).
export async function cancelledMessages(
  env: Env,
  wardId: string,
  postId: string,
  roleId: string,
  volunteerName: string,
  now: Date,
): Promise<OutgoingMessage[]> {
  const post = await getPost(env, wardId, postId);
  if (!post) return [];
  const f = findRole(post, roleId);
  if (!f) return [];
  const urgent = now.getTime() >= cutoffInstant(post, f.date, f.role).getTime();
  const stillFull = f.role.confirmed >= f.role.needed;
  const ep = emailPost(post, env.APP_URL);
  return (await approverEmails(env, wardId, postId)).map((to) =>
    E.approverCancelled({
      to, post: ep, when: whenText(f.date, f.role), roleName: f.role.name, volunteerName,
      urgent, stillFull, confirmed: f.role.confirmed, needed: f.role.needed, manageUrl: manageUrl(env, wardId, postId),
    }),
  );
}

// Bishopric: someone moved out. Approval -> declined; upcoming confirmed sign-ups are removed
// (slots reopen) and their posts' approvers are told.
export async function revokeApproval(
  env: Env,
  wardId: string,
  volunteerId: string,
  byUserId: string,
  now: Date,
): Promise<Outcome<void>> {
  const v = await getVolunteer(env, wardId, volunteerId);
  if (!v || v.approval !== 'approved') return { result: undefined, messages: [] };
  const claim = await env.DB.prepare(
    `UPDATE volunteers SET approval = 'declined', decided_by_user_id = ?, decided_at = ?
      WHERE id = ? AND ward_id = ? AND approval = 'approved'`,
  )
    .bind(byUserId, now.toISOString(), v.id, wardId)
    .run();
  if (!claim.meta.changes) return { result: undefined, messages: [] };
  const messages: OutgoingMessage[] = [];
  for (const s of await upcomingSignups(env, wardId, v.id, 'confirmed', now)) {
    await env.DB.prepare(
      `UPDATE vol_signups SET status = 'removed', ended_at = ? WHERE id = ? AND ward_id = ? AND status = 'confirmed'`,
    )
      .bind(now.toISOString(), s.signup.id, wardId)
      .run();
    await resetFullIfShort(env, wardId, s.post.id);
    messages.push(...(await cancelledMessages(env, wardId, s.post.id, s.role.id, v.name, now)));
  }
  await env.DB.prepare(
    `UPDATE vol_signups SET status = 'declined', ended_at = ? WHERE ward_id = ? AND volunteer_id = ? AND status = 'waiting'`,
  )
    .bind(now.toISOString(), wardId, v.id)
    .run();
  return { result: undefined, messages };
}

// ---------------------------------------------------------------- cancel / withdraw / remove

type EndResult<T extends string> = Outcome<T | 'already' | 'not_found'>;

async function volunteerName(env: Env, wardId: string, volunteerId: string): Promise<string> {
  return (await getVolunteer(env, wardId, volunteerId))?.name ?? 'A volunteer';
}

// Is the sign-up's date over (in the ward's zone)? Emailed cancel/withdraw links stop working then.
export async function signupDateOver(env: Env, s: SignupRow, now: Date): Promise<boolean> {
  const r = await env.DB.prepare(
    `SELECT d.date AS date, w.timezone AS tz FROM vol_roles r
       JOIN vol_dates d ON d.id = r.date_id AND d.ward_id = r.ward_id
       JOIN wards w ON w.id = r.ward_id
      WHERE r.id = ? AND r.ward_id = ?`,
  )
    .bind(s.role_id, s.ward_id)
    .first<{ date: string; tz: string }>();
  return !r || isDateOver(r.date, r.tz, now);
}

// The volunteer cancels. Before the post's cutoff the approvers get a plain email; after it,
// an urgent "you're now short" one (or "still full" when it had been over-filled). Cancelling a
// waiting sign-up tells no one (it never counted).
export async function cancelSignup(env: Env, wardId: string, signupId: string, now: Date): Promise<EndResult<'cancelled'>> {
  const s = await getSignup(env, wardId, signupId);
  if (!s) return { result: 'not_found', messages: [] };
  if (s.status !== 'waiting' && s.status !== 'confirmed') return { result: 'already', messages: [] };
  const claim = await env.DB.prepare(
    `UPDATE vol_signups SET status = 'cancelled', ended_at = ? WHERE id = ? AND ward_id = ? AND status = ?`,
  )
    .bind(now.toISOString(), s.id, wardId, s.status)
    .run();
  if (!claim.meta.changes) return { result: 'already', messages: [] };
  if (s.status === 'waiting') return { result: 'cancelled', messages: [] };
  await resetFullIfShort(env, wardId, s.post_id);
  const name = await volunteerName(env, wardId, s.volunteer_id);
  return { result: 'cancelled', messages: await cancelledMessages(env, wardId, s.post_id, s.role_id, name, now) };
}

// An over-the-limit volunteer withdraws their offer. If the role is still full, nobody is
// emailed (spec §6.3 step 6); otherwise it's like a cancel.
export async function withdrawOffer(env: Env, wardId: string, signupId: string, now: Date): Promise<EndResult<'withdrawn'>> {
  const s = await getSignup(env, wardId, signupId);
  if (!s) return { result: 'not_found', messages: [] };
  if (s.status === 'withdrawn') return { result: 'already', messages: [] };
  if (s.status !== 'confirmed' || !s.over_limit) return { result: 'not_found', messages: [] };
  const claim = await env.DB.prepare(
    `UPDATE vol_signups SET status = 'withdrawn', ended_at = ? WHERE id = ? AND ward_id = ? AND status = 'confirmed'`,
  )
    .bind(now.toISOString(), s.id, wardId)
    .run();
  if (!claim.meta.changes) return { result: 'already', messages: [] };
  const post = await getPost(env, wardId, s.post_id);
  const f = post ? findRole(post, s.role_id) : null;
  if (!f || f.role.confirmed >= f.role.needed) return { result: 'withdrawn', messages: [] };
  await resetFullIfShort(env, wardId, s.post_id);
  const name = await volunteerName(env, wardId, s.volunteer_id);
  return { result: 'withdrawn', messages: await cancelledMessages(env, wardId, s.post_id, s.role_id, name, now) };
}

// A leader takes someone off a role (the route checks canEditPost). The volunteer is told
// (when their address is confirmed); the approvers are not.
export async function removeSignup(
  env: Env,
  wardId: string,
  signupId: string,
  byUserId: string,
  now: Date,
): Promise<EndResult<'removed'>> {
  void byUserId;
  const s = await getSignup(env, wardId, signupId);
  if (!s) return { result: 'not_found', messages: [] };
  if (s.status !== 'waiting' && s.status !== 'confirmed') return { result: 'already', messages: [] };
  const claim = await env.DB.prepare(
    `UPDATE vol_signups SET status = 'removed', ended_at = ? WHERE id = ? AND ward_id = ? AND status = ?`,
  )
    .bind(now.toISOString(), s.id, wardId, s.status)
    .run();
  if (!claim.meta.changes) return { result: 'already', messages: [] };
  await resetFullIfShort(env, wardId, s.post_id);
  const v = await getVolunteer(env, wardId, s.volunteer_id);
  const post = await getPost(env, wardId, s.post_id);
  const f = post ? findRole(post, s.role_id) : null;
  if (!v || !post || !f || !v.email_verified_at || isDateOver(f.date.date, post.ward.timezone, now)) {
    return { result: 'removed', messages: [] };
  }
  return {
    result: 'removed',
    messages: [
      E.signupRemoved({
        to: v.email, name: v.name, post: emailPost(post, env.APP_URL), when: whenText(f.date, f.role),
        roleName: f.role.name, reason: 'removed',
      }),
    ],
  };
}

// For the cancel/withdraw landing pages: what the link is about (no private details).
export async function signupSummary(
  env: Env,
  wardId: string,
  signupId: string,
): Promise<{ signup: SignupRow; title: string; orgName: string; when: string; roleName: string; prefix: string } | null> {
  const s = await getSignup(env, wardId, signupId);
  if (!s) return null;
  const post = await getPost(env, wardId, s.post_id);
  const f = post ? findRole(post, s.role_id) : null;
  if (!post || !f) return null;
  return { signup: s, title: post.title, orgName: post.org_name, when: whenText(f.date, f.role), roleName: f.role.name, prefix: post.ward.prefix };
}

// ---------------------------------------------------------------- My sign-ups

export interface MySignup {
  id: string;
  status: string;
  overLimit: boolean;
  bringing: string | null;
  title: string;
  orgName: string;
  publicId: string;
  when: string;
  date: string;
  roleName: string;
  upcoming: boolean;
  // Only for an approved volunteer's confirmed sign-up on a post that isn't over:
  privateDetails: string | null;
  otherNames: string[];
}

// A volunteer's own sign-ups in one ward. Private details and the other confirmed volunteers'
// names are filled in only when `approved` and the post isn't over (spec §6.4, §6.8).
export async function listMySignups(
  env: Env,
  wardId: string,
  volunteerId: string,
  approved: boolean,
  now: Date,
): Promise<MySignup[]> {
  const rows = await env.DB.prepare(
    `SELECT * FROM vol_signups WHERE ward_id = ? AND volunteer_id = ? AND status IN ('waiting','confirmed')
      ORDER BY created_at, id`,
  )
    .bind(wardId, volunteerId)
    .all<SignupRow>();
  const cache = new Map<string, PostFull | null>();
  const out: MySignup[] = [];
  for (const s of rows.results ?? []) {
    if (!cache.has(s.post_id)) cache.set(s.post_id, await getPost(env, wardId, s.post_id));
    const post = cache.get(s.post_id);
    if (!post) continue;
    const f = findRole(post, s.role_id);
    if (!f) continue;
    const upcoming = !isDateOver(f.date.date, post.ward.timezone, now);
    // A waiting sign-up whose date passed is about to lapse; it isn't "past" help.
    if (!upcoming && s.status !== 'confirmed') continue;
    const postOver = isPostOver(post, now);
    const reveal = approved && s.status === 'confirmed' && !postOver;
    let otherNames: string[] = [];
    if (reveal) {
      const names = await env.DB.prepare(
        `SELECT DISTINCT v.name AS name FROM vol_signups x JOIN volunteers v ON v.id = x.volunteer_id AND v.ward_id = x.ward_id
          WHERE x.ward_id = ? AND x.post_id = ? AND x.status = 'confirmed' AND x.volunteer_id <> ?
          ORDER BY v.name`,
      )
        .bind(wardId, post.id, volunteerId)
        .all<{ name: string }>();
      otherNames = (names.results ?? []).map((n) => n.name);
    }
    out.push({
      id: s.id,
      status: s.status,
      overLimit: !!s.over_limit,
      bringing: s.bringing,
      title: post.title,
      orgName: post.org_name,
      publicId: post.public_id,
      when: whenText(f.date, f.role),
      date: f.date.date,
      roleName: f.role.name,
      upcoming,
      privateDetails: reveal ? post.private_details : null,
      otherNames,
    });
  }
  out.sort((a, b) => (a.upcoming === b.upcoming ? (a.upcoming ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) : a.upcoming ? -1 : 1));
  return out;
}
