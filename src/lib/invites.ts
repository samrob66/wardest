import type { Env } from '../types';
import { newId, randomToken } from './ids';
import { esc } from './html';
import { sendMail } from './mail';

export interface InviteSpaceRole {
  space_id: string;
  role: string;
  space_name: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  ward_role: string;
  calling_title: string | null;
  token: string;
  spaceRoles: InviteSpaceRole[];
}

export interface InviteRow {
  id: string;
  ward_id: string;
  email: string;
  ward_role: string;
  calling_title: string | null;
  status: string;
  ward_prefix: string;
  ward_name: string;
  invited_by_user_id?: string | null;
}

// One invite per (ward, email); re-inviting UPDATES the row (fresh token, pending) per schema.
export async function upsertInvite(
  env: Env,
  o: { wardId: string; email: string; wardRole: 'superadmin' | 'member'; calling: string | null; invitedBy: string },
): Promise<{ id: string; token: string }> {
  const token = randomToken(24);
  const email = o.email.toLowerCase();
  const existing = await env.DB.prepare(`SELECT id FROM invites WHERE ward_id = ? AND email = ?`)
    .bind(o.wardId, email)
    .first<{ id: string }>();
  if (existing) {
    await env.DB.prepare(
      `UPDATE invites SET ward_role = ?, calling_title = ?, token = ?, status = 'pending',
         invited_by_user_id = ?, expires_at = datetime('now', '+30 days') WHERE id = ?`,
    )
      .bind(o.wardRole, o.calling, token, o.invitedBy, existing.id)
      .run();
    return { id: existing.id, token };
  }
  const id = newId('inv');
  await env.DB.prepare(
    `INSERT INTO invites (id, ward_id, email, ward_role, calling_title, token, status, invited_by_user_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now', '+30 days'))`,
  )
    .bind(id, o.wardId, email, o.wardRole, o.calling, token, o.invitedBy)
    .run();
  return { id, token };
}

export async function addInviteSpaceRole(
  env: Env,
  inviteId: string,
  spaceId: string,
  role: 'owner' | 'member',
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO invite_space_roles (id, invite_id, space_id, role) VALUES (?, ?, ?, ?)
     ON CONFLICT(invite_id, space_id) DO UPDATE SET role = excluded.role`,
  )
    .bind(newId('isr'), inviteId, spaceId, role)
    .run();
}

export async function listPendingInvites(env: Env, wardId: string): Promise<PendingInvite[]> {
  const invites = await env.DB.prepare(
    `SELECT id, email, ward_role, calling_title, token
       FROM invites WHERE ward_id = ? AND status = 'pending' ORDER BY created_at ASC`,
  )
    .bind(wardId)
    .all<Omit<PendingInvite, 'spaceRoles'>>();
  const rows = invites.results ?? [];
  const out: PendingInvite[] = [];
  for (const inv of rows) {
    const sr = await env.DB.prepare(
      `SELECT isr.space_id AS space_id, isr.role AS role, s.name AS space_name
         FROM invite_space_roles isr JOIN spaces s ON s.id = isr.space_id
        WHERE isr.invite_id = ? ORDER BY s.position ASC`,
    )
      .bind(inv.id)
      .all<InviteSpaceRole>();
    out.push({ ...inv, spaceRoles: sr.results ?? [] });
  }
  return out;
}

// Valid, pending, unexpired invite (joined to its ward) — or null.
export async function getInviteByToken(env: Env, token: string): Promise<InviteRow | null> {
  return env.DB.prepare(
    `SELECT i.id, i.ward_id, i.email, i.ward_role, i.calling_title, i.status, i.invited_by_user_id,
            w.prefix AS ward_prefix, w.name AS ward_name
       FROM invites i JOIN wards w ON w.id = i.ward_id
      WHERE i.token = ? AND i.status = 'pending' AND i.expires_at > datetime('now')`,
  )
    .bind(token)
    .first<InviteRow>();
}

// Materialize the invite into ward + space memberships (idempotent), mark accepted.
export async function acceptInvite(env: Env, invite: InviteRow, userId: string): Promise<void> {
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO ward_memberships (id, ward_id, user_id, role, calling_title) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(ward_id, user_id) DO UPDATE SET role = excluded.role, calling_title = excluded.calling_title`,
    ).bind(newId('wm'), invite.ward_id, userId, invite.ward_role, invite.calling_title),
  ];
  const sr = await env.DB.prepare(`SELECT space_id, role FROM invite_space_roles WHERE invite_id = ?`)
    .bind(invite.id)
    .all<{ space_id: string; role: string }>();
  for (const r of sr.results ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO space_memberships (id, ward_id, space_id, user_id, role) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(space_id, user_id) DO UPDATE SET role = excluded.role`,
      ).bind(newId('sm'), invite.ward_id, r.space_id, userId, r.role),
    );
  }
  // Category delegations a manager attached (service categories of this ward only).
  stmts.push(
    env.DB.prepare(
      `INSERT OR IGNORE INTO service_delegates (id, ward_id, category_id, user_id, added_by_user_id)
       SELECT 'sdel_' || lower(hex(randomblob(16))), c.ward_id, c.id, ?, ?
         FROM invite_category_delegations icd JOIN service_categories c ON c.id = icd.category_id
        WHERE icd.invite_id = ? AND c.ward_id = ?`,
    ).bind(userId, invite.invited_by_user_id ?? null, invite.id, invite.ward_id),
  );
  stmts.push(
    env.DB.prepare(`UPDATE invites SET status = 'accepted', accepted_user_id = ? WHERE id = ?`).bind(
      userId,
      invite.id,
    ),
  );
  await env.DB.batch(stmts);
}

// Best-effort invitation email (src/lib/mail.ts, notify stream). Returns false on failure so
// invite creation never blocks on email — the accept link is also shown in the admin UI.
export async function sendInviteEmail(
  env: Env,
  o: { to: string; wardName: string; acceptUrl: string },
): Promise<boolean> {
  const r = await sendMail(env, {
    stream: 'notify',
    to: o.to,
    subject: `You've been added to ${o.wardName} on WardForward`,
    html:
      `<p>You've been invited to <strong>${esc(o.wardName)}</strong> on WardForward.</p>` +
      `<p><a href="${esc(o.acceptUrl)}">Accept your invitation</a></p>` +
      `<p style="color:#888;font-size:12px">If you didn't expect this, you can ignore it.</p>`,
    tag: 'kind=invite',
  });
  return r.ok;
}
