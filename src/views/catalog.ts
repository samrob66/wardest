import type { SessionUser } from '../types';
import type { Solution } from '../lib/solutions';
import type { Implementation } from '../lib/implementations';
import type { DeliverableRow } from '../lib/deliverables';
import type { WardRow, SpaceRow } from '../lib/wards';
import { CATEGORIES, categoryLabel } from '../lib/solutions';
import { esc, go4Url, GO4_HOST } from '../lib/html';
import { qrSvg } from '../lib/qr';
import { layout } from './layout';

function bodyToHtml(body: string | null): string {
  if (!body) return '';
  return esc(body).replace(/\n/g, '<br>');
}

function statusBadge(status: string | undefined): string {
  const s = status ?? 'not_started';
  const label = s.replace(/_/g, ' ');
  const cls = s === 'implemented' ? 'super' : '';
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

// ---- Operator authoring ----

export function renderOperatorSolutions(user: SessionUser, solutions: Solution[]): string {
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
  notice?: string;
}): string {
  const { user, ward, solution, spaces, spaceId, impl, deliverables, notice } = o;
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

  // per_space needs a chosen space before tracking.
  let tracker: string;
  if (perSpace && !spaceId) {
    const opts = spaces
      .filter((s) => s.kind === 'org')
      .map((s) => `<a class="btn ghost sm" href="${base}?space=${esc(s.id)}">${esc(s.name)}</a>`)
      .join(' ');
    tracker = `<h2>Track this (per organization)</h2>
      <p class="muted">Choose which organization is implementing this:</p><p>${opts}</p>`;
  } else {
    const sel = (v: string) => (impl?.status === v ? 'selected' : '');
    const scopeNote = perSpace
      ? `<p class="muted">Organization: ${esc(spaces.find((s) => s.id === spaceId)?.name ?? spaceId ?? '')}</p>`
      : '';
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
    if (impl) tracker += renderDeliverables(ward, base, qs, deliverables);
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

function renderDeliverables(ward: WardRow, base: string, qs: string, deliverables: DeliverableRow[]): string {
  const list = deliverables.length
    ? deliverables
        .map((d) => {
          const slug = d.short_slug;
          const qr = slug ? `<div style="width:96px;height:96px">${qrSvg(go4Url(slug))}</div>` : '';
          const pub = d.on_public
            ? '<span class="badge super">on portal</span>'
            : `<form method="post" action="/w/${esc(ward.id)}/deliverable/${esc(d.id)}/publish${qs}" style="display:inline">
                 <button class="btn sm" type="submit">Publish to portal</button></form>`;
          return `<div class="card"><div class="row">
            <span><strong>${esc(d.title)}</strong>
              ${slug ? `<br><code>${esc(GO4_HOST)}/${esc(slug)}</code>` : ''}</span>
            ${pub}</div>${qr}</div>`;
        })
        .join('')
    : '<p class="muted">No deliverables yet.</p>';
  return `<h2>Deliverables</h2>${list}
    <form method="post" action="${base}/deliverable${qs}" class="card">
      <label>Title</label><input name="title" required placeholder="e.g. New Member Form">
      <label>URL</label><input name="url" type="url" required placeholder="https://...">
      <button class="btn" type="submit">Add link + generate QR</button>
    </form>`;
}
