// Leader pages for service categories: the hub (/w/:wardId/service) and a category's page
// (settings, delegates, fill warnings, Discord channel). Everything user-typed is escaped; the
// Discord webhook is never rendered, only "connected (…last 4)".
import type { SessionUser } from '../types';
import { esc } from '../lib/html';
import { AUDIENCES, AUDIENCE_LABELS, ICONS, iconSvg, parseAudiences, type CategoryFull, type CategoryRow } from '../lib/serviceCategories';
import { layout } from './layout';
import { fillBar, VOL_CSS } from './volCommon';
import { serverName, type PostFull, type PostSignupRow } from '../lib/volPosts';
import { formatWhen } from '../lib/wardTime';

export const SERVICE_CSS = `<style>
  .cat{display:flex;align-items:center;gap:.75rem}
  .cat .ico{width:40px;height:40px;flex-shrink:0}
  .cat .ico svg{width:100%;height:100%}
  .checks{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;margin:.3rem 0}
  .checks label{display:flex;align-items:center;gap:.35rem;margin:0;font-size:.92rem;color:#2c3a4a}
  .checks input{width:auto}
  .tag{font-size:.72rem;border-radius:20px;padding:.1rem .5rem;background:#eaf0fb;color:#4a6fa5}
  .tag.warn{background:#fff1d6;color:#8a5a00}
  .bigbtn{display:inline-block;padding:.85rem 1.6rem;border-radius:28px;background:#1d3557;color:#fff;
    font-size:1.05rem;text-decoration:none;margin:.4rem 0}
</style>`;

const ICON_LABELS: Record<string, string> = {
  meal: 'Meal', hand: 'Helping hand', activity: 'Activity', building: 'Building', temple: 'Temple', primary: 'Children',
  sundayschool: 'Book', moving: 'Moving truck', present: 'Present', other: 'Question mark',
};

function iconSelect(current: string): string {
  return `<select name="icon">${Object.keys(ICONS)
    .map((k) => `<option value="${esc(k)}"${k === current ? ' selected' : ''}>${esc(ICON_LABELS[k] ?? k)}</option>`)
    .join('')}</select>`;
}

export function audienceChecks(selected: readonly string[], name = 'audiences'): string {
  return `<div class="checks">${AUDIENCES.map(
    (a) => `<label><input type="checkbox" name="${esc(name)}" value="${a}"${selected.includes(a) ? ' checked' : ''}> ${AUDIENCE_LABELS[a]}</label>`,
  ).join('')}</div>`;
}

export function categoryChip(c: { icon: string; name: string }): string {
  return `<span class="cat"><span class="ico">${iconSvg(c.icon)}</span><strong>${esc(c.name)}</strong></span>`;
}

function flash(notice?: string, error?: string): string {
  return `${notice ? `<div class="ok">${esc(notice)}</div>` : ''}${error ? `<div class="err">${esc(error)}</div>` : ''}`;
}

// ---------------------------------------------------------------- hub

export function renderServiceHub(o: {
  user: SessionUser;
  wardId: string;
  wardName: string;
  canCreate: boolean;
  managed: CategoryRow[];
  canSeeRequests: boolean;
  addSpaces: Array<{ id: string; name: string }>;
  notice?: string;
  error?: string;
}): string {
  const w = esc(o.wardId);
  const list = o.managed.length
    ? o.managed
        .map(
          (c) => `<div class="card"><div class="row">
            <a href="/w/${w}/service/category/${esc(c.id)}" style="text-decoration:none;color:inherit">${categoryChip(c)}</a>
            <span>${c.kind === 'request' ? '<span class="tag">request</span>' : '<span class="tag">opportunity</span>'}
              ${c.confidential ? ' <span class="tag warn">confidential</span>' : ''}${c.archived ? ' <span class="tag">archived</span>' : ''}</span>
          </div></div>`,
        )
        .join('')
    : '<p class="muted">You don’t manage any service categories.</p>';
  const add = o.addSpaces.length
    ? `<details><summary>Add a category</summary>
        <form method="post" action="/w/${w}/service/category" class="card">
          <label>Kind</label>
          <select name="kind"><option value="opportunity">Service opportunity (people sign up to help)</option>
            <option value="request">Request (members ask for help)</option></select>
          <label>Name</label><input name="name" required maxlength="60" placeholder="e.g. Sew Quilts">
          <label>Picture</label>${iconSelect('other')}
          <label>Owned by</label><select name="space_id">${o.addSpaces
            .map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`)
            .join('')}</select>
          <label>Who it’s for (opportunities)</label>${audienceChecks(['brothers', 'sisters'])}
          <div class="checks"><label><input type="checkbox" name="confidential" value="1"> Confidential (requests: only the
            owners of the owning space and the people they name see them)</label></div>
          <button class="btn sm" type="submit">Add category</button>
        </form></details>`
    : '';
  return layout({
    title: 'Service',
    userEmail: o.user.email,
    head: SERVICE_CSS,
    body: `<h1>Service opportunities &amp; requests</h1>
      <p class="muted">${esc(o.wardName)} · <a href="/w/${w}">ward home</a></p>
      ${flash(o.notice, o.error)}
      ${o.canCreate ? `<p><a class="bigbtn" href="/w/${w}/vol/new">Create Service Opportunity</a></p>` : ''}
      <p>${o.canSeeRequests ? `<a class="btn sm" href="/w/${w}/requests">Requests inbox</a> ` : ''}
        <a class="btn sm ghost" href="/w/${w}/service/mine">My service opportunities</a></p>
      <h2>Categories you manage</h2>
      ${list}
      ${add}`,
  });
}

// ---------------------------------------------------------------- category page

export function renderCategoryPage(o: {
  user: SessionUser;
  wardId: string;
  cat: CategoryFull;
  candidates: Array<{ user_id: string; email: string; name: string | null }>;
  myPref: { warn_me: number; hours: number; others: string[] } | null;
  wardMembers: Array<{ user_id: string; email: string; name: string | null }>;
  opportunityCategories: CategoryRow[];
  notice?: string;
  error?: string;
}): string {
  const { cat } = o;
  const w = esc(o.wardId);
  const base = `/w/${w}/service/category/${esc(cat.id)}`;
  const isOpp = cat.kind === 'opportunity';
  const owners = cat.spaces.map((s) => esc(s.name)).join(' and ') || '<span class="muted">nobody (superadmins only)</span>';

  const settings = `<form method="post" action="${base}" class="card">
      <input type="hidden" name="op" value="save">
      <label>Name</label><input name="name" required maxlength="60" value="${esc(cat.name)}">
      <label>Picture</label>${iconSelect(cat.icon)}
      ${
        isOpp
          ? `<label>Who it’s for, by default (each post can change this)</label>${audienceChecks(parseAudiences(cat.default_audiences))}
             <div class="checks"><label><input type="checkbox" name="council_may_create" value="1"${cat.council_may_create ? ' checked' : ''}>
               Anyone on the ward council may create these</label></div>`
          : `<div class="checks"><label><input type="checkbox" name="confidential" value="1"${cat.confidential ? ' checked' : ''}>
               Confidential: only the owners of ${owners}, the people named below and superadmins see these requests</label></div>
             <label>"Turn into a service opportunity" starts in</label>
             <select name="opportunity_category_id"><option value="">(not offered)</option>${o.opportunityCategories
               .map((x) => `<option value="${esc(x.id)}"${x.id === cat.opportunity_category_id ? ' selected' : ''}>${esc(x.name)}</option>`)
               .join('')}</select>`
      }
      <button class="btn sm" type="submit" style="margin-top:.7rem">Save</button>
    </form>
    <form method="post" action="${base}">
      <input type="hidden" name="op" value="${cat.archived ? 'unarchive' : 'archive'}">
      <button class="btn sm ghost" type="submit">${cat.archived ? 'Unarchive this category' : 'Archive this category'}</button>
    </form>`;

  const delegateRows = cat.delegates.length
    ? cat.delegates
        .map(
          (d) => `<div class="row" style="padding:.25rem 0"><span>${esc(d.name ?? d.email)} <span class="muted">${esc(d.email)}</span></span>
            <form method="post" action="${base}/delegates/${esc(d.user_id)}/remove" style="display:inline">
              <button class="btn sm ghost danger" type="submit">Remove</button></form></div>`,
        )
        .join('')
    : '<p class="muted">No one yet.</p>';
  const delegates = `<h2>${isOpp ? 'Coordinators' : 'People who help with these requests'}</h2>
    <div class="card">
      <p class="muted" style="margin-top:0">${
        isOpp
          ? 'Coordinators create this category’s opportunities, see and manage all of them, and get its messages instead of you.'
          : 'They see this category’s requests and get the "new request" emails.'
      }</p>
      ${delegateRows}
      ${
        o.candidates.length
          ? `<form method="post" action="${base}/delegates" class="inline" style="margin-top:.6rem">
               <select name="user_id" style="width:auto">${o.candidates
                 .map((m) => `<option value="${esc(m.user_id)}">${esc(m.name ?? m.email)} (${esc(m.email)})</option>`)
                 .join('')}</select>
               <button class="btn sm" type="submit">Add</button></form>`
          : ''
      }
      <form method="post" action="${base}/delegates" class="inline" style="margin-top:.6rem">
        <div style="flex:1"><label>Or invite by email (they join the ward as a member)</label>
          <input type="email" name="email" required maxlength="200" placeholder="name@example.com"></div>
        <button class="btn sm" type="submit">Invite</button></form>
    </div>`;

  const p = o.myPref;
  const warnings = isOpp
    ? `<h2>Warnings when an opportunity may not fill</h2>
      <form method="post" action="${base}/warnings" class="card">
        <p class="muted" style="margin-top:0">Your own choice. Coordinators are always warned.</p>
        <div class="checks"><label><input type="checkbox" name="warn_me" value="1"${!p || p.warn_me ? ' checked' : ''}> Warn me</label></div>
        <label>How many hours before a date starts</label>
        <input name="hours" inputmode="numeric" value="${p ? p.hours : 48}" style="width:8rem">
        <label>Others to warn</label>
        <select name="others" multiple size="5">${o.wardMembers
          .filter((m) => m.user_id !== o.user.id)
          .map((m) => `<option value="${esc(m.user_id)}"${p?.others.includes(m.user_id) ? ' selected' : ''}>${esc(m.name ?? m.email)} (${esc(m.email)})</option>`)
          .join('')}</select>
        <button class="btn sm" type="submit" style="margin-top:.7rem">Save warnings</button>
      </form>`
    : '';

  const discord = isOpp
    ? `<h2>Discord channel</h2>
      <div class="card">
        ${
          cat.has_webhook
            ? `<p>Discord channel connected (…${esc(cat.webhook_tail ?? '')}).</p>
               <form method="post" action="${base}/discord"><input type="hidden" name="clear" value="1">
                 <button class="btn sm ghost danger" type="submit">Disconnect</button></form>`
            : '<p class="muted" style="margin-top:0">Paste a channel webhook (Server Settings → Integrations → Webhooks) to announce new opportunities there.</p>'
        }
        <form method="post" action="${base}/discord" class="inline" style="margin-top:.6rem">
          <div style="flex:1"><label>${cat.has_webhook ? 'Replace the webhook' : 'Webhook link'}</label>
            <input name="webhook_url" autocomplete="off" placeholder="https://discord.com/api/webhooks/…"></div>
          <button class="btn sm" type="submit">Save</button></form>
      </div>`
    : '';

  return layout({
    title: cat.name,
    userEmail: o.user.email,
    head: SERVICE_CSS,
    body: `<p class="muted"><a href="/w/${w}/service">Service</a> · <a href="/w/${w}">ward home</a></p>
      <h1>${categoryChip(cat)}</h1>
      <p class="muted">${isOpp ? 'Service opportunities' : 'Requests'} · owned by ${owners}
        ${cat.confidential ? ' · <span class="tag warn">confidential</span>' : ''}${cat.archived ? ' · <span class="tag">archived</span>' : ''}</p>
      ${flash(o.notice, o.error)}
      ${settings}
      ${delegates}
      ${warnings}
      ${discord}`,
  });
}

// ---------------------------------------------------------------- My service opportunities

export interface MineItem {
  post: PostFull;
  signups: PostSignupRow[];
  past: boolean;
  warnings: Array<{ date_id: string; n: number; last: string }>;
}

function mineCard(wardId: string, it: MineItem): string {
  const p = it.post;
  const manage = `/w/${esc(wardId)}/vol/${esc(p.id)}`;
  const waitingApproval = it.signups.filter((s) => s.status === 'waiting' && s.approval === 'pending').length;
  const dates = p.dates
    .map((d) => {
      const warn = it.warnings.find((w) => w.date_id === d.id);
      const roles = d.roles
        .map((r) => {
          const people = it.signups.filter((s) => s.role_id === r.id);
          return `<div class="role"><div class="row"><strong>${esc(r.name)}</strong></div>
            ${fillBar(r.confirmed, r.needed, r.waiting)}
            ${people.length ? `<p class="muted" style="margin:.2rem 0">${people
              .map((s) => `${esc(serverName(s.name, s.child_name))}${s.status === 'waiting' ? ' (waiting)' : ''}`)
              .join(', ')}</p>` : ''}</div>`;
        })
        .join('');
      return `<div style="margin-top:.6rem"><strong>${esc(formatWhen(d.date, d.start_time))}</strong>
        ${warn ? ` <span class="tag warn">fill warning sent ${esc(warn.last.slice(0, 10))}</span>` : ''}
        ${roles || '<p class="muted">No roles yet.</p>'}</div>`;
    })
    .join('');
  return `<div class="card">
    <div class="row"><a href="${manage}"><strong>${esc(p.title)}</strong></a>
      <span class="muted">${esc(p.category_name ?? p.org_name)}</span></div>
    ${waitingApproval ? `<p><a class="tag warn" href="${manage}">${waitingApproval} waiting for approval</a></p>` : ''}
    ${dates || '<p class="muted">No dates yet.</p>'}
    <p style="margin-bottom:0"><a class="btn sm ghost" href="${manage}">Manage</a></p>
  </div>`;
}

export function renderServiceMine(o: { user: SessionUser; wardId: string; wardName: string; items: MineItem[] }): string {
  const w = esc(o.wardId);
  const upcoming = o.items.filter((i) => !i.past);
  const past = o.items.filter((i) => i.past);
  return layout({
    title: 'My service opportunities',
    userEmail: o.user.email,
    head: VOL_CSS + SERVICE_CSS,
    body: `<h1>My service opportunities</h1>
      <p class="muted">${esc(o.wardName)} · <a href="/w/${w}/service">Service</a> · <a href="/w/${w}">ward home</a></p>
      ${o.items.length ? '' : '<div class="card"><p>Nothing yet. Opportunities you create, and every one in a category you coordinate, show here.</p></div>'}
      ${upcoming.map((i) => mineCard(o.wardId, i)).join('')}
      ${past.length ? `<details id="mine-past"><summary>Past (${past.length})</summary>${past.map((i) => mineCard(o.wardId, i)).join('')}</details>` : ''}`,
  });
}
