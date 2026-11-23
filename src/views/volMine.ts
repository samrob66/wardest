// Volunteers' own pages ("My sign-ups"). Shows only the signed-in volunteer's sign-ups; other
// posts appear with counts only (spec §6.4, item 23).
import { esc } from '../lib/html';
import type { MySignup } from '../lib/volSignup';
import type { PostSummary } from '../lib/volPosts';
import { layout } from './layout';
import { fillBar, VOL_CSS } from './volCommon';

const TURNSTILE_SCRIPT = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>';

function nav(prefix: string, signedIn: boolean): string {
  return signedIn
    ? `<form method="post" action="/vol/${esc(prefix)}/me/signout" style="display:inline"><button class="btn sm ghost" style="color:#c9b882;border-color:#c9b882" type="submit">Sign out</button></form>`
    : '';
}

export function renderMineSignedOut(o: { prefix: string; wardName: string; siteKey: string; error?: string }): string {
  return layout({
    title: 'My sign-ups',
    nav: nav(o.prefix, false),
    head: TURNSTILE_SCRIPT,
    body: `<h1>My sign-ups</h1>
      <p class="muted">${esc(o.wardName)}</p>
      ${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
      <form method="post" action="/vol/${esc(o.prefix)}/me/link" class="card">
        <p style="margin-top:0">Enter the email you signed up with and we'll send you a link to see and
          manage your sign-ups.</p>
        <label>Your email</label><input type="email" name="email" required maxlength="200" autocomplete="email">
        <div class="cf-turnstile" data-sitekey="${esc(o.siteKey)}" style="margin-top:.7rem"></div>
        <button class="btn" type="submit">Email me my link</button>
      </form>`,
  });
}

export function renderLinkSent(o: { prefix: string; wardName: string }): string {
  return layout({
    title: 'Check your email',
    nav: '',
    body: `<h1>Check your email</h1>
      <div class="ok">If that address has sign-ups here, we've emailed a link to it. The link works for 30 days.</div>
      <p><a href="/vol/${esc(o.prefix)}/me">Back</a></p>`,
  });
}

function statusLine(s: MySignup): string {
  if (s.status === 'waiting') return '<span class="tag warn">waiting for approval</span>';
  if (!s.upcoming) return '<span class="tag">done</span>';
  return s.overLimit
    ? '<span class="tag">confirmed · the need was already met, so you can withdraw from the link in your email</span>'
    : '<span class="tag ok">confirmed</span>';
}

function item(prefix: string, s: MySignup): string {
  const cancel = s.upcoming
    ? `<form method="post" action="/vol/${esc(prefix)}/me/cancel/${esc(s.id)}" style="margin-top:.4rem">
         <button class="btn sm ghost danger" type="submit">Cancel</button></form>`
    : '';
  return `<div class="card">
    <div class="row"><strong>${esc(s.title)}</strong><span class="muted">${esc(s.orgName)}</span></div>
    <p style="margin:.2rem 0">${esc(s.when)} · ${esc(s.roleName)}${s.bringing ? ` · bringing ${esc(s.bringing)}` : ''}</p>
    ${statusLine(s)}
    ${s.privateDetails ? `<div class="card" style="background:#f4f7fc"><strong>Details</strong><p class="pre">${esc(s.privateDetails)}</p></div>` : ''}
    ${s.otherNames.length ? `<p class="muted">Also helping: ${s.otherNames.map(esc).join(', ')}</p>` : ''}
    <p class="muted"><a href="/v/${esc(s.publicId)}">Open the post</a></p>
    ${cancel}
  </div>`;
}

export function renderMine(o: {
  prefix: string;
  wardName: string;
  name: string;
  email: string;
  approved: boolean;
  signups: MySignup[];
  others: PostSummary[];
  discordHtml?: string;
  notice?: string;
}): string {
  const upcoming = o.signups.filter((s) => s.upcoming);
  const past = o.signups.filter((s) => !s.upcoming);
  const others = o.approved
    ? `<h2>Other ways to serve</h2>${
        o.others.length
          ? o.others
              .map(
                (p) => `<div class="card"><div class="row"><a href="/v/${esc(p.public_id)}"><strong>${esc(p.title)}</strong></a>
                  <span class="muted">${esc(p.org_name)}</span></div>${fillBar(p.confirmed, p.needed)}</div>`,
              )
              .join('')
          : '<p class="muted">Nothing else open right now.</p>'
      }`
    : '';
  return layout({
    title: 'My sign-ups',
    nav: nav(o.prefix, true),
    head: VOL_CSS,
    body: `<h1>My sign-ups</h1>
      <p class="muted">${esc(o.wardName)} · ${esc(o.name)} (${esc(o.email)})</p>
      ${o.notice ? `<div class="ok">${esc(o.notice)}</div>` : ''}
      ${o.approved ? '' : '<div class="card">A leader still needs to confirm you. Your sign-ups will count once they do, and we&#39;ll email you the details.</div>'}
      <h2>Coming up</h2>
      ${upcoming.length ? upcoming.map((s) => item(o.prefix, s)).join('') : '<p class="muted">Nothing coming up.</p>'}
      ${past.length ? `<h2>Past</h2>${past.map((s) => item(o.prefix, s)).join('')}` : ''}
      ${o.discordHtml ?? ''}
      ${others}`,
  });
}

export function renderDiscordCard(o: { connected: boolean }): string {
  return `<h2>Discord</h2><div class="card">
    ${
      o.connected
        ? `<p style="margin-top:0">Connected · confirmations and reminders also come to you as a Discord direct message.</p>
           <form method="post" action="/vol/discord/disconnect"><button class="btn sm ghost" type="submit">Disconnect</button></form>`
        : `<p style="margin-top:0">Get confirmations and reminders as a Discord direct message too (email still comes).</p>
           <a class="btn sm" href="/vol/discord/connect">Connect Discord</a>`
    }
    <p class="muted">This works when your ward's Discord server has the WardForward bot and you allow direct
      messages from server members. If a message can't be delivered, email is the backup.</p>
  </div>`;
}
