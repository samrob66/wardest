import type { SessionUser, PortalCard } from '../types';
import type { WardRow, SpaceFull, SpaceMember } from '../lib/wards';
import type { PortalBlock } from '../lib/portalBlocks';
import type { TaskRow } from '../lib/tasks';
import { esc, go4Url, GO4_HOST, mdLite } from '../lib/html';
import { qrSvg } from '../lib/qr';
import { layout } from './layout';

function cardHtml(c: PortalCard): string {
  const href = c.short_slug ? go4Url(c.short_slug) : (c.url ?? '#');
  const qr = c.short_slug ? `<div style="width:80px;height:80px">${qrSvg(href)}</div>` : '';
  return `<div class="card"><div class="row">
    <span><a href="${esc(href)}" target="_blank" rel="noopener"><strong>${esc(c.title)}</strong></a>
      ${c.short_slug ? `<br><code>${esc(GO4_HOST)}/${esc(c.short_slug)}</code>` : ''}</span>${qr}
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
  notice?: string;
}): string {
  const { user, ward, space, canManage, canParticipate, blocks, cards, tasks, members, notice } = o;
  const base = `/w/${esc(ward.id)}/space/${esc(space.id)}`;

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
      ${blocksHtml}
      ${addBlock}
      <h2>Deliverables</h2>
      ${cardsHtml}
      ${tasksSection}`,
  });
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
