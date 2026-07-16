import type { SessionUser } from '../types';
import type { Solution } from '../lib/solutions';
import type { Implementation } from '../lib/implementations';
import type { DeliverableRow, Publication } from '../lib/deliverables';
import type { WardRow, SpaceRow } from '../lib/wards';
import { CATEGORIES, categoryLabel } from '../lib/solutions';
import { esc, go4Url, GO4_HOST, mdLite } from '../lib/html';
import { qrSvg } from '../lib/qr';
import { layout } from './layout';

function bodyToHtml(body: string | null): string {
  return mdLite(body);
}

function statusBadge(status: string | undefined): string {
  const s = status ?? 'not_started';
  const label = s.replace(/_/g, ' ');
  const cls = s === 'implemented' ? 'super' : '';
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

// ---- Operator authoring ----

export function renderSuggestForm(user: SessionUser, ward: WardRow, error?: string): string {
  const catOptions = CATEGORIES.map((c) => `<option value="${c.key}">${esc(c.label)}</option>`).join('');
  return layout({
    title: 'Suggest a solution',
    userEmail: user.email,
    body: `<h1>Suggest a solution</h1>
      <p class="muted">${esc(ward.name)} · proposals go to the Wardest operators for review.</p>
      ${error ? `<div class="err">${esc(error)}</div>` : ''}
      <form method="post" action="/w/${esc(ward.id)}/suggest">
        <label>Title</label><input name="title" required maxlength="120">
        <label>Category</label><select name="category">${catOptions}</select>
        <label>Summary</label><input name="summary" maxlength="200">
        <label>Describe it (what it does, how it helps)</label>
        <textarea name="body" rows="6"></textarea>
        <button class="btn" type="submit">Submit for review</button>
      </form>
      <p style="margin-top:1rem"><a href="/w/${esc(ward.id)}/catalog">← catalog</a></p>`,
  });
}

export function renderOperatorSolutions(user: SessionUser, solutions: Solution[]): string {
  const submitted = solutions.filter((s) => s.status === 'submitted');
  const submittedHtml = submitted.length
    ? `<h2>Pending submissions</h2>` +
      submitted
        .map(
          (s) => `<div class="card">
            <div class="row"><span><a href="/operator/solutions/${esc(s.id)}"><strong>${esc(s.title)}</strong></a>
              <span class="muted">${esc(categoryLabel(s.category))}</span></span></div>
            ${s.summary ? `<p class="muted">${esc(s.summary)}</p>` : ''}
            <form method="post" action="/operator/solutions/${esc(s.id)}/approve" style="display:inline">
              <button class="btn sm" type="submit">Approve &amp; publish</button></form>
            <form method="post" action="/operator/solutions/${esc(s.id)}/reject" style="display:inline;margin-left:.4rem">
              <button class="btn sm ghost danger" type="submit">Reject</button></form>
          </div>`,
        )
        .join('')
    : '';

  const byCat = CATEGORIES.map((cat) => {
    const items = solutions.filter((s) => s.category === cat.key);
    if (!items.length) return '';
    const rows = items
      .map(
        (s) => `<div class="card"><div class="row">
          <span><a href="/operator/solutions/${esc(s.id)}"><strong>${esc(s.title)}</strong></a>
            <span class="muted">${esc(s.implementation_scope)}</span></span>
          <span class="badge ${s.status === 'published' ? 'super' : ''}">${esc(s.status)}</span>
        </div></div>`,
      )
      .join('');
    return `<h2>${esc(cat.label)}</h2>${rows}`;
  }).join('');
  return layout({
    title: 'Solutions',
    userEmail: user.email,
    body: `<h1>Solutions catalog</h1>
      <p><a class="btn" href="/operator/solutions/new">New solution</a>
         <a class="btn ghost" href="/operator">Operator console</a></p>
      ${submittedHtml}
      ${byCat || '<p class="muted">No solutions yet.</p>'}`,
  });
}

export function renderSolutionForm(user: SessionUser, opts: { solution?: Solution; error?: string }): string {
  const s = opts.solution;
  const action = s ? `/operator/solutions/${esc(s.id)}` : '/operator/solutions';
  const catOptions = CATEGORIES.map(
    (c) => `<option value="${c.key}" ${s?.category === c.key ? 'selected' : ''}>${esc(c.label)}</option>`,
  ).join('');
  const sel = (v: string, cur: string | undefined) => (v === cur ? 'selected' : '');
  return layout({
    title: s ? 'Edit solution' : 'New solution',
    userEmail: user.email,
    body: `<h1>${s ? 'Edit' : 'New'} solution</h1>
      ${opts.error ? `<div class="err">${esc(opts.error)}</div>` : ''}
      <form method="post" action="${action}">
        <label>Title</label><input name="title" required value="${esc(s?.title ?? '')}">
        <label>Category</label><select name="category">${catOptions}</select>
        <label>Summary</label><input name="summary" value="${esc(s?.summary ?? '')}">
        <label>How-to (plain text / markdown)</label>
        <textarea name="body" rows="8">${esc(s?.body ?? '')}</textarea>
        <label>Video URL (optional)</label><input name="video_url" value="${esc(s?.video_url ?? '')}">
        <div class="row">
          <div style="flex:1"><label>Template type</label>
            <select name="template_type">
              <option value="" ${sel('', s?.template_type ?? '')}>none</option>
              <option value="google_copy" ${sel('google_copy', s?.template_type ?? undefined)}>Google "make a copy"</option>
              <option value="file" ${sel('file', s?.template_type ?? undefined)}>File</option>
              <option value="ai_prompt" ${sel('ai_prompt', s?.template_type ?? undefined)}>AI prompt</option>
              <option value="link" ${sel('link', s?.template_type ?? undefined)}>Link</option>
              <option value="other" ${sel('other', s?.template_type ?? undefined)}>Other</option>
            </select></div>
          <div style="flex:2"><label>Template value (URL / text)</label>
            <input name="template_value" value="${esc(s?.template_value ?? '')}"></div>
        </div>
        <div class="row">
          <div style="flex:1"><label>Implementation scope</label>
            <select name="implementation_scope">
              <option value="ward_singleton" ${sel('ward_singleton', s?.implementation_scope)}>Ward (one per ward)</option>
              <option value="per_space" ${sel('per_space', s?.implementation_scope)}>Per space (each org)</option>
            </select></div>
          <div style="flex:1"><label>Status</label>
            <select name="status">
              <option value="draft" ${sel('draft', s?.status)}>Draft</option>
              <option value="published" ${sel('published', s?.status)}>Published</option>
            </select></div>
        </div>
        <button class="btn" type="submit">${s ? 'Save' : 'Create'}</button>
      </form>`,
  });
}

// ---- Ward catalog ----

export function renderCatalog(
  user: SessionUser,
  ward: WardRow,
  solutions: Solution[],
  implMap: Map<string, Implementation>,
): string {
  const sections = CATEGORIES.map((cat) => {
    const items = solutions.filter((s) => s.category === cat.key);
    if (!items.length) return '';
    const rows = items
      .map((s) => {
        const impl = implMap.get(s.id);
        const status = s.implementation_scope === 'per_space' ? '<span class="muted">per-org</span>' : statusBadge(impl?.status);
        return `<div class="card"><div class="row">
          <span><a href="/w/${esc(ward.id)}/s/${esc(s.id)}"><strong>${esc(s.title)}</strong></a>
            ${s.summary ? `<br><span class="muted">${esc(s.summary)}</span>` : ''}</span>
          ${status}
        </div></div>`;
      })
      .join('');
    return `<details open><summary><strong>${esc(cat.label)}</strong></summary>${rows}</details>`;
  }).join('');
  return layout({
    title: `${ward.name} — Catalog`,
    userEmail: user.email,
    body: `<h1>Solutions catalog</h1>
      <p class="muted">${esc(ward.name)} · <a href="/w/${esc(ward.id)}">ward home</a></p>
      <p><a class="btn ghost" href="/w/${esc(ward.id)}/suggest">Suggest a solution</a></p>
      ${sections || '<p class="muted">No published solutions yet.</p>'}`,
  });
}

// ---- Solution detail / tracker ----

export function renderSolutionDetail(o: {
  user: SessionUser;
  ward: WardRow;
  solution: Solution;
  spaces: SpaceRow[];
  spaceId: string | null;
  impl: Implementation | null;
  deliverables: DeliverableRow[];
  publications: Publication[];
  publishTargets: SpaceRow[];
  defaultTargetId: string | null;
  canView: boolean;
  canEdit: boolean;
  grants: string[];
  notice?: string;
}): string {
  const { user, ward, solution, spaces, spaceId, impl, deliverables, publications, publishTargets, defaultTargetId, canView, canEdit, grants, notice } = o;
  const perSpace = solution.implementation_scope === 'per_space';
  const base = `/w/${esc(ward.id)}/s/${esc(solution.id)}`;
  const qs = perSpace && spaceId ? `?space=${esc(spaceId)}` : '';

  const template = solution.template_value
    ? `<p><a class="btn ghost" href="${esc(solution.template_value)}" target="_blank" rel="noopener">
         Use template${solution.template_type === 'google_copy' ? ' (make a copy)' : ''}</a></p>`
    : '';
  const video = solution.video_url
    ? `<p><a href="${esc(solution.video_url)}" target="_blank" rel="noopener">▶ Watch walkthrough</a></p>`
    : '';

  const scopeNote = perSpace
    ? `<p class="muted">Organization: ${esc(spaces.find((s) => s.id === spaceId)?.name ?? spaceId ?? '')}</p>`
    : '';

  let tracker: string;
  if (perSpace && !spaceId) {
    const opts = spaces
      .filter((s) => s.kind === 'org')
      .map((s) => `<a class="btn ghost sm" href="${base}?space=${esc(s.id)}">${esc(s.name)}</a>`)
      .join(' ');
    tracker = `<h2>Track this (per organization)</h2>
      <p class="muted">Choose which organization is implementing this:</p><p>${opts}</p>`;
  } else if (impl && !canView) {
    tracker = `<h2>Implementation</h2>${scopeNote}
      <div class="card muted">This solution is being tracked privately by your ward.</div>`;
  } else if (canEdit) {
    const sel = (v: string) => (impl?.status === v ? 'selected' : '');
    tracker = `<h2>Implementation</h2>${scopeNote}
      <form method="post" action="${base}/track${qs}" class="card">
        <label>Status</label>
        <select name="status">
          <option value="not_started" ${sel('not_started')}>Not started</option>
          <option value="in_progress" ${sel('in_progress')}>In progress</option>
          <option value="implemented" ${sel('implemented')}>Implemented</option>
        </select>
        <label>Notes</label><textarea name="notes" rows="3">${esc(impl?.notes ?? '')}</textarea>
        <button class="btn" type="submit">Save status</button>
      </form>`;
    if (impl) {
      tracker += renderDeliverables(ward, base, qs, deliverables, true, publications, publishTargets, defaultTargetId);
      tracker += renderVisibilityEditor(base, qs, impl, spaces, grants);
    }
  } else {
    // Can view but not edit.
    tracker = `<h2>Implementation</h2>${scopeNote}
      <p>Status: ${statusBadge(impl?.status)}</p>
      ${impl?.notes ? `<div class="card">${esc(impl.notes)}</div>` : ''}`;
    if (impl) tracker += renderDeliverables(ward, base, qs, deliverables, false, publications, [], null);
  }

  return layout({
    title: solution.title,
    userEmail: user.email,
    body: `<h1>${esc(solution.title)}</h1>
      <p class="muted"><a href="/w/${esc(ward.id)}/catalog">← catalog</a></p>
      ${notice ? `<div class="ok">${esc(notice)}</div>` : ''}
      ${solution.summary ? `<p>${esc(solution.summary)}</p>` : ''}
      ${video}
      <div class="card">${bodyToHtml(solution.body) || '<span class="muted">No how-to yet.</span>'}</div>
      ${template}
      ${tracker}`,
  });
}

function renderDeliverables(
  ward: WardRow,
  base: string,
  qs: string,
  deliverables: DeliverableRow[],
  canEdit: boolean,
  publications: Publication[],
  publishTargets: SpaceRow[],
  defaultTargetId: string | null,
): string {
  const pubMap = new Map<string, Publication[]>();
  for (const p of publications) {
    const arr = pubMap.get(p.deliverable_id);
    if (arr) arr.push(p);
    else pubMap.set(p.deliverable_id, [p]);
  }

  const list = deliverables.length
    ? deliverables
        .map((d) => {
          const slug = d.short_slug;
          const qr = slug ? `<div style="width:96px;height:96px">${qrSvg(go4Url(slug))}</div>` : '';
          const pubs = pubMap.get(d.id) ?? [];
          const badges = pubs.length
            ? pubs.map((p) => `<span class="badge ${p.kind === 'public' ? 'super' : ''}">${esc(p.space_name)}</span>`).join(' ')
            : '<span class="muted">not published</span>';
          let controls = '';
          if (canEdit) {
            const already = new Set(pubs.map((p) => p.space_id));
            const opts = publishTargets
              .filter((s) => !already.has(s.id))
              .map((s) => `<option value="${esc(s.id)}" ${s.id === defaultTargetId ? 'selected' : ''}>${esc(s.name)}</option>`)
              .join('');
            const publishForm = opts
              ? `<form method="post" action="/w/${esc(ward.id)}/deliverable/${esc(d.id)}/publish${qs}" class="inline" style="margin-top:.4rem">
                   <select name="space_id" style="width:auto">${opts}</select>
                   <button class="btn sm" type="submit">Publish</button></form>`
              : '';
            const removes = pubs
              .map(
                (p) => `<form method="post" action="/w/${esc(ward.id)}/deliverable/${esc(d.id)}/unpublish${qs}" style="display:inline;margin-right:.3rem">
                   <input type="hidden" name="space_id" value="${esc(p.space_id)}">
                   <button class="btn sm ghost" type="submit">Remove from ${esc(p.space_name)}</button></form>`,
              )
              .join('');
            controls = `<div style="margin-top:.4rem">${removes}${publishForm}</div>`;
          }
          const fileLink =
            d.type !== 'url'
              ? `<br><a href="/f/${esc(d.id)}" target="_blank" rel="noopener">Open ${d.type === 'image' ? 'image' : 'file'}</a>`
              : '';
          return `<div class="card">
            <div class="row"><span><strong>${esc(d.title)}</strong>${fileLink}
              ${slug ? `<br><code>${esc(GO4_HOST)}/${esc(slug)}</code>` : ''}</span>${qr}</div>
            <p style="margin:.3rem 0"><span class="muted">Published to:</span> ${badges}</p>
            ${controls}
          </div>`;
        })
        .join('')
    : '<p class="muted">No deliverables yet.</p>';
  const addForm = canEdit
    ? `<form method="post" action="${base}/deliverable${qs}" class="card">
        <label>Add a link</label><input name="title" required placeholder="Title, e.g. New Member Form">
        <input name="url" type="url" required placeholder="https://...">
        <button class="btn" type="submit">Add link + generate QR</button>
      </form>
      <form method="post" action="${base}/deliverable-file${qs}" enctype="multipart/form-data" class="card">
        <label>Or upload a file (PDF, PNG, JPEG, WebP, SVG — max 10 MB)</label>
        <input name="title" required placeholder="Title">
        <input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,application/pdf,image/*">
        <button class="btn" type="submit">Upload file + generate QR</button>
      </form>`
    : '';
  return `<h2>Deliverables</h2>${list}${addForm}`;
}

function renderVisibilityEditor(
  base: string,
  qs: string,
  impl: Implementation,
  spaces: SpaceRow[],
  grants: string[],
): string {
  const grantSet = new Set(grants);
  const boxes = spaces
    .filter((s) => s.kind !== 'public' && s.id !== impl.space_id)
    .map(
      (s) => `<label style="font-weight:400"><input type="checkbox" name="grant[]" value="${esc(s.id)}"
        ${grantSet.has(s.id) ? 'checked' : ''}> ${esc(s.name)}</label>`,
    )
    .join('');
  const v = impl.visibility;
  return `<h2>Who can see this</h2>
    <form method="post" action="${base}/visibility${qs}" class="card">
      <label style="font-weight:400"><input type="radio" name="visibility" value="ward" ${v === 'ward' ? 'checked' : ''}>
        Everyone in the ward</label>
      <label style="font-weight:400"><input type="radio" name="visibility" value="restricted" ${v === 'restricted' ? 'checked' : ''}>
        Restricted — plus these audiences:</label>
      <div style="margin:.4rem 0 .6rem 1.2rem;display:flex;flex-direction:column;gap:.25rem">${boxes}</div>
      <p class="muted">The implementing space and space owners can always see it; superadmins see everything.</p>
      <button class="btn" type="submit">Save visibility</button>
    </form>`;
}
