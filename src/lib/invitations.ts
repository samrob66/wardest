// Bulk email invitations to a service opportunity (spec §7), and one-click unsubscribe.
//
//  - A leader pastes addresses (src/lib/recipients.ts); a batch row records who/when/post/counts
//    for the operator, and one invite_recipients row per address waits to be sent. The pasted
//    list is deleted once the batch ends (done or cancelled); no saved lists.
//  - Sending is pumped from D1: an immediate first chunk (the send route's waitUntil, 100) and
//    then the every-minute Cron Trigger (400 a run). Each run CLAIMS rows atomically (one UPDATE
//    ... WHERE id IN (SELECT ... LIMIT n) sets claim_id), so overlapping runs never send an
//    address twice; a claim older than 10 minutes (a run that died) may be retaken.
//  - Sizing (checked 2026-11-22): Workers Paid allows 10,000 subrequests per invocation by
//    default and a Cron Trigger up to 15 minutes of wall time
//    (https://developers.cloudflare.com/workers/platform/limits/); Email Service allows up to 50
//    recipients per message and gives new accounts a conservative daily quota with no published
//    per-second rate (https://developers.cloudflare.com/email-service/platform/limits/). A run of
//    400 is ~400 send_email calls plus ~15 D1 calls (suppression lookups in chunks of 90, batched
//    updates), far under 10,000; at concurrency 10 it finishes in well under a minute, so runs
//    rarely overlap. 2,000 invitations take about five minutes.
//  - Daily safety ceiling per ward (wards.invite_daily_cap, default 5000, ward-local day): each
//    run first RESERVES its allowance in invite_daily_counts inside one transaction (so two runs
//    can't both spend the last of it), then gives back what it didn't send. At zero the batch
//    waits ('waiting_cap'), its creator is emailed once, and it resumes the next day.
//  - Each message: one recipient, the invitations stream, List-Unsubscribe +
//    List-Unsubscribe-Post (RFC 8058) and an unsubscribe link in the body. Suppression (a hash
//    of the address, per ward) is re-checked at send time; it never blocks notify mail.
import type { Env } from '../types';
import { esc } from './html';
import { newId } from './ids';
import { sendMail, sendMailBatch, type MailMessage } from './mail';
import { MAX_RECIPIENTS, parseRecipients } from './recipients';
import { deliver } from './volMessages';
import { getPost, isDateOver, whenText, type PostFull } from './volPosts';
import { makeLinkToken, readLinkToken, sha256Hex } from './volSession';
import { safeHref } from './urls';
import { wardToday } from './wardTime';

export class InviteInputError extends Error {}

export const KICK_LIMIT = 100; // the send route's immediate first chunk
export const CRON_LIMIT = 400; // each minute-cron run
const CONCURRENCY = 10;
const STALE_CLAIM_MS = 10 * 60_000;
const IN_CHUNK = 90; // D1 allows 100 bound parameters per statement

function chunks<T>(list: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

// ---------------------------------------------------------------- suppression

export async function emailHash(email: string): Promise<string> {
  return sha256Hex(email.trim().toLowerCase());
}

export async function suppressByHash(env: Env, wardId: string, hash: string): Promise<void> {
  await env.DB.prepare(`INSERT OR IGNORE INTO invite_suppressions (id, ward_id, email_hash) VALUES (?, ?, ?)`)
    .bind(newId('isup'), wardId, hash)
    .run();
}

export async function suppressAddress(env: Env, wardId: string, email: string): Promise<void> {
  await suppressByHash(env, wardId, await emailHash(email));
}

export async function isSuppressed(env: Env, wardId: string, email: string): Promise<boolean> {
  const r = await env.DB.prepare(`SELECT 1 AS ok FROM invite_suppressions WHERE ward_id = ? AND email_hash = ?`)
    .bind(wardId, await emailHash(email))
    .first();
  return r != null;
}

// The subset of `emails` that unsubscribed from this ward.
async function suppressedSet(env: Env, wardId: string, emails: string[]): Promise<Set<string>> {
  const byHash = new Map<string, string>();
  for (const e of emails) byHash.set(await emailHash(e), e);
  const out = new Set<string>();
  for (const part of chunks([...byHash.keys()], IN_CHUNK)) {
    const res = await env.DB.prepare(
      `SELECT email_hash FROM invite_suppressions WHERE ward_id = ? AND email_hash IN (${part.map(() => '?').join(',')})`,
    )
      .bind(wardId, ...part)
      .all<{ email_hash: string }>();
    for (const r of res.results ?? []) out.add(byHash.get(r.email_hash)!);
  }
  return out;
}

// ---------------------------------------------------------------- preview / create

export interface InvitePreview {
  toSend: string[];
  invalid: string[];
  duplicates: number;
  suppressed: number;
}

function checkNote(raw: string | null): string | null {
  const note = String(raw ?? '').trim() || null;
  if (note && note.length > 500) throw new InviteInputError('The note is too long (500 characters at most).');
  return note;
}

export async function previewInvites(env: Env, wardId: string, raw: string): Promise<InvitePreview> {
  const p = parseRecipients(raw);
  if (p.valid.length > MAX_RECIPIENTS) {
    throw new InviteInputError(`That's ${p.valid.length.toLocaleString('en-US')} addresses; please send at most ${MAX_RECIPIENTS.toLocaleString('en-US')} at a time.`);
  }
  const sup = await suppressedSet(env, wardId, p.valid);
  return { toSend: p.valid.filter((e) => !sup.has(e)), invalid: p.invalid, duplicates: p.duplicates, suppressed: sup.size };
}

// Re-parses and re-checks suppression server-side, then queues the batch. It is inserted as
// 'preparing' (invisible to the pump) and only becomes 'sending' once every address is in, so a
// run can never finish it half-filled.
export async function createInviteBatch(
  env: Env,
  o: { wardId: string; postId: string; byUserId: string; raw: string; note: string | null },
): Promise<{ batchId: string; total: number; suppressed: number; invalid: number }> {
  const note = checkNote(o.note);
  const pv = await previewInvites(env, o.wardId, o.raw);
  if (!pv.toSend.length) throw new InviteInputError('There are no addresses left to invite.');
  const post = await getPost(env, o.wardId, o.postId);
  if (!post) throw new InviteInputError('That post no longer exists.');
  const batchId = newId('ib');
  await env.DB.prepare(
    `INSERT INTO invite_batches (id, ward_id, post_id, post_title, created_by_user_id, note, total, invalid_count, suppressed_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'preparing')`,
  )
    .bind(batchId, o.wardId, o.postId, post.title, o.byUserId, note, pv.toSend.length, pv.invalid.length, pv.suppressed)
    .run();
  try {
    const stmts = chunks(pv.toSend, 20).map((part) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO invite_recipients (id, ward_id, batch_id, email) VALUES ${part.map(() => '(?, ?, ?, ?)').join(', ')}`,
      ).bind(...part.flatMap((e) => [newId('ir'), o.wardId, batchId, e])),
    );
    for (const group of chunks(stmts, 50)) await env.DB.batch(group);
    await env.DB.prepare(`UPDATE invite_batches SET status = 'sending' WHERE id = ? AND ward_id = ? AND status = 'preparing'`)
      .bind(batchId, o.wardId)
      .run();
  } catch (e) {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM invite_recipients WHERE batch_id = ? AND ward_id = ?`).bind(batchId, o.wardId),
      env.DB.prepare(`UPDATE invite_batches SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?`).bind(batchId),
    ]);
    throw e;
  }
  return { batchId, total: pv.toSend.length, suppressed: pv.suppressed, invalid: pv.invalid.length };
}

// ---------------------------------------------------------------- the message

export async function unsubUrl(env: Env, wardId: string, email: string): Promise<string> {
  return `${env.APP_URL}/unsub/${await makeLinkToken(env, { typ: 'unsub', wardId, id: await emailHash(email) })}`;
}

// What an unsubscribe link names: the ward and the address's hash. Null for a bad token.
export async function readUnsub(env: Env, token: string): Promise<{ wardId: string; wardName: string; hash: string } | null> {
  const t = await readLinkToken(env, 'unsub', token);
  if (!t || !/^[0-9a-f]{64}$/.test(t.id)) return null;
  const ward = await env.DB.prepare(`SELECT name FROM wards WHERE id = ?`).bind(t.wardId).first<{ name: string }>();
  return ward ? { wardId: t.wardId, wardName: ward.name, hash: t.id } : null;
}

// One invitation, invitation-shaped: one recipient, about one opportunity, unsubscribe link in
// the body and the RFC 8058 headers.
export function invitationMessage(
  env: Env,
  o: { post: PostFull; note: string | null; to: string; unsubUrl: string; test?: boolean; now: Date },
): MailMessage {
  const p = o.post;
  const dates = p.dates
    .filter((d) => !isDateOver(d.date, p.ward.timezone, o.now))
    .map((d) => `<li>${esc(whenText(d, { start_time: null, end_time: null }))}</li>`)
    .join('');
  const publicUrl = `${env.APP_URL}/v/${p.public_id}`;
  const html = `<div style="font-family:Georgia,serif;color:#2c3a4a;line-height:1.55;max-width:560px">
    <p style="color:#6b7a8d;margin:0">${esc(p.ward.name)} · ${esc(p.org_name)}</p>
    <h2 style="color:#1d3557;font-size:20px;margin:6px 0 10px">${esc(p.title)}</h2>
    ${dates ? `<ul>${dates}</ul>` : ''}
    ${o.note ? `<p>${esc(o.note).replace(/\n/g, '<br>')}</p>` : ''}
    <p style="margin:18px 0"><a href="${esc(safeHref(publicUrl))}" style="background:#1d3557;color:#fff;padding:10px 18px;border-radius:20px;text-decoration:none;display:inline-block">See the opportunity and sign up</a></p>
    <p style="color:#8695a8;font-size:12px;margin-top:24px">You got this because a leader in ${esc(p.ward.name)} invited you to help.
      <a href="${esc(o.unsubUrl)}">Stop service invitations from ${esc(p.ward.name)}</a></p>
  </div>`;
  return {
    stream: 'invitations',
    to: o.to,
    subject: `${o.test ? '[Test] ' : ''}Service opportunity: ${p.title}`,
    html,
    headers: { 'List-Unsubscribe': `<${o.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    tag: `ward=${p.ward_id} ref=${p.id} kind=invitation`,
  };
}

// "Send a test to me": not counted, not checked against the suppression list.
export async function sendTestInvite(env: Env, o: { wardId: string; postId: string; to: string; note: string | null; now: Date }): Promise<boolean> {
  const note = checkNote(o.note);
  const post = await getPost(env, o.wardId, o.postId);
  if (!post) return false;
  const r = await sendMail(env, invitationMessage(env, { post, note, to: o.to, unsubUrl: await unsubUrl(env, o.wardId, o.to), test: true, now: o.now }));
  return r.ok;
}

// ---------------------------------------------------------------- the pump

interface BatchRow {
  id: string;
  ward_id: string;
  post_id: string | null;
  created_by_user_id: string | null;
  note: string | null;
  status: string;
  cap_notified_at: string | null;
  sent: number;
  total: number;
}

async function finish(env: Env, b: BatchRow, now: Date): Promise<void> {
  const done = await env.DB.prepare(
    `UPDATE invite_batches SET status = 'done', finished_at = ?
      WHERE id = ? AND ward_id = ? AND status IN ('sending','waiting_cap')
        AND NOT EXISTS (SELECT 1 FROM invite_recipients WHERE batch_id = ? AND sent_at IS NULL AND failed = 0)`,
  )
    .bind(now.toISOString(), b.id, b.ward_id, b.id)
    .run();
  if (done.meta.changes) {
    await env.DB.prepare(`DELETE FROM invite_recipients WHERE batch_id = ? AND ward_id = ?`).bind(b.id, b.ward_id).run();
  }
}

async function cancel(env: Env, b: BatchRow, now: Date): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`UPDATE invite_batches SET status = 'cancelled', finished_at = ? WHERE id = ? AND ward_id = ?`).bind(now.toISOString(), b.id, b.ward_id),
    env.DB.prepare(`DELETE FROM invite_recipients WHERE batch_id = ? AND ward_id = ?`).bind(b.id, b.ward_id),
  ]);
}

// Reserves up to `want` of today's allowance; returns how much was granted (one transaction).
async function reserve(env: Env, wardId: string, day: string, cap: number, want: number): Promise<number> {
  const res = await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO invite_daily_counts (ward_id, day, sent) VALUES (?, ?, 0)`).bind(wardId, day),
    env.DB.prepare(`SELECT sent FROM invite_daily_counts WHERE ward_id = ? AND day = ?`).bind(wardId, day),
    env.DB.prepare(`UPDATE invite_daily_counts SET sent = MIN(?, sent + ?) WHERE ward_id = ? AND day = ? AND sent < ?`).bind(cap, want, wardId, day, cap),
    env.DB.prepare(`SELECT sent FROM invite_daily_counts WHERE ward_id = ? AND day = ?`).bind(wardId, day),
  ]);
  const before = (res[1]!.results as Array<{ sent: number }>)[0]?.sent ?? 0;
  const after = (res[3]!.results as Array<{ sent: number }>)[0]?.sent ?? 0;
  return Math.max(0, after - before);
}

async function refund(env: Env, wardId: string, day: string, n: number): Promise<void> {
  if (n <= 0) return;
  await env.DB.prepare(`UPDATE invite_daily_counts SET sent = MAX(0, sent - ?) WHERE ward_id = ? AND day = ?`).bind(n, wardId, day).run();
}

async function hasPending(env: Env, b: BatchRow): Promise<boolean> {
  const r = await env.DB.prepare(`SELECT 1 AS ok FROM invite_recipients WHERE batch_id = ? AND ward_id = ? AND sent_at IS NULL AND failed = 0 LIMIT 1`)
    .bind(b.id, b.ward_id)
    .first();
  return r != null;
}

// Today's limit is used up and addresses remain: wait for tomorrow, tell the creator once.
async function waitForTomorrow(env: Env, b: BatchRow, wardName: string, now: Date): Promise<void> {
  await env.DB.prepare(`UPDATE invite_batches SET status = 'waiting_cap' WHERE id = ? AND ward_id = ? AND status = 'sending'`)
    .bind(b.id, b.ward_id)
    .run();
  const claim = await env.DB.prepare(`UPDATE invite_batches SET cap_notified_at = ? WHERE id = ? AND ward_id = ? AND cap_notified_at IS NULL`)
    .bind(now.toISOString(), b.id, b.ward_id)
    .run();
  if (!claim.meta.changes || !b.created_by_user_id) return;
  const u = await env.DB.prepare(`SELECT LOWER(email) AS email FROM users WHERE id = ?`).bind(b.created_by_user_id).first<{ email: string }>();
  if (!u) return;
  const row = await env.DB.prepare(`SELECT sent, total, post_title FROM invite_batches WHERE id = ?`).bind(b.id).first<{ sent: number; total: number; post_title: string | null }>();
  await deliver(env, [
    {
      kind: 'invite_cap',
      to: u.email,
      wardId: b.ward_id,
      ref: b.id,
      subject: `Invitations: today's safety limit is reached`,
      html: `<div style="font-family:Georgia,serif;color:#2c3a4a;line-height:1.55;max-width:560px">
        <p>Your invitations for <strong>${esc(row?.post_title ?? 'your opportunity')}</strong> are on their way:
        ${row?.sent ?? 0} of ${row?.total ?? 0} sent.</p>
        <p>Today's safety limit is reached; the rest send tomorrow. You don't need to do anything.</p>
        <p style="color:#8695a8;font-size:12px">${esc(wardName)} · WardForward</p></div>`,
    },
  ]);
}

async function pumpBatch(env: Env, b: BatchRow, now: Date, budget: number): Promise<{ sent: number; failed: number }> {
  const none = { sent: 0, failed: 0 };
  const ward = await env.DB.prepare(`SELECT name, timezone, invite_daily_cap AS cap FROM wards WHERE id = ? AND status = 'active'`)
    .bind(b.ward_id)
    .first<{ name: string; timezone: string; cap: number }>();
  if (!ward) return none; // a suspended ward's batches wait
  const post = b.post_id ? await getPost(env, b.ward_id, b.post_id) : null;
  if (!post) {
    await cancel(env, b, now); // the post was deleted
    return none;
  }
  const day = wardToday(ward.timezone, now);
  const granted = await reserve(env, b.ward_id, day, ward.cap, budget);
  if (granted === 0) {
    if (await hasPending(env, b)) await waitForTomorrow(env, b, ward.name, now);
    else await finish(env, b, now);
    return none;
  }
  const claimId = newId('clm');
  await env.DB.prepare(
    `UPDATE invite_recipients SET claim_id = ?, claimed_at = ?
      WHERE id IN (SELECT id FROM invite_recipients
                    WHERE batch_id = ? AND ward_id = ? AND sent_at IS NULL AND failed = 0
                      AND (claim_id IS NULL OR claimed_at < ?)
                    LIMIT ?)`,
  )
    .bind(claimId, now.toISOString(), b.id, b.ward_id, new Date(now.getTime() - STALE_CLAIM_MS).toISOString(), granted)
    .run();
  const rows = (
    await env.DB.prepare(`SELECT id, email FROM invite_recipients WHERE claim_id = ? AND ward_id = ?`).bind(claimId, b.ward_id).all<{ id: string; email: string }>()
  ).results ?? [];
  if (!rows.length) {
    await refund(env, b.ward_id, day, granted);
    await finish(env, b, now);
    return none;
  }
  if (b.status === 'waiting_cap') {
    await env.DB.prepare(`UPDATE invite_batches SET status = 'sending' WHERE id = ? AND status = 'waiting_cap'`).bind(b.id).run();
  }
  // Unsubscribed since the batch was made: skipped (failed = 2), never sent.
  const sup = await suppressedSet(env, b.ward_id, rows.map((r) => r.email));
  const toSend = rows.filter((r) => !sup.has(r.email));
  const msgs: MailMessage[] = [];
  for (const r of toSend) {
    msgs.push(invitationMessage(env, { post, note: b.note, to: r.email, unsubUrl: await unsubUrl(env, b.ward_id, r.email), now }));
  }
  const results = await sendMailBatch(env, msgs, { concurrency: CONCURRENCY });
  const at = now.toISOString();
  const stmts: D1PreparedStatement[] = [];
  let sent = 0;
  let failed = 0;
  toSend.forEach((r, i) => {
    if (results[i]?.ok) {
      sent++;
      stmts.push(env.DB.prepare(`UPDATE invite_recipients SET sent_at = ? WHERE id = ? AND claim_id = ?`).bind(at, r.id, claimId));
    } else {
      failed++;
      stmts.push(env.DB.prepare(`UPDATE invite_recipients SET failed = 1 WHERE id = ? AND claim_id = ?`).bind(r.id, claimId));
    }
  });
  for (const r of rows) {
    if (sup.has(r.email)) stmts.push(env.DB.prepare(`UPDATE invite_recipients SET failed = 2 WHERE id = ? AND claim_id = ?`).bind(r.id, claimId));
  }
  stmts.push(
    env.DB.prepare(`UPDATE invite_batches SET sent = sent + ?, failed = failed + ?, suppressed_count = suppressed_count + ? WHERE id = ?`).bind(
      sent, failed, sup.size, b.id,
    ),
  );
  for (const group of chunks(stmts, 100)) await env.DB.batch(group);
  await refund(env, b.ward_id, day, granted - sent);
  if (await hasPending(env, b)) {
    const today = await env.DB.prepare(`SELECT sent FROM invite_daily_counts WHERE ward_id = ? AND day = ?`).bind(b.ward_id, day).first<{ sent: number }>();
    if ((today?.sent ?? 0) >= ward.cap) await waitForTomorrow(env, { ...b, status: 'sending' }, ward.name, now);
  } else {
    await finish(env, b, now);
  }
  return { sent, failed };
}

// Sends up to `limit` invitations: one batch (the send route's kick) or every batch waiting,
// oldest first (the minute cron). Never throws for one batch's trouble.
export async function pumpInvitations(env: Env, now: Date, o: { batchId?: string; limit: number }): Promise<{ sent: number; failed: number }> {
  const batches = o.batchId
    ? ((await env.DB.prepare(
        `SELECT id, ward_id, post_id, created_by_user_id, note, status, cap_notified_at, sent, total FROM invite_batches
          WHERE id = ? AND status IN ('sending','waiting_cap')`,
      )
        .bind(o.batchId)
        .all<BatchRow>()).results ?? [])
    : ((await env.DB.prepare(
        `SELECT id, ward_id, post_id, created_by_user_id, note, status, cap_notified_at, sent, total FROM invite_batches
          WHERE status IN ('sending','waiting_cap') ORDER BY created_at, id LIMIT 50`,
      ).all<BatchRow>()).results ?? []);
  let budget = o.limit;
  const total = { sent: 0, failed: 0 };
  for (const b of batches) {
    if (budget <= 0) break;
    try {
      const r = await pumpBatch(env, b, now, budget);
      total.sent += r.sent;
      total.failed += r.failed;
      budget -= r.sent + r.failed;
    } catch (e) {
      console.error(`[invitations] batch=${b.id} ward=${b.ward_id}: ${(e as Error).message}`);
    }
  }
  return total;
}

// ---------------------------------------------------------------- records

export interface BatchProgress {
  id: string;
  post_id: string | null;
  post_title: string | null;
  total: number;
  sent: number;
  failed: number;
  suppressed_count: number;
  invalid_count: number;
  status: string;
  created_at: string;
  finished_at: string | null;
}

export async function getBatch(env: Env, wardId: string, batchId: string): Promise<BatchProgress | null> {
  return env.DB.prepare(
    `SELECT id, post_id, post_title, total, sent, failed, suppressed_count, invalid_count, status, created_at, finished_at
       FROM invite_batches WHERE id = ? AND ward_id = ?`,
  )
    .bind(batchId, wardId)
    .first<BatchProgress>();
}

export interface OperatorBatch extends BatchProgress {
  ward_name: string;
  creator_email: string | null;
}

export async function listBatchesForOperator(env: Env, limit = 100): Promise<OperatorBatch[]> {
  const res = await env.DB.prepare(
    `SELECT b.id, b.post_id, b.post_title, b.total, b.sent, b.failed, b.suppressed_count, b.invalid_count, b.status, b.created_at,
            b.finished_at, w.name AS ward_name, u.email AS creator_email
       FROM invite_batches b JOIN wards w ON w.id = b.ward_id LEFT JOIN users u ON u.id = b.created_by_user_id
      ORDER BY b.created_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all<OperatorBatch>();
  return res.results ?? [];
}

export async function setInviteCap(env: Env, wardId: string, raw: string): Promise<void> {
  const s = String(raw ?? '').trim();
  if (!/^\d{1,7}$/.test(s)) throw new InviteInputError('The daily limit must be a whole number.');
  await env.DB.prepare(`UPDATE wards SET invite_daily_cap = ? WHERE id = ?`).bind(Number(s), wardId).run();
}
