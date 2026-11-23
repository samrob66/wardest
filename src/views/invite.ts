// Leader pages for "Invite people by email" (spec §7) and the public unsubscribe pages.
import type { SessionUser } from '../types';
import { esc } from '../lib/html';
import type { BatchProgress } from '../lib/invitations';
import type { PostFull } from '../lib/volPosts';
import { layout } from './layout';

const STATUS_TEXT: Record<string, string> = {
  preparing: 'Getting ready…',
  sending: 'Sending…',
  waiting_cap: "Today's safety limit is reached; the rest send tomorrow.",
  done: 'All done.',
  cancelled: 'Stopped (the post was deleted).',
};

function header(post: PostFull): string {
  const back = `/w/${esc(post.ward_id)}/vol/${esc(post.id)}`;
  return `<p class="muted"><a href="${back}">${esc(post.title)}</a> · ${esc(post.org_name)}</p>`;
}

export function renderInviteForm(o: { user: SessionUser; post: PostFull; list?: string; note?: string; error?: string }): string {
  const base = `/w/${esc(o.post.ward_id)}/vol/${esc(o.post.id)}/invite`;
  return layout({
    title: 'Invite people by email',
    userEmail: o.user.email,
    body: `<h1>Invite people by email</h1>
      ${header(o.post)}
      ${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
      <form method="post" action="${base}/preview" class="card">
        <label>Send to (paste addresses separated by commas, semicolons, spaces or new lines; "Name &lt;email&gt;" works too)</label>
        <textarea name="list" rows="10" required>${esc(o.list ?? '')}</textarea>
        <label>A short personal note (optional, 500 characters at most)</label>
        <textarea name="note" rows="3" maxlength="500">${esc(o.note ?? '')}</textarea>
        <p class="muted" style="margin:.3rem 0">Each person gets their own email with a link to sign up and a link to stop
          these invitations. Only you see the list; it's deleted once the invitations have gone.</p>
        <button class="btn" type="submit">Preview</button>
      </form>`,
  });
}

export function renderInvitePreview(o: {
  user: SessionUser;
  post: PostFull;
  toSend: string[];
  invalid: string[];
  duplicates: number;
  suppressed: number;
  note: string;
  notice?: string;
}): string {
  const base = `/w/${esc(o.post.ward_id)}/vol/${esc(o.post.id)}/invite`;
  const n = o.toSend.length;
  const hidden = `<input type="hidden" name="list" value="${esc(o.toSend.join('\n'))}">
    <input type="hidden" name="note" value="${esc(o.note)}">`;
  return layout({
    title: 'Check your invitations',
    userEmail: o.user.email,
    body: `<h1>Check your invitations</h1>
      ${header(o.post)}
      ${o.notice ? `<div class="ok">${esc(o.notice)}</div>` : ''}
      <div class="card">
        <p style="margin-top:0"><strong>${n.toLocaleString('en-US')}</strong> valid, unique address${n === 1 ? '' : 'es'} will be invited.</p>
        ${o.duplicates ? `<p class="muted">${o.duplicates} duplicate${o.duplicates === 1 ? '' : 's'} removed.</p>` : ''}
        ${o.suppressed ? `<p class="muted">${o.suppressed} skipped: ${o.suppressed === 1 ? 'that person has' : 'they have'} unsubscribed from this ward's invitations.</p>` : ''}
        ${
          o.invalid.length
            ? `<p><strong>These aren't valid email addresses and will be skipped:</strong></p>
               <ul>${o.invalid.slice(0, 200).map((x) => `<li><code>${esc(x)}</code></li>`).join('')}</ul>
               ${o.invalid.length > 200 ? `<p class="muted">…and ${o.invalid.length - 200} more.</p>` : ''}`
            : ''
        }
        ${o.note ? `<p class="muted">Your note: ${esc(o.note)}</p>` : ''}
      </div>
      ${
        n
          ? `<form method="post" action="${base}/send" style="display:inline">${hidden}
               <button class="btn" type="submit">Send ${n.toLocaleString('en-US')} invitation${n === 1 ? '' : 's'}</button></form>
             <form method="post" action="${base}/test" style="display:inline">${hidden}
               <button class="btn ghost" type="submit">Send a test to me</button></form>`
          : '<p class="muted">There is no one to invite.</p>'
      }
      <p><a href="${base}">Start over</a></p>`,
  });
}

export function renderInviteProgress(o: { user: SessionUser; post: PostFull; batch: BatchProgress }): string {
  const b = o.batch;
  const live = b.status === 'sending' || b.status === 'preparing';
  return layout({
    title: 'Invitations',
    userEmail: o.user.email,
    head: live ? '<meta http-equiv="refresh" content="5">' : '',
    body: `<h1>Invitations</h1>
      ${header(o.post)}
      <div class="card">
        <p style="margin-top:0;font-size:1.2rem"><strong>${b.sent.toLocaleString('en-US')} of ${b.total.toLocaleString('en-US')} sent</strong></p>
        <p>${esc(STATUS_TEXT[b.status] ?? b.status)}</p>
        ${b.failed ? `<p class="muted">${b.failed} couldn't be delivered.</p>` : ''}
        ${b.suppressed_count ? `<p class="muted">${b.suppressed_count} skipped (unsubscribed).</p>` : ''}
        ${b.invalid_count ? `<p class="muted">${b.invalid_count} invalid address${b.invalid_count === 1 ? '' : 'es'} skipped.</p>` : ''}
        ${live ? '<p class="muted">This page refreshes every 5 seconds.</p>' : ''}
      </div>
      <p><a href="/w/${esc(o.post.ward_id)}/vol/${esc(o.post.id)}">Back to the post</a></p>`,
  });
}

// ---------------------------------------------------------------- public unsubscribe

export function renderUnsubConfirm(o: { wardName: string; action: string }): string {
  return layout({
    title: 'Stop service invitations',
    nav: '',
    body: `<h1>Stop service invitations</h1>
      <div class="card"><p>You won't get any more emails inviting you to service opportunities in ${esc(o.wardName)}.
        Emails about things you've signed up for still come.</p>
        <form method="post" action="${esc(o.action)}"><button class="btn" type="submit">Stop service invitations from ${esc(o.wardName)}</button></form>
      </div>`,
  });
}

export function renderUnsubNote(o: { title: string; message: string; ok?: boolean }): string {
  return layout({
    title: o.title,
    nav: '',
    body: `<h1>${esc(o.title)}</h1><div class="${o.ok ? 'ok' : 'card'}">${esc(o.message)}</div>`,
  });
}
