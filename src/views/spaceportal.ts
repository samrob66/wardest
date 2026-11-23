import type { SessionUser, PortalCard, PortalSection } from '../types';
import type { SectionRow } from '../lib/portalSections';
import type { WardRow, SpaceFull, SpaceMember, SpaceRow } from '../lib/wards';
import type { PortalBlock } from '../lib/portalBlocks';
import type { TaskRow } from '../lib/tasks';
import type { Share } from '../lib/spaceShares';
import { esc, mdLite } from '../lib/html';
import { safeHref, displayUrl } from '../lib/urls';
import { qrSvg } from '../lib/qr';
import { layout } from './layout';

function cardHtml(c: PortalCard): string {
  const href = safeHref(c.short_url ?? c.destination);
  return `<div class="card"><div class="row">
    <span><a href="${esc(href)}" target="_blank" rel="noopener"><strong>${esc(c.title)}</strong></a>
      ${c.short_url ? `<br><code>${esc(displayUrl(c.short_url))}</code>` : ''}</span>
    <div style="width:80px;height:80px">${qrSvg(href)}</div>
  </div></div>`;
}

export function renderSpacePortal(o: {
  user: SessionUser;
  ward: WardRow;
  space: SpaceFull;
  canManage: boolean;
  canParticipate: boolean;
  blocks: PortalBlock[];
  cards: PortalCard[];
  tasks: TaskRow[];
  members: SpaceMember[];
  shares: Share[];
  shareTargets: SpaceRow[];
  portalUrl: string;
  notice?: string;
  error?: string;
  volunteerHtml?: string; // volunteer posts + "who can manage" (built in volRoutes.ts, already escaped)
  sections?: { list: SectionRow[]; groups: PortalSection[] }; // the public portal's managers only
}): string {
  const { user, ward, space, canManage, canParticipate, blocks, cards, tasks, members, shares, shareTargets, portalUrl, notice, error } = o;
  const base = `/w/${esc(ward.id)}/space/${esc(space.id)}`;

  // The portal's share link is a short link the leader made on zippa.run and pasted here.
  const currentShare = space.share_url
    ? `<p class="muted">Share link: <a href="${esc(safeHref(space.share_url))}" target="_blank" rel="noopener"><code>${esc(displayUrl(space.share_url))}</code></a></p>`
    : '';
  const shareLinkHtml = canManage
    ? `${currentShare}<form method="post" action="${base}/share-link" class="card">
        <label>Share link (optional)</label>
        <input name="share_url" value="${esc(space.share_url ?? '')}" placeholder="e.g. zippa.run/m44Links">
        <p class="muted" style="margin:.3rem 0 .5rem">Create it on zippa.run pointing at
          <code>${esc(portalUrl)}</code>, then paste it here. The printout's QR uses it. Leave
          blank to remove it.</p>
        <button class="btn sm" type="submit">Save share link</button>
      </form>`
    : currentShare;

  const sharingHtml = canManage
    ? `<h2>Sharing</h2>
       <p class="muted">Give another space read-only access to this portal.</p>
       ${
         shares.length
           ? shares
               .map(
                 (s) => `<div class="card"><div class="row">
                   <span>Shared with <strong>${esc(s.name)}</strong></span>
                   <form method="post" action="${base}/unshare" style="display:inline">
                     <input type="hidden" name="space_id" value="${esc(s.space_id)}">
                     <button class="btn sm ghost danger" type="submit">Remove</button></form>
                 </div></div>`,
               )
               .join('')
           : '<p class="muted">Not shared with anyone.</p>'
       }
       ${
         shareTargets.length
           ? `<form method="post" action="${base}/share" class="inline card">
                <select name="space_id" style="width:auto">${shareTargets.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select>
                <button class="btn sm" type="submit">Share</button></form>`
           : ''
       }`
    : '';

  const taskItems = tasks.length
    ? tasks
        .map(
          (t) => `<div class="card"><div class="row">
            <span>${esc(t.text)}${t.assignee_name ? ` <span class="muted">· ${esc(t.assignee_name)}</span>` : ''}</span>
            ${canParticipate ? `<form method="post" action="${base}/task/${esc(t.id)}/complete" style="display:inline"><button class="btn sm" type="submit">Done</button></form>` : ''}
          </div></div>`,
        )
        .join('')
    : '<p class="muted">No open tasks.</p>';
  const memberOpts = members.map((m) => `<option value="${esc(m.user_id)}">${esc(m.name ?? m.email)}</option>`).join('');
  const addTask = canParticipate
    ? `<form method="post" action="${base}/task" class="card">
        <label>Add a task</label><input name="text" required placeholder="What needs doing?">
        <label>Assign to (optional)</label>
        <select name="assignee"><option value="">— unassigned —</option>${memberOpts}</select>
        <button class="btn" type="submit">Add task</button>
      </form>`
    : '';
  const tasksSection = `<h2>Tasks</h2>${taskItems}${addTask}
    <p><a href="${base}/tasks/archived">View archived</a></p>`;

  const blocksHtml = blocks
    .map((b) => {
      const manage = canManage
        ? `<p class="muted" style="margin-top:.5rem">
             <a href="${base}/block/${esc(b.id)}/edit">Edit</a> ·
             <form method="post" action="${base}/block/${esc(b.id)}/move" style="display:inline">
               <input type="hidden" name="dir" value="up"><button class="btn sm ghost" type="submit">↑</button></form>
             <form method="post" action="${base}/block/${esc(b.id)}/move" style="display:inline">
               <input type="hidden" name="dir" value="down"><button class="btn sm ghost" type="submit">↓</button></form>
             <form method="post" action="${base}/block/${esc(b.id)}/delete" style="display:inline">
               <button class="btn sm ghost danger" type="submit">Delete</button></form>
           </p>`
        : '';
      return `<div class="card">${b.title ? `<h3>${esc(b.title)}</h3>` : ''}${mdLite(b.body)}${manage}</div>`;
    })
    .join('');

  const addBlock = canManage
    ? `<form method="post" action="${base}/block" class="card">
        <label>Add a notice / note</label>
        <input name="title" placeholder="Title (optional)">
        <textarea name="body" rows="4" placeholder="Supports **bold**, *italic*, - lists, [links](https://…)"></textarea>
        <button class="btn" type="submit">Add block</button>
      </form>`
    : '';

  const cardsHtml = cards.length ? cards.map(cardHtml).join('') : '<p class="muted">No deliverables published here yet.</p>';

  return layout({
    title: `${ward.name} — ${space.name}`,
    userEmail: user.email,
    body: `<h1>${esc(space.name)}</h1>
      <p class="muted">${esc(ward.name)} portal · <a href="/w/${esc(ward.id)}">ward home</a>
        ${canManage ? ` · <a href="${base}/print" target="_blank">print</a>` : ''}</p>
      ${notice ? `<div class="ok">${esc(notice)}</div>` : ''}
      ${error ? `<div class="err">${esc(error)}</div>` : ''}
      ${shareLinkHtml}
      ${blocksHtml}
      ${addBlock}
      <h2>Deliverables</h2>
      ${cardsHtml}
      ${o.sections ? sectionsCard(base, o.sections) : ''}
      ${tasksSection}
      ${o.volunteerHtml ?? ''}
      ${sharingHtml}`,
  });
}

// Arranging the public portal's sections (spec §8): add / rename / move / delete, and a
// "Section" select per published card. Deleting a section returns its cards to "Links".
function sectionsCard(base: string, s: { list: SectionRow[]; groups: PortalSection[] }): string {
  const rows = s.list.length
    ? s.list
        .map(
          (sec, i) => `<div class="row" style="padding:.3rem 0;flex-wrap:wrap">
            <form method="post" action="${base}/sections/${esc(sec.id)}" class="inline">
              <input name="title" value="${esc(sec.title)}" maxlength="60" style="width:14rem">
              <button class="btn sm ghost" type="submit">Rename</button></form>
            <span>
              ${i > 0 ? `<form method="post" action="${base}/sections/${esc(sec.id)}/move" style="display:inline"><input type="hidden" name="dir" value="up"><button class="btn sm ghost" type="submit">↑</button></form>` : ''}
              ${i < s.list.length - 1 ? `<form method="post" action="${base}/sections/${esc(sec.id)}/move" style="display:inline"><input type="hidden" name="dir" value="down"><button class="btn sm ghost" type="submit">↓</button></form>` : ''}
              <form method="post" action="${base}/sections/${esc(sec.id)}/delete" style="display:inline"><button class="btn sm ghost danger" type="submit">Delete</button></form>
            </span></div>`,
        )
        .join('')
    : '<p class="muted">No sections yet: every link shows under "Links".</p>';
  const cards = s.groups.flatMap((g) => g.cards);
  const assign = cards.length
    ? `<h3 style="margin-top:1rem">Which section each link is in</h3>${cards
        .map(
          (c) => `<form method="post" action="${base}/cards/${esc(c.deliverable_id ?? '')}/section" class="inline" style="margin:.3rem 0">
            <div style="flex:1">${esc(c.title)}</div>
            <select name="section_id" style="width:auto"><option value="">Links (default)</option>${s.list
              .map((sec) => `<option value="${esc(sec.id)}"${sec.id === c.section_id ? ' selected' : ''}>${esc(sec.title)}</option>`)
              .join('')}</select>
            <button class="btn sm ghost" type="submit">Move</button></form>`,
        )
        .join('')}`
    : '';
  return `<h2>Portal sections</h2>
    <div class="card">
      <p class="muted" style="margin-top:0">"Service Opportunities" and "Service Requests" always come first (turn them off in
        ward settings); then these sections in this order, two to a row on wide screens; then "Links".</p>
      ${rows}
      <form method="post" action="${base}/sections" class="inline" style="margin-top:.6rem">
        <div style="flex:1"><label>New section</label><input name="title" maxlength="60" required placeholder="e.g. Interviews"></div>
        <button class="btn sm" type="submit">Add section</button></form>
      ${assign}
    </div>`;
}

export function renderArchivedTasks(
  user: SessionUser,
  ward: WardRow,
  space: SpaceFull,
  tasks: TaskRow[],
  canParticipate: boolean,
): string {
  const base = `/w/${esc(ward.id)}/space/${esc(space.id)}`;
  const items = tasks.length
    ? tasks
        .map(
          (t) => `<div class="card"><div class="row">
            <span style="text-decoration:line-through">${esc(t.text)}</span>
            ${
              canParticipate
                ? `<span>
                     <form method="post" action="${base}/task/${esc(t.id)}/reopen" style="display:inline"><button class="btn sm ghost" type="submit">Reopen</button></form>
                     <form method="post" action="${base}/task/${esc(t.id)}/delete" style="display:inline"><button class="btn sm ghost danger" type="submit">Delete</button></form>
                   </span>`
                : ''
            }
          </div></div>`,
        )
        .join('')
    : '<p class="muted">No archived tasks.</p>';
  return layout({
    title: `${space.name} — Archived tasks`,
    userEmail: user.email,
    body: `<h1>Archived tasks</h1>
      <p class="muted">${esc(space.name)} · <a href="${base}">back to portal</a></p>
      ${items}`,
  });
}

export function renderBlockForm(
  user: SessionUser,
  ward: WardRow,
  space: SpaceFull,
  block: PortalBlock,
): string {
  const base = `/w/${esc(ward.id)}/space/${esc(space.id)}`;
  return layout({
    title: 'Edit block',
    userEmail: user.email,
    body: `<h1>Edit note</h1>
      <p class="muted">${esc(space.name)} · <a href="${base}">back to portal</a></p>
      <form method="post" action="${base}/block/${esc(block.id)}">
        <label>Title (optional)</label><input name="title" value="${esc(block.title ?? '')}">
        <label>Body</label>
        <textarea name="body" rows="8">${esc(block.body ?? '')}</textarea>
        <button class="btn" type="submit">Save</button>
      </form>`,
  });
}
