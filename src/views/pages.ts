import type { SessionUser } from '../types';
import type { UserWard } from '../lib/users';
import type { WorkspaceRequest, WardRow } from '../lib/wards';
import { esc, go4Url, GO4_HOST } from '../lib/html';
import { layout } from './layout';

export function renderSignedOut(): string {
  return layout({
    title: 'Sign in',
    body: `<h1>Welcome to Wardest</h1>
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
              <span class="muted">go4.cc/${esc(w.prefix)}</span></span>
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
        <input name="unit_number" required placeholder="LDS unit number" maxlength="40">
        <label>Your calling</label>
        <input name="calling" placeholder="e.g. Executive Secretary" maxlength="80">
        <label>Your email</label>
        <input value="${esc(user.email)}" readonly>
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

export function renderOperatorConsole(
  user: SessionUser,
  requests: WorkspaceRequest[],
  error?: string,
): string {
  const rows = requests.length
    ? requests
        .map(
          (r) => `<div class="card">
            <div class="row"><span><strong>${esc(r.ward_name ?? '(unnamed)')}</strong>
              <span class="muted">unit ${esc(r.unit_number)}</span></span></div>
            <p class="muted">${esc(r.requester_email)}${r.requester_calling ? ' · ' + esc(r.requester_calling) : ''}</p>
            <form class="inline" method="post" action="/operator/requests/${esc(r.id)}/approve">
              <div><label>Assign prefix</label>
                <input name="prefix" required pattern="[a-z0-9]{2,12}" placeholder="e.g. p4" style="width:8rem"></div>
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
      ${error ? `<div class="err">${esc(error)}</div>` : ''}
      <h2>Pending workspace requests</h2>${rows}
      <p style="margin-top:1rem"><a href="/">Back to home</a></p>`,
  });
}

export function renderWardPage(
  user: SessionUser,
  ward: WardRow,
  role: string,
  joins: WorkspaceRequest[],
  notice?: string,
): string {
  const isSuper = role === 'superadmin';
  const joinsHtml =
    isSuper && joins.length
      ? `<h2>Pending join requests</h2>` +
        joins
          .map(
            (j) => `<div class="card"><div class="row">
              <span>${esc(j.requester_email)}${j.requester_calling ? ' · ' + esc(j.requester_calling) : ''}</span>
              <form method="post" action="/w/${esc(ward.id)}/joins/${esc(j.id)}/approve">
                <button class="btn sm" type="submit">Approve</button>
              </form>
            </div></div>`,
          )
          .join('')
      : '';
  return layout({
    title: ward.name,
    userEmail: user.email,
    body: `<h1>${esc(ward.name)}</h1>
      <p class="muted">Your role: <span class="badge ${isSuper ? 'super' : ''}">${esc(role)}</span></p>
      ${notice ? `<div class="ok">${esc(notice)}</div>` : ''}
      <div class="card">
        <p>Public portal: <a href="/p/${esc(ward.prefix)}">/p/${esc(ward.prefix)}</a></p>
        <p>Short link: <code>${esc(GO4_HOST)}/${esc(ward.prefix)}</code>
           (<a href="${esc(go4Url(ward.prefix))}">open</a>)</p>
      </div>
      ${joinsHtml}
      <h2>Onboarding</h2>
      <p class="muted">Callings chart &amp; invites arrive in the next build step.</p>
      <p style="margin-top:1rem"><a href="/">Back to home</a></p>`,
  });
}
