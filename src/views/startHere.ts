import type { SessionUser } from '../types';
import type { WardRow } from '../lib/wards';
import type { StartHere, StartHereRow, StepStatus } from '../lib/startHere';
import { esc } from '../lib/html';
import { layout } from './layout';

// The Executive Secretary's Start here page and its ward home card (spec §4).

const STATUS_LABEL: Record<StepStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  implemented: 'Done',
};

const STYLE = `<style>
  .steps{list-style:none}
  .step{display:flex;gap:1rem;align-items:flex-start}
  .step .num{flex:0 0 auto;font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:#8695a8;
    min-width:3.6rem;padding-top:.15rem}
  .step .what{flex:1;min-width:0}
  .step .what a{font-weight:700}
  .step .state{flex:0 0 auto;text-align:right}
  .step.next{border:2px solid #c9b882}
  .badge.next-badge{background:#c9b882;color:#1d3557;margin-left:.4rem}
  .badge.private{background:#f1f3f6;color:#8695a8}
  @media (max-width:520px){.step{flex-wrap:wrap}.step .state{text-align:left;flex-basis:100%}}
</style>`;

function statusBadge(status: StepStatus | null): string {
  if (status === null) return `<span class="badge private">Private</span>`;
  return `<span class="badge${status === 'implemented' ? ' super' : ''}">${STATUS_LABEL[status]}</span>`;
}

function stepRow(wardId: string, r: StartHereRow): string {
  return `<li class="card step${r.isNext ? ' next' : ''}">
      <span class="num">Step ${r.step}</span>
      <span class="what"><a href="/w/${esc(wardId)}/s/${esc(r.solutionId)}">${esc(r.title)}</a>${
        r.isNext ? `<span class="badge next-badge">Next</span>` : ''
      }
        ${r.summary ? `<br><span class="muted">${esc(r.summary)}</span>` : ''}
        ${r.ownerName ? `<br><span class="muted">Owner: ${esc(r.ownerName)}</span>` : ''}</span>
      <span class="state">${statusBadge(r.status)}</span>
    </li>`;
}

export function renderStartHere(user: SessionUser, ward: WardRow, sh: StartHere): string {
  const list = sh.rows.length
    ? `<p class="muted">${sh.done} of ${sh.total} done</p>
       <ol class="steps">${sh.rows.map((r) => stepRow(ward.id, r)).join('')}</ol>`
    : `<p class="muted">No setup steps are published yet.</p>`;
  return layout({
    title: `${ward.name} — Start here`,
    userEmail: user.email,
    head: STYLE,
    body: `<h1>Start here</h1>
      <p class="muted">${esc(ward.name)} · <a href="/w/${esc(ward.id)}">ward home</a> ·
        <a href="/w/${esc(ward.id)}/catalog">catalog</a></p>
      <p>The Executive Secretary's setup steps, in a good order. Order is advice, not a lock: open any step. Mark a step's status on its own page.</p>
      ${list}`,
  });
}

// The ward home card: progress and the next step; a small link once every step is Done; nothing
// when no step solutions are published.
export function startHereCard(wardId: string, sh: StartHere): string {
  if (sh.total === 0) return '';
  const href = `/w/${esc(wardId)}/start`;
  if (sh.done === sh.total) return `<p><a href="${href}">Start here ✓</a></p>`;
  const next = sh.next ? ` · Next: ${esc(sh.next.title)}` : '';
  return `<div class="card"><a href="${href}"><strong>Start here: ${sh.done} of ${sh.total} done${next}</strong></a></div>`;
}
