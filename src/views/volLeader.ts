// Leader-facing volunteer pages and the volunteer sections on space pages. Everything user-
// typed is escaped; notes render with mdLite.
import type { SessionUser } from '../types';
import { esc, mdLite } from '../lib/html';
import type { EditorRow } from '../lib/volEditors';
import type { PostFull, PostSignupRow, DateFull, RoleFull, PostSummary } from '../lib/volPosts';
import { serverName, whenText } from '../lib/volPosts';
import { AUDIENCE_LABELS, parseAudiences, type CategoryFull, type CategoryRow } from '../lib/serviceCategories';
import { audienceChecks, categoryChip, SERVICE_CSS } from './service';
import { formatWhen } from '../lib/wardTime';
import { layout } from './layout';
import { fillBar, VOL_CSS } from './volCommon';

export function renderEditorsCard(o: {
  wardId: string;
  spaceId: string;
  editors: EditorRow[];
  canManage: boolean;
  candidates: Array<{ user_id: string; email: string; name: string | null }>;
}): string {
  const base = `/w/${esc(o.wardId)}/space/${esc(o.spaceId)}`;
  const rows = o.editors.length
    ? o.editors
        .map(
          (e) => `<div class="row" style="padding:.25rem 0">
            <span>${esc(e.name ?? e.email)} <span class="muted">${esc(e.email)}</span>${e.owner ? ' <span class="badge">owner</span>' : ''}</span>
            ${
              o.canManage && !e.owner
                ? `<form method="post" action="${base}/vol-editors/${esc(e.user_id)}/remove" style="display:inline">
                     <button class="btn sm ghost danger" type="submit">Remove</button></form>`
                : ''
            }
          </div>`,
        )
        .join('')
    : '<p class="muted">No one yet. The organization&#39;s owners are always on this list.</p>';
  const add =
    o.canManage && o.candidates.length
      ? `<form method="post" action="${base}/vol-editors" class="inline" style="margin-top:.6rem">
           <select name="user_id" style="width:auto">${o.candidates
             .map((m) => `<option value="${esc(m.user_id)}">${esc(m.name ?? m.email)} (${esc(m.email)})</option>`)
             .join('')}</select>
           <button class="btn sm" type="submit">Add</button>
         </form>`
      : '';
  return `<h2>Who can manage volunteer posts</h2>
    <div class="card">
      <p class="muted" style="margin-top:0">These people can create, edit and remove this organization&#39;s
        volunteer posts, approve first-time volunteers, and get its volunteer emails. The Bishopric
        can manage every organization&#39;s posts.</p>
      ${rows}${add}
    </div>`;
}

// ---------------------------------------------------------------- new post

export interface NewPostValues {
  category_id?: string;
  audiences?: string[];
  space_id?: string;
  title?: string;
  public_note?: string;
  private_details?: string;
  cancel_cutoff_hours?: string;
  first_date?: string;
  start_time?: string;
  role_name?: string;
  role_needed?: string;
}

// Step 1 of "Create Service Opportunity": pick a category (only those you may create in).
export function renderCategoryPicker(o: {
  user: SessionUser;
  wardId: string;
  wardName: string;
  categories: CategoryRow[];
}): string {
  const w = esc(o.wardId);
  return layout({
    title: 'Create Service Opportunity',
    userEmail: o.user.email,
    head: VOL_CSS + SERVICE_CSS,
    body: `<h1>Create Service Opportunity</h1>
      <p class="muted">${esc(o.wardName)} · <a href="/w/${w}">ward home</a></p>
      <p>What kind of help is needed?</p>
      ${o.categories
        .map(
          (cat) => `<a class="card" href="/w/${w}/vol/new?category=${esc(cat.id)}" style="display:block;text-decoration:none;color:inherit">
            ${categoryChip(cat)}</a>`,
        )
        .join('')}`,
  });
}

// Step 2: the post builder, prefilled from the category.
export function renderPostNew(o: {
  user: SessionUser;
  wardId: string;
  wardName: string;
  category: CategoryFull;
  spaces: Array<{ id: string; name: string }>; // the category's owning spaces (yours first)
  values: NewPostValues;
  error?: string;
}): string {
  const v = o.values;
  const space =
    o.spaces.length > 1
      ? `<label>Organization</label><select name="space_id">${o.spaces
          .map((s) => `<option value="${esc(s.id)}"${s.id === v.space_id ? ' selected' : ''}>${esc(s.name)}</option>`)
          .join('')}</select>`
      : `<input type="hidden" name="space_id" value="${esc(o.spaces[0]?.id ?? '')}">
         <p class="muted" style="margin:.2rem 0">For ${esc(o.spaces[0]?.name ?? '')}</p>`;
  return layout({
    title: 'Create Service Opportunity',
    userEmail: o.user.email,
    head: VOL_CSS + SERVICE_CSS,
    body: `<h1>Create Service Opportunity</h1>
      <p class="muted">${esc(o.wardName)} · <a href="/w/${esc(o.wardId)}/vol/new">pick another kind</a> · <a href="/w/${esc(o.wardId)}">ward home</a></p>
      <p>${categoryChip(o.category)}</p>
      ${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
      <form method="post" action="/w/${esc(o.wardId)}/vol" class="card">
        <input type="hidden" name="category_id" value="${esc(o.category.id)}">
        ${space}
        <label>Who it’s for (pick at least one)</label>
        ${audienceChecks(v.audiences ?? [])}
        <label>Title</label>
        <input name="title" required maxlength="120" value="${esc(v.title ?? '')}" placeholder="e.g. Help the Jensens move in">
        <label>Public note (anyone with the link sees this)</label>
        <textarea name="public_note" rows="3" maxlength="4000" placeholder="e.g. Wear closed-toe shoes; donuts provided.">${esc(v.public_note ?? '')}</textarea>
        <label>Private details (only confirmed volunteers on this post and leaders see these)</label>
        <textarea name="private_details" rows="3" maxlength="4000" placeholder="Address, door code, allergies…">${esc(v.private_details ?? '')}</textarea>
        <div class="row">
          <div style="flex:1"><label>First date</label><input type="date" name="first_date" required value="${esc(v.first_date ?? '')}"></div>
          <div style="flex:1"><label>Start time (optional)</label><input type="time" name="start_time" value="${esc(v.start_time ?? '')}"></div>
        </div>
        <div class="row">
          <div style="flex:2"><label>First helper role (optional)</label><input name="role_name" maxlength="80" value="${esc(v.role_name ?? '')}" placeholder="e.g. Movers"></div>
          <div style="flex:1"><label>How many</label><input type="number" name="role_needed" min="1" max="500" value="${esc(v.role_needed ?? '')}"></div>
        </div>
        <label>Cancel cutoff (hours before it starts)</label>
        <input type="number" name="cancel_cutoff_hours" min="0" max="336" value="${esc(v.cancel_cutoff_hours ?? '24')}">
        <p class="muted" style="margin:.3rem 0">After this, cancelling still works but you get an urgent email.</p>
        <button class="btn" type="submit">Create post</button>
      </form>`,
  });
}

function audiencesLine(post: { audiences: string }): string {
  return parseAudiences(post.audiences).map((a) => AUDIENCE_LABELS[a]).join(', ');
}

// ---------------------------------------------------------------- manage page

function statusTag(s: PostSignupRow): string {
  if (s.status === 'waiting') {
    return s.approval === 'none' || !s.email_verified_at
      ? '<span class="tag warn">waiting for address confirmation</span>'
      : '<span class="tag warn">waiting for approval</span>';
  }
  return s.over_limit ? '<span class="tag">confirmed · over the limit</span>' : '<span class="tag ok">confirmed</span>';
}

function roleForm(action: string, r: Partial<RoleFull>, label: string): string {
  return `<form method="post" action="${action}" class="card" style="margin:.5rem 0">
    <div class="row">
      <div style="flex:2"><label>Role name</label><input name="name" required maxlength="80" value="${esc(r.name ?? '')}"></div>
      <div style="flex:1"><label>How many</label><input type="number" name="needed" min="1" max="500" required value="${esc(String(r.needed ?? ''))}"></div>
    </div>
    <div class="row">
      <div style="flex:1"><label>Start (optional)</label><input type="time" name="start_time" value="${esc(r.start_time ?? '')}"></div>
      <div style="flex:1"><label>End (optional)</label><input type="time" name="end_time" value="${esc(r.end_time ?? '')}"></div>
    </div>
    <label>Note (optional, public)</label><input name="note" maxlength="4000" value="${esc(r.note ?? '')}">
    <label>"What are you bringing?" prompt (optional; answers are public, names are not)</label>
    <input name="bring_prompt" maxlength="200" value="${esc(r.bring_prompt ?? '')}">
    <button class="btn sm" type="submit" style="margin-top:.6rem">${esc(label)}</button>
  </form>`;
}

function renderRole(
  base: string,
  wardId: string,
  d: DateFull,
  r: RoleFull,
  signups: PostSignupRow[],
  canEdit: boolean,
): string {
  const list = signups.length
    ? `<ul style="margin:.4rem 0 0 1.1rem">${signups
        .map((s) => {
          const approve =
            canEdit && s.status === 'waiting' && s.approval === 'pending'
              ? ` <form method="post" action="/w/${esc(wardId)}/vol/volunteer/${esc(s.volunteer_id)}/approve" style="display:inline"><button class="btn sm" type="submit">Approve</button></form>
                  <form method="post" action="/w/${esc(wardId)}/vol/volunteer/${esc(s.volunteer_id)}/decline" style="display:inline"><button class="btn sm ghost danger" type="submit">Decline</button></form>`
              : '';
          const remove = canEdit
            ? ` <form method="post" action="/w/${esc(wardId)}/vol/signup/${esc(s.id)}/remove" style="display:inline"><button class="btn sm ghost" type="submit">Remove</button></form>`
            : '';
          // Emails only for those who approve/manage (they check the directory); viewers see names.
          return `<li><strong>${esc(serverName(s.name, s.child_name))}</strong>${canEdit ? ` <span class="muted">${esc(s.email)}</span>` : ''}
            ${s.bringing ? ` · bringing ${esc(s.bringing)}` : ''} ${statusTag(s)}${approve}${remove}</li>`;
        })
        .join('')}</ul>`
    : '<p class="muted" style="margin:.3rem 0">No one yet.</p>';
  const edit = canEdit
    ? `<details><summary>Edit role</summary>${roleForm(`${base}/role/${esc(r.id)}`, r, 'Save role')}
         <form method="post" action="${base}/role/${esc(r.id)}/delete"><button class="btn sm ghost danger" type="submit">Delete this role</button></form>
       </details>`
    : '';
  return `<div class="role">
    <div class="row"><strong>${esc(r.name)}</strong><span class="muted">${esc(whenText(d, r))}</span></div>
    ${fillBar(r.confirmed, r.needed, r.waiting)}
    ${r.note ? `<div class="muted">${mdLite(r.note)}</div>` : ''}
    ${r.bring_prompt ? `<p class="muted">Asks: ${esc(r.bring_prompt)}</p>` : ''}
    ${list}
    ${edit}
  </div>`;
}

export function renderPostManage(o: {
  user: SessionUser;
  post: PostFull;
  signups: PostSignupRow[];
  canEdit: boolean;
  publicUrl: string;
  notice?: string;
  error?: string;
}): string {
  const { post, canEdit } = o;
  const wardId = post.ward_id;
  const base = `/w/${esc(wardId)}/vol/${esc(post.id)}`;
  const totalNeeded = post.dates.reduce((a, d) => a + d.roles.reduce((b, r) => b + r.needed, 0), 0);
  const totalConfirmed = post.dates.reduce((a, d) => a + d.roles.reduce((b, r) => b + r.confirmed, 0), 0);
  const totalWaiting = post.dates.reduce((a, d) => a + d.roles.reduce((b, r) => b + r.waiting, 0), 0);

  const editPost = canEdit
    ? `<details><summary>Edit post</summary>
        <form method="post" action="${base}" class="card">
          <label>Title</label><input name="title" required maxlength="120" value="${esc(post.title)}">
          <label>Public note</label><textarea name="public_note" rows="3" maxlength="4000">${esc(post.public_note ?? '')}</textarea>
          <label>Private details</label><textarea name="private_details" rows="3" maxlength="4000">${esc(post.private_details ?? '')}</textarea>
          <label>Cancel cutoff (hours before it starts)</label>
          <input type="number" name="cancel_cutoff_hours" min="0" max="336" value="${post.cancel_cutoff_hours}">
          <input type="hidden" name="audiences_form" value="1">
          <label>Who it’s for (at least one)</label>
          ${audienceChecks(parseAudiences(post.audiences))}
          <button class="btn sm" type="submit" style="margin-top:.6rem">Save</button>
        </form></details>`
    : '';

  const dates = post.dates
    .map((d) => {
      const roles = d.roles
        .map((r) => renderRole(base, wardId, d, r, o.signups.filter((s) => s.role_id === r.id), canEdit))
        .join('');
      const dateControls = canEdit
        ? `<details><summary>Add a role</summary>${roleForm(`${base}/date/${esc(d.id)}/role`, {}, 'Add role')}</details>
           <details><summary>Change, copy or delete this date</summary>
             <form method="post" action="${base}/date/${esc(d.id)}" class="inline card">
               <div><label>Date</label><input type="date" name="date" required value="${esc(d.date)}"></div>
               <div><label>Start time</label><input type="time" name="start_time" value="${esc(d.start_time ?? '')}"></div>
               <button class="btn sm" type="submit">Save date</button></form>
             <form method="post" action="${base}/date/${esc(d.id)}/copy" class="inline card">
               <div><label>Copy this date's roles to</label><input type="date" name="date" required></div>
               <button class="btn sm" type="submit">Copy date</button></form>
             <form method="post" action="${base}/date/${esc(d.id)}/delete"><button class="btn sm ghost danger" type="submit">Delete this date</button></form>
           </details>`
        : '';
      return `<div class="card"><h3>${esc(formatWhen(d.date, d.start_time))}</h3>
        ${roles || '<p class="muted">No roles yet.</p>'}${dateControls}</div>`;
    })
    .join('');

  const addDate = canEdit
    ? `<form method="post" action="${base}/date" class="inline card">
         <div><label>Add a date</label><input type="date" name="date" required></div>
         <div><label>Start time</label><input type="time" name="start_time"></div>
         <button class="btn sm" type="submit">Add date</button></form>`
    : '';

  const postActions = canEdit
    ? `<h2>Copy or remove</h2>
       <form method="post" action="${base}/copy" class="inline card">
         <div><label>Copy as a new post starting</label><input type="date" name="new_first_date" required></div>
         <button class="btn sm" type="submit">Copy post</button></form>
       <p><a class="btn sm ghost danger" href="${base}/delete">Delete this post…</a></p>`
    : '';

  return layout({
    title: post.title,
    userEmail: o.user.email,
    head: VOL_CSS,
    body: `<h1>${esc(post.title)}</h1>
      <p class="muted">${post.category_name ? `${esc(post.category_name)} · ` : ''}${esc(post.org_name)} · for ${esc(audiencesLine(post))}
        · <a href="/w/${esc(wardId)}/space/${esc(post.space_id)}">organization page</a>
        · <a href="/w/${esc(wardId)}">ward home</a></p>
      ${o.notice ? `<div class="ok">${esc(o.notice)}</div>` : ''}
      ${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
      <div class="card">
        <label style="margin-top:0">Public link — share it by email or Discord</label>
        <input readonly value="${esc(o.publicUrl)}" onclick="this.select()">
        <p class="muted" style="margin:.4rem 0 0">Anyone with the link sees counts and what's being brought, never names or private details.
          <a href="${esc(o.publicUrl)}" target="_blank" rel="noopener">Open public page</a></p>
        ${canEdit ? `<p style="margin:.6rem 0 0"><a class="btn sm" href="${base}/invite">Invite people by email</a></p>` : ''}
        ${fillBar(totalConfirmed, totalNeeded, totalWaiting)}
        <p class="muted">Cancel cutoff: ${post.cancel_cutoff_hours} hour${post.cancel_cutoff_hours === 1 ? '' : 's'} before it starts
          (after that, cancelling still works but you get an urgent email).</p>
      </div>
      ${post.public_note ? `<div class="card"><strong>Public note</strong>${mdLite(post.public_note)}</div>` : ''}
      ${post.private_details ? `<div class="card"><strong>Private details</strong><p class="pre">${esc(post.private_details)}</p></div>` : ''}
      ${editPost}
      <h2>Dates and roles</h2>
      ${dates || '<p class="muted">No dates yet.</p>'}
      ${addDate}
      ${postActions}`,
  });
}

export function renderPostDeleteConfirm(o: { user: SessionUser; post: PostFull; confirmed: number }): string {
  const base = `/w/${esc(o.post.ward_id)}/vol/${esc(o.post.id)}`;
  return layout({
    title: 'Delete post',
    userEmail: o.user.email,
    body: `<h1>Delete “${esc(o.post.title)}”?</h1>
      <div class="card">
        <p>This removes the post, its dates and roles, and every sign-up on it. It can't be undone.
        ${o.confirmed ? `The ${o.confirmed} confirmed volunteer${o.confirmed === 1 ? '' : 's'} on upcoming dates will get an email saying they're no longer needed.` : ''}</p>
        <form method="post" action="${base}/delete"><button class="btn danger" type="submit">Delete post</button>
          <a class="btn ghost" href="${base}">Keep it</a></form>
      </div>`,
  });
}

// ---------------------------------------------------------------- ward volunteers (Bishopric)

export interface WardVolunteerRow {
  id: string;
  name: string;
  email: string;
  approval: string;
  email_verified_at: string | null;
  decided_at: string | null;
  active: number;
}

export function renderWardVolunteers(o: {
  user: SessionUser;
  wardId: string;
  wardName: string;
  volunteers: WardVolunteerRow[];
  notice?: string;
}): string {
  const act = (id: string, what: string, label: string, cls = 'btn sm ghost') =>
    `<form method="post" action="/w/${esc(o.wardId)}/vol/volunteer/${esc(id)}/${what}" style="display:inline">
       <button class="${cls}" type="submit">${esc(label)}</button></form>`;
  const section = (title: string, rows: WardVolunteerRow[], actions: (v: WardVolunteerRow) => string, empty: string) =>
    `<h2>${esc(title)}</h2>${
      rows.length
        ? rows
            .map(
              (v) => `<div class="card"><div class="row">
                <span><strong>${esc(v.name)}</strong> <span class="muted">${esc(v.email)}</span>
                  ${v.active ? `<span class="muted">· ${v.active} active sign-up${v.active === 1 ? '' : 's'}</span>` : ''}</span>
                <span>${actions(v)}</span></div></div>`,
            )
            .join('')
        : `<p class="muted">${esc(empty)}</p>`
    }`;
  const pending = o.volunteers.filter((v) => v.approval === 'pending');
  const unverified = o.volunteers.filter((v) => v.approval === 'none');
  const approved = o.volunteers.filter((v) => v.approval === 'approved');
  const declined = o.volunteers.filter((v) => v.approval === 'declined');
  return layout({
    title: 'Volunteers',
    userEmail: o.user.email,
    body: `<h1>Volunteers</h1>
      <p class="muted">${esc(o.wardName)} · <a href="/w/${esc(o.wardId)}">ward home</a></p>
      ${o.notice ? `<div class="ok">${esc(o.notice)}</div>` : ''}
      <p class="muted">Check each person against the ward's directory yourself before approving; one
        approval covers the whole ward. WardForward stores only the name and email they typed.</p>
      ${section('Waiting for approval', pending, (v) => act(v.id, 'approve', 'Approve', 'btn sm') + act(v.id, 'decline', 'Decline', 'btn sm ghost danger'), 'No one is waiting.')}
      ${section('Address not confirmed yet', unverified, (v) => act(v.id, 'decline', 'Decline', 'btn sm ghost danger'), 'None.')}
      ${section('Approved', approved, (v) => act(v.id, 'revoke', 'Revoke approval', 'btn sm ghost danger'), 'None yet.')}
      ${section('Declined', declined, (v) => act(v.id, 'undo-decline', 'Undo decline'), 'None.')}`,
  });
}

// ---------------------------------------------------------------- space-page section (spec §6.7)

function postRow(wardId: string, p: PostSummary, o: { showOrg: boolean; copy: boolean }): string {
  const when = p.first_date
    ? formatWhen(p.first_date, null) + (p.last_date && p.last_date !== p.first_date ? ` – ${formatWhen(p.last_date, null)}` : '')
    : 'No dates yet';
  const copy = o.copy
    ? `<form method="post" action="/w/${esc(wardId)}/vol/${esc(p.id)}/copy" class="inline" style="margin-top:.4rem">
         <div><label>Copy as new post starting</label><input type="date" name="new_first_date" required></div>
         <button class="btn sm ghost" type="submit">Copy</button></form>`
    : '';
  return `<div class="card${p.short_soon ? ' short' : ''}">
    <div class="row"><a href="/w/${esc(wardId)}/vol/${esc(p.id)}"><strong>${esc(p.title)}</strong></a>
      <span class="muted">${o.showOrg ? `${esc(p.org_name)} · ` : ''}${esc(when)}</span></div>
    ${fillBar(p.confirmed, p.needed, p.waiting)}
    ${p.short_soon ? ' <span class="tag warn">short and soon</span>' : ''}
    ${copy}
  </div>`;
}

export function renderVolunteerSection(o: {
  wardId: string;
  open: PostSummary[];
  past: PostSummary[];
  newPostHref: string | null; // set when the viewer may create a service opportunity here
  canCopy: (p: PostSummary) => boolean;
  showVolunteersLink: boolean;
  wardWide: boolean; // ward council / bishopric pages group by organization
}): string {
  const actions = [
    o.newPostHref ? `<a class="btn sm" href="${esc(o.newPostHref)}">Create Service Opportunity</a>` : '',
    o.showVolunteersLink ? `<a class="btn sm ghost" href="/w/${esc(o.wardId)}/volunteers">Volunteers &amp; approvals</a>` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const shortSoon = o.open.filter((p) => p.short_soon);
  const rest = o.open.filter((p) => !p.short_soon);
  let restHtml: string;
  if (!rest.length) restHtml = shortSoon.length ? '' : '<p class="muted">No open volunteer posts.</p>';
  else if (o.wardWide) {
    const orgs = [...new Set(rest.map((p) => p.org_name))].sort();
    restHtml = orgs
      .map((org) => `<h3>${esc(org)}</h3>${rest.filter((p) => p.org_name === org).map((p) => postRow(o.wardId, p, { showOrg: false, copy: false })).join('')}`)
      .join('');
  } else {
    restHtml = rest.map((p) => postRow(o.wardId, p, { showOrg: false, copy: false })).join('');
  }
  const past = o.past.length
    ? `<details id="vol-past"><summary>Past (${o.past.length})</summary>${o.past
        .map((p) => postRow(o.wardId, p, { showOrg: o.wardWide, copy: o.canCopy(p) }))
        .join('')}</details>`
    : '<div id="vol-past"></div>';
  return `${VOL_CSS}<section id="volunteer-posts">
    <h2>Volunteer posts</h2>
    ${actions ? `<p>${actions}</p>` : ''}
    ${
      shortSoon.length
        ? `<h3>Short and soon</h3><p class="muted" style="margin-top:0">Still need help within the next 14 days.</p>
           ${shortSoon.map((p) => postRow(o.wardId, p, { showOrg: o.wardWide, copy: false })).join('')}`
        : ''
    }
    <div id="vol-open">${restHtml}</div>
    ${past}
  </section>`;
}
