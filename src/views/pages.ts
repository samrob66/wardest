import type { SessionUser } from '../types';
import type { UserWard } from '../lib/users';
import type { WorkspaceRequest, WardRow, SpaceRow, WardMember } from '../lib/wards';
import type { PendingInvite } from '../lib/invites';
import type { OperatorBatch } from '../lib/invitations';
import { esc } from '../lib/html';
import { safeHref, displayUrl } from '../lib/urls';
import { layout } from './layout';
import { COMMON_TIMEZONES } from '../lib/wardTime';

export function renderSignedOut(): string {
  return layout({
    title: 'Sign in',
    body: `<h1>Welcome to WardForward</h1>
      <p>Tools for ward leaders. Sign in with your Google account to continue.</p>
      <p><a class="btn" href="/auth/login">Sign in with Google</a></p>`,
  });
}

export function renderHome(user: SessionUser, wards: UserWard[], operator: boolean): string {
  const wardCards = wards.length
    ? wards
        .map(
          (w) => `<div class="card"><div class="row">
            <span><a href="/w/${esc(w.id)}"><strong>${esc(w.name)}</strong></a>
              <span class="muted">/p/${esc(w.prefix)}</span></span>
            <span class="badge ${w.role === 'superadmin' ? 'super' : ''}">${esc(w.role)}</span>
          </div></div>`,
        )
        .join('')
    : `<p class="muted">You're not part of any ward workspace yet.</p>`;

  return layout({
    title: 'Home',
    userEmail: user.email,
    body: `<h1>Hi${user.name ? ', ' + esc(user.name) : ''}</h1>
      <h2>Your wards</h2>
      ${wardCards}
      <p style="margin-top:1.2rem"><a class="btn" href="/request-workspace">Request a workspace</a>
      ${operator ? ` <a class="btn ghost" href="/operator">Operator console</a>` : ''}</p>`,
  });
}

export function renderRequestForm(user: SessionUser, error?: string): string {
  return layout({
    title: 'Request a workspace',
    userEmail: user.email,
    body: `<h1>Request a ward workspace</h1>
      <p class="muted">An operator reviews each request. If a workspace already exists for your
      unit number, we'll route your request to that ward's admins as a join request instead.</p>
      ${error ? `<div class="err">${esc(error)}</div>` : ''}
      <form method="post" action="/request-workspace">
        <label>Ward name</label>
        <input name="ward_name" required placeholder="e.g. Provo 4th Ward" maxlength="80">
        <label>Unit number</label>
        <input name="unit_number" required placeholder="Unit number" maxlength="40">
        <label>Your calling</label>
        <input name="calling" placeholder="e.g. Executive Secretary" maxlength="80">
        <label>Your email</label>
        <input value="${esc(user.email)}" readonly>
        <label style="display:flex;gap:.5rem;align-items:flex-start;margin-top:1rem;color:#2c3a4a;font-size:.95rem">
          <input type="checkbox" name="bishop_approved" value="1" required style="width:auto;margin-top:.25rem">
          <span>Our bishop has approved using WardForward for our ward</span></label>
        <button class="btn" type="submit">Submit request</button>
      </form>`,
  });
}

export function renderRequestConfirmation(user: SessionUser, kind: 'create' | 'join'): string {
  const msg =
    kind === 'join'
      ? `A workspace already exists for that unit number. We've sent a <strong>join request</strong>
         to that ward's admins.`
      : `Your request to <strong>create a workspace</strong> has been submitted for review.`;
  return layout({
    title: 'Request submitted',
    userEmail: user.email,
    body: `<h1>Request submitted</h1><div class="ok">${msg}</div>
      <p><a href="/">Back to home</a></p>`,
  });
}

export interface OperatorExtras {
  wards: Array<{ id: string; name: string; prefix: string; invite_daily_cap: number }>;
  batches: OperatorBatch[];
}

function operatorInvitations(x: OperatorExtras): string {
  const caps = x.wards.length
    ? x.wards
        .map(
          (w) => `<form class="inline card" method="post" action="/operator/wards/${esc(w.id)}/invite-cap">
            <div style="flex:1"><strong>${esc(w.name)}</strong> <span class="muted">/p/${esc(w.prefix)}</span></div>
            <div><label>Invitations per day</label>
              <input name="invite_daily_cap" inputmode="numeric" value="${w.invite_daily_cap}" style="width:8rem"></div>
            <button class="btn sm" type="submit">Save</button></form>`,
        )
        .join('')
    : '<p class="muted">No wards yet.</p>';
  const rows = x.batches.length
    ? `<div class="card" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <tr><th align="left">Ward</th><th align="left">Who</th><th align="left">When</th><th align="left">Post</th>
          <th align="right">Total</th><th align="right">Sent</th><th align="right">Failed</th><th align="right">Skipped</th><th align="left">Status</th></tr>
        ${x.batches
          .map(
            (b) => `<tr><td>${esc(b.ward_name)}</td><td>${esc(b.creator_email ?? '')}</td><td>${esc(b.created_at.slice(0, 16).replace('T', ' '))}</td>
              <td>${esc(b.post_title ?? '')}</td><td align="right">${b.total}</td><td align="right">${b.sent}</td>
              <td align="right">${b.failed}</td><td align="right">${b.suppressed_count + b.invalid_count}</td><td>${esc(b.status)}</td></tr>`,
          )
          .join('')}
      </table></div>`
    : '<p class="muted">No invitation batches yet.</p>';
  return `<h2>Invitation limits</h2>
    <p class="muted">The safety ceiling on bulk invitations per ward per (ward-local) day. Past it, the rest wait for the next day.</p>
    ${caps}
    <h2>Invitation batches</h2>${rows}`;
}

export function renderOperatorConsole(
  user: SessionUser,
  requests: WorkspaceRequest[],
  error?: string,
  extras?: OperatorExtras,
): string {
  const rows = requests.length
    ? requests
        .map(
          (r) => `<div class="card">
            <div class="row"><span><strong>${esc(r.ward_name ?? '(unnamed)')}</strong>
              <span class="muted">unit ${esc(r.unit_number)}</span></span></div>
            <p class="muted">${esc(r.requester_email)}${r.requester_calling ? ' · ' + esc(r.requester_calling) : ''}</p>
            <p class="muted">Bishop approved: ${r.bishop_approved ? 'yes' : 'no'}</p>
            <form class="inline" method="post" action="/operator/requests/${esc(r.id)}/approve">
              <div><label>Assign prefix (match the ward's zippa.run prefix)</label>
                <input name="prefix" required pattern="[a-z0-9]{2,12}" placeholder="e.g. m44" style="width:8rem"></div>
              <button class="btn sm" type="submit">Approve</button>
            </form>
            <form method="post" action="/operator/requests/${esc(r.id)}/deny" style="margin-top:.4rem">
              <button class="btn ghost sm danger" type="submit">Deny</button>
            </form>
          </div>`,
        )
        .join('')
    : `<p class="muted">No pending workspace-creation requests.</p>`;
  return layout({
    title: 'Operator console',
    userEmail: user.email,
    body: `<h1>Operator console</h1>
      <p><a class="btn ghost" href="/operator/solutions">Manage solutions catalog</a></p>
      ${error ? `<div class="err">${esc(error)}</div>` : ''}
      <h2>Pending workspace requests</h2>${rows}
      ${extras ? operatorInvitations(extras) : ''}
      <p style="margin-top:1rem"><a href="/">Back to home</a></p>`,
  });
}

export function renderWardPage(o: {
  user: SessionUser;
  ward: WardRow;
  role: string;
  joins: WorkspaceRequest[];
  spaces: SpaceRow[];
  invites: PendingInvite[];
  members: WardMember[];
  portals: SpaceRow[];
  publicPortal: { id: string; share_url: string | null } | null;
  appUrl: string;
  notice?: string;
  error?: string;
  showService?: boolean; // manages, coordinates or may create in a service category
}): string {
  const { user, ward, role, joins, spaces, invites, members, portals, publicPortal, appUrl, notice, error } = o;
  const isSuper = role === 'superadmin';

  const portalsHtml = portals.length
    ? `<h2>Portals</h2>` +
      portals
        .map(
          (s) => `<div class="card"><div class="row">
            <span><a href="/w/${esc(ward.id)}/space/${esc(s.id)}"><strong>${esc(s.name)}</strong></a></span>
            <span class="badge">${esc(s.kind === 'org' ? 'org' : s.kind.replace('_', ' '))}</span>
          </div></div>`,
        )
        .join('')
    : '';

  const membersHtml = isSuper
    ? `<h2>Members &amp; roles</h2>
       <p class="muted">Superadmins can manage everything in the ward (break-glass). A ward must
       keep at least one superadmin.</p>` +
      members
        .map((m) => {
          const badge = `<span class="badge ${m.role === 'superadmin' ? 'super' : ''}">${esc(m.role)}</span>`;
          const next = m.role === 'superadmin' ? 'member' : 'superadmin';
          const label = m.role === 'superadmin' ? 'Make member' : 'Make superadmin';
          return `<div class="card"><div class="row">
            <span>${esc(m.email)}${m.calling_title ? ' · ' + esc(m.calling_title) : ''}</span>
            <span>${badge}
              <form method="post" action="/w/${esc(ward.id)}/members/${esc(m.user_id)}/role" style="display:inline">
                <input type="hidden" name="role" value="${next}">
                <button class="btn sm ghost" type="submit">${label}</button></form>
            </span></div></div>`;
        })
        .join('')
    : '';

  const joinsHtml =
    isSuper && joins.length
      ? `<h2>Pending join requests</h2>` +
        joins
          .map(
            (j) => `<div class="card"><div class="row">
              <span>${esc(j.requester_email)}${j.requester_calling ? ' · ' + esc(j.requester_calling) : ''}</span>
              <form method="post" action="/w/${esc(ward.id)}/joins/${esc(j.id)}/approve">
                <button class="btn sm" type="submit">Approve</button></form>
            </div></div>`,
          )
          .join('')
      : '';

  const spaceOptions = spaces.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  const inviteForm = isSuper
    ? `<h2>Invite a leader (callings chart)</h2>
      <p class="muted">Add people by email and assign them to a space. Set presidency members
         (president / secretary) as <strong>owners</strong> of their org's space. Re-submitting the
         same email adds another space assignment.</p>
      <form method="post" action="/w/${esc(ward.id)}/invite" class="card">
        <label>Email</label><input name="email" type="email" required>
        <label>Calling (optional)</label><input name="calling" placeholder="e.g. Elders Quorum President">
        <div class="row">
          <div style="flex:1"><label>Ward role</label>
            <select name="ward_role"><option value="member">Member</option><option value="superadmin">Superadmin</option></select></div>
          <div style="flex:1"><label>Space</label><select name="space_id" required>${spaceOptions}</select></div>
          <div style="flex:1"><label>Space role</label>
            <select name="space_role"><option value="owner">Owner</option><option value="member">Member</option></select></div>
        </div>
        <button class="btn" type="submit">Create / update invite</button>
      </form>`
    : '';

  const invitesHtml =
    isSuper && invites.length
      ? `<h2>Pending invites</h2>` +
        invites
          .map((inv) => {
            const roles =
              inv.spaceRoles.map((r) => `${esc(r.space_name)} (${esc(r.role)})`).join(', ') ||
              '<span class="muted">no space yet</span>';
            const link = `${appUrl}/invite/${esc(inv.token)}`;
            return `<div class="card">
              <div class="row"><span><strong>${esc(inv.email)}</strong>${inv.calling_title ? ' · ' + esc(inv.calling_title) : ''}</span>
                <span class="badge ${inv.ward_role === 'superadmin' ? 'super' : ''}">${esc(inv.ward_role)}</span></div>
              <p class="muted">Spaces: ${roles}</p>
              <p class="muted">Accept link: <code>${link}</code></p>
            </div>`;
          })
          .join('')
      : '';

  // Ward time zone: volunteer cancel cutoffs, day-before reminders and "is over" use it.
  const tzOptions = [...COMMON_TIMEZONES];
  if (!tzOptions.some(([tz]) => tz === ward.timezone)) tzOptions.push([ward.timezone, ward.timezone]);
  const timezoneHtml = isSuper
    ? `<h2>Time zone</h2>
       <form method="post" action="/w/${esc(ward.id)}/timezone" class="inline card">
         <div style="flex:1"><label>Volunteer reminders and cutoffs use this time zone</label>
           <select name="timezone">${tzOptions
             .map(([tz, label]) => `<option value="${esc(tz)}"${tz === ward.timezone ? ' selected' : ''}>${esc(label)}</option>`)
             .join('')}</select></div>
         <button class="btn sm" type="submit">Save</button>
       </form>`
    : '';

  return layout({
    title: ward.name,
    userEmail: user.email,
    body: `<h1>${esc(ward.name)}</h1>
      <p class="muted">Your role: <span class="badge ${isSuper ? 'super' : ''}">${esc(role)}</span></p>
      ${notice ? `<div class="ok">${esc(notice)}</div>` : ''}
      ${error ? `<div class="err">${esc(error)}</div>` : ''}
      <div class="card">
        <p>Public portal: <a href="/p/${esc(ward.prefix)}">/p/${esc(ward.prefix)}</a></p>
        ${
          publicPortal?.share_url
            ? `<p>Share link: <a href="${esc(safeHref(publicPortal.share_url))}" target="_blank" rel="noopener"><code>${esc(displayUrl(publicPortal.share_url))}</code></a></p>`
            : publicPortal && isSuper
              ? `<p class="muted">No share link yet. Make one on zippa.run under your prefix
                   <code>${esc(ward.prefix)}</code>, then paste it on the
                   <a href="/w/${esc(ward.id)}/space/${esc(publicPortal.id)}">Public portal page</a>.</p>`
              : ''
        }
      </div>
      <p><a class="btn" href="/w/${esc(ward.id)}/catalog">Open solutions catalog</a>${
        o.showService ? ` <a class="btn ghost" href="/w/${esc(ward.id)}/service">Service opportunities &amp; requests</a>` : ''
      }</p>
      ${portalsHtml}
      ${joinsHtml}
      ${membersHtml}
      ${timezoneHtml}
      ${inviteForm}
      ${invitesHtml}
      <p style="margin-top:1rem"><a href="/">Back to home</a></p>`,
  });
}

export function renderInviteError(
  message: string,
  opts?: { userEmail?: string | null; showSignOut?: boolean },
): string {
  return layout({
    title: 'Invitation',
    userEmail: opts?.userEmail ?? null,
    body: `<h1>Invitation</h1><div class="err">${esc(message)}</div>
      ${opts?.showSignOut ? `<p><a class="btn ghost" href="/auth/logout">Sign out</a>, then open the link again signed in as the invited account.</p>` : ''}
      <p><a href="/">Back to home</a></p>`,
  });
}
