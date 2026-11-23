// Leaders' requests inbox and a request's page (spec §6.2). Only reached after
// serviceAccess.canSeeRequest; everything user-typed is escaped.
import type { SessionUser } from '../types';
import { esc } from '../lib/html';
import { iconSvg } from '../lib/serviceCategories';
import { REQUEST_STATUSES, STATUS_LABELS, type InboxRow, type RequestRow } from '../lib/serviceRequests';
import { formatWhen } from '../lib/wardTime';
import { layout } from './layout';
import { SERVICE_CSS } from './service';

function day(iso: string | null): string {
  if (!iso) return '';
  return formatWhen(iso.slice(0, 10), null);
}

export function renderInbox(o: {
  user: SessionUser;
  wardId: string;
  wardName: string;
  rows: InboxRow[];
  status: string;
}): string {
  const w = esc(o.wardId);
  const filters = ['', ...REQUEST_STATUSES]
    .map((s) => {
      const label = s ? STATUS_LABELS[s]! : 'All';
      return s === o.status
        ? `<strong>${esc(label)}</strong>`
        : `<a href="/w/${w}/requests${s ? `?status=${esc(s)}` : ''}">${esc(label)}</a>`;
    })
    .join(' · ');
  const rows = o.rows.length
    ? o.rows
        .map(
          (r) => `<a class="card" href="/w/${w}/requests/${esc(r.id)}" style="display:block;text-decoration:none;color:inherit">
            <div class="row"><span class="cat"><span class="ico">${iconSvg(r.category_icon)}</span>
              <span><strong>${esc(r.name)}</strong><br><span class="muted">${esc(r.category_name)} · ${esc(day(r.verified_at ?? r.created_at))}</span></span></span>
              <span><span class="tag${r.status === 'new' ? ' warn' : ''}">${esc(STATUS_LABELS[r.status] ?? r.status)}</span>
                ${r.assigned_name ? `<span class="muted"> · ${esc(r.assigned_name)}</span>` : ''}</span></div></a>`,
        )
        .join('')
    : '<p class="muted">No requests.</p>';
  return layout({
    title: 'Requests',
    userEmail: o.user.email,
    head: SERVICE_CSS,
    body: `<h1>Requests</h1>
      <p class="muted">${esc(o.wardName)} · <a href="/w/${w}/service">Service</a> · <a href="/w/${w}">ward home</a></p>
      <p class="muted">Requests are deleted 30 days after they’re marked done or declined. Keep details in person.</p>
      <p>${filters}</p>
      ${rows}`,
  });
}

export function renderRequestPage(o: {
  user: SessionUser;
  wardId: string;
  req: RequestRow;
  categoryName: string;
  categoryIcon: string;
  delegates: Array<{ user_id: string; name: string | null; email: string }>;
  turnIntoHref: string | null;
  notice?: string;
  error?: string;
}): string {
  const { req } = o;
  const w = esc(o.wardId);
  const action = `/w/${w}/requests/${esc(req.id)}`;
  const closed = req.status === 'done' || req.status === 'declined';
  const facts = [
    `<strong>${esc(req.name)}</strong>`,
    `<a href="mailto:${esc(req.email)}">${esc(req.email)}</a>`,
    req.phone ? esc(req.phone) : '',
    req.moving_dir ? (req.moving_dir === 'in' ? 'Moving in' : 'Moving out') : '',
    req.preferred_date ? `Preferred date: ${esc(formatWhen(req.preferred_date, null))}` : '',
    req.christmas_for ? (req.christmas_for === 'own' ? 'For their own family' : 'For another family') : '',
  ]
    .filter(Boolean)
    .join('<br>');
  return layout({
    title: o.categoryName,
    userEmail: o.user.email,
    head: SERVICE_CSS,
    body: `<p class="muted"><a href="/w/${w}/requests">Requests</a> · <a href="/w/${w}">ward home</a></p>
      <h1 class="cat"><span class="ico">${iconSvg(o.categoryIcon)}</span>${esc(o.categoryName)}</h1>
      ${o.notice ? `<div class="ok">${esc(o.notice)}</div>` : ''}${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
      <div class="card">
        <p style="margin-top:0">${facts}</p>
        ${req.note ? `<p><em>${esc(req.note)}</em></p>` : ''}
        <p class="muted">Received ${esc(day(req.verified_at ?? req.created_at))} · ${esc(STATUS_LABELS[req.status] ?? req.status)}
          ${closed ? ' · it will be deleted 30 days after it was closed' : ''}</p>
      </div>
      ${o.turnIntoHref ? `<p><a class="btn sm ghost" href="${esc(o.turnIntoHref)}">Turn into a service opportunity</a>
        <span class="muted">Nothing from this request is copied; you write the post.</span></p>` : ''}
      <form method="post" action="${action}" class="card">
        <label>Status</label>
        <select name="status">${REQUEST_STATUSES.map(
          (s) => `<option value="${s}"${s === req.status ? ' selected' : ''}>${esc(STATUS_LABELS[s]!)}</option>`,
        ).join('')}</select>
        <label>Assigned to</label>
        <select name="assigned_user_id"><option value="">Nobody yet</option>${o.delegates
          .map((d) => `<option value="${esc(d.user_id)}"${d.user_id === req.assigned_user_id ? ' selected' : ''}>${esc(d.name ?? d.email)}</option>`)
          .join('')}</select>
        ${o.delegates.length ? '' : '<p class="muted" style="margin:.2rem 0">Add helpers on the category’s page to assign requests.</p>'}
        <label>Private note (only the people who see this request)</label>
        <input name="private_note" maxlength="200" value="${esc(req.private_note ?? '')}">
        <p class="muted" style="margin:.2rem 0">Keep details in person.</p>
        ${
          closed
            ? ''
            : `<label>Message to ${esc(req.name)} when you mark it done or declined (optional)</label>
               <textarea name="closing_message" rows="3" maxlength="500"></textarea>`
        }
        <button class="btn sm" type="submit" style="margin-top:.7rem">Save</button>
      </form>`,
  });
}
