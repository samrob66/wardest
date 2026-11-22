// Leader-facing volunteer pages and the volunteer sections on space pages.
import { esc } from '../lib/html';
import type { EditorRow } from '../lib/volEditors';

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
