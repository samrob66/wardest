// Public volunteer pages (no sign-in): the post page anyone with the link sees, and the small
// pages behind emailed links. Never shows a volunteer's name, email, or the post's private
// details (spec §2 anti-goals, §6.2). Everything is noindex (layout meta + X-Robots-Tag).
import { esc, mdLite } from '../lib/html';
import type { PostFull } from '../lib/volPosts';
import { isDateOver, isPostOver, whenText } from '../lib/volPosts';
import { formatWhen } from '../lib/wardTime';
import { layout } from './layout';
import { fillBar, fillText, VOL_CSS } from './volCommon';

export function publicNav(prefix: string): string {
  return `<a href="/vol/${esc(prefix)}/me">My sign-ups</a>`;
}

function totals(post: PostFull): { confirmed: number; needed: number; waiting: number } {
  const roles = post.dates.flatMap((d) => d.roles);
  return {
    confirmed: roles.reduce((a, r) => a + r.confirmed, 0),
    needed: roles.reduce((a, r) => a + r.needed, 0),
    waiting: roles.reduce((a, r) => a + r.waiting, 0),
  };
}

function ogHead(post: PostFull, publicUrl: string): string {
  const t = totals(post);
  const note = (post.public_note ?? '').replace(/\s+/g, ' ').trim().slice(0, 150);
  const desc = `${t.confirmed} of ${t.needed} filled${note ? ` — ${note}` : ''}`;
  return `<meta property="og:type" content="website">
<meta property="og:title" content="${esc(`${post.org_name} · ${post.title}`)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(publicUrl)}">
<meta name="description" content="${esc(desc)}">`;
}

const TURNSTILE_SCRIPT = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>';

export interface SignupFormValues {
  role_id?: string;
  name?: string;
  email?: string;
  bringing?: string;
}

export function renderPublicPost(o: {
  post: PostFull;
  bringing: Array<{ role_id: string; bringing: string }>;
  now: Date;
  siteKey: string;
  publicUrl: string;
  error?: string;
  values?: SignupFormValues;
}): string {
  const { post, now } = o;
  const tz = post.ward.timezone;
  const over = isPostOver(post, now);
  const t = totals(post);
  const action = `/v/${esc(post.public_id)}/signup`;
  const v = o.values ?? {};

  const dates = post.dates
    .map((d) => {
      const dateOver = isDateOver(d.date, tz, now);
      const roles = d.roles
        .map((r) => {
          const brought = o.bringing.filter((b) => b.role_id === r.id).map((b) => b.bringing);
          const full = r.confirmed >= r.needed;
          let control: string;
          if (full) control = '<span class="filled">Filled ✓</span>';
          else if (dateOver || over) control = '<span class="muted">This date is over</span>';
          else {
            const keep = v.role_id === r.id;
            control = `<details${keep ? ' open' : ''}><summary class="btn sm" style="display:inline-block;color:#fff">Sign up</summary>
              <form method="post" action="${action}" class="card" style="margin-top:.5rem">
                <input type="hidden" name="role_id" value="${esc(r.id)}">
                <label>Your name</label><input name="name" required maxlength="80" autocomplete="name" value="${keep ? esc(v.name ?? '') : ''}">
                <label>Your email</label><input type="email" name="email" required maxlength="200" autocomplete="email" value="${keep ? esc(v.email ?? '') : ''}">
                ${
                  r.bring_prompt
                    ? `<label>${esc(r.bring_prompt)}</label><input name="bringing" maxlength="200" value="${keep ? esc(v.bringing ?? '') : ''}">
                       <p class="muted" style="margin:.2rem 0">Others will see what you're bringing, but not your name.</p>`
                    : ''
                }
                <div class="cf-turnstile" data-sitekey="${esc(o.siteKey)}" style="margin-top:.7rem"></div>
                <button class="btn" type="submit">Sign up</button>
                <p class="muted" style="margin-top:.5rem">Your name and email are only shared with the ward's
                  leaders and the other volunteers on this post.</p>
              </form></details>`;
          }
          return `<div class="role">
            <div class="row"><strong>${esc(r.name)}</strong><span class="voltext">${esc(fillText(r.confirmed, r.needed, 0))}</span></div>
            ${r.start_time || r.end_time ? `<div class="muted">${esc(whenText(d, r))}</div>` : ''}
            ${r.note ? `<div class="muted">${mdLite(r.note)}</div>` : ''}
            ${brought.length ? `<p class="muted">Bringing: ${brought.map(esc).join(', ')}</p>` : ''}
            ${control}
          </div>`;
        })
        .join('');
      return `<div class="card"><h3>${esc(formatWhen(d.date, d.start_time))}${
        post.private_details ? ` <span class="muted" style="font-weight:400;font-size:.85rem">· address emailed once you're confirmed</span>` : ''
      }</h3>${roles || '<p class="muted">Nothing to sign up for on this date yet.</p>'}</div>`;
    })
    .join('');

  return layout({
    title: `${post.org_name} · ${post.title}`,
    nav: publicNav(post.ward.prefix),
    head: ogHead(post, o.publicUrl) + VOL_CSS + (over ? '' : TURNSTILE_SCRIPT),
    body: `<p class="muted" style="margin:0">${esc(post.ward.name)} · ${esc(post.org_name)}</p>
      <h1>${esc(post.title)}</h1>
      ${post.public_note ? mdLite(post.public_note) : ''}
      ${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
      ${over ? '<div class="ok">This opportunity is over. Thank you to everyone who helped!</div>' : ''}
      <div class="card">${fillBar(t.confirmed, t.needed, t.waiting)}</div>
      ${dates || '<p class="muted">No dates yet.</p>'}
      <p class="muted" style="margin-top:1.4rem"><a href="/vol/${esc(post.ward.prefix)}/me">My sign-ups</a> — see or cancel what you've signed up for.</p>`,
  });
}

// A small page for the public side (results, emailed-link landings).
export function publicMessagePage(o: { title: string; prefix: string | null; body: string }): string {
  return layout({
    title: o.title,
    nav: o.prefix ? publicNav(o.prefix) : '',
    body: o.body,
  });
}

// The page after the public form. Never shows names or private details: anyone can type any
// address there, including an approved member's (spec §6.4). And every outcome that depends on
// the address shows the SAME page, so the form can't be used to learn whether an email is new,
// approved, declined or already signed up (spec §2: not a ward directory). What happened is in
// the email. Only outcomes that read the same for every address show on screen.
const CHECK_EMAIL = {
  title: 'Check your email',
  body: "Thanks — check your email to finish. We've sent a message to the address you entered saying what happens next. If it doesn't arrive in a few minutes, check your spam folder.",
};

const SCREEN_COPY: Record<string, { title: string; body: string }> = {
  role_full: {
    title: 'Just filled',
    body: 'Sorry, that role just filled up, so you don’t need to come. Thank you for offering! Other roles may still need help.',
  },
  closed: { title: 'Sign-up closed', body: 'This sign-up is closed.' },
  rate_limited: { title: 'Please try again later', body: 'We’re getting a lot of sign-ups right now. Please try again in a little while.' },
};

export function renderSignupResult(o: { result: string; postTitle: string; publicId: string; prefix: string }): string {
  const onScreen = SCREEN_COPY[o.result];
  const copy = onScreen ?? CHECK_EMAIL;
  return publicMessagePage({
    title: copy.title,
    prefix: o.prefix,
    body: `<h1>${esc(copy.title)}</h1>
      <div class="${onScreen ? 'card' : 'ok'}">${esc(copy.body)}</div>
      <p><a href="/v/${esc(o.publicId)}">Back to “${esc(o.postTitle)}”</a> · <a href="/vol/${esc(o.prefix)}/me">My sign-ups</a></p>`,
  });
}

// Emailed-link landing: a GET shows this page; only its button (POST) changes anything, so
// mail scanners that prefetch links can't act on them.
export function renderConfirmAction(o: {
  title: string;
  prefix: string | null;
  intro: string;
  action: string;
  button: string;
  danger?: boolean;
}): string {
  return publicMessagePage({
    title: o.title,
    prefix: o.prefix,
    body: `<h1>${esc(o.title)}</h1>
      <div class="card"><p>${esc(o.intro)}</p>
        <form method="post" action="${esc(o.action)}"><button class="btn${o.danger ? ' danger' : ''}" type="submit">${esc(o.button)}</button></form>
      </div>`,
  });
}

export function renderPublicNote(o: { title: string; prefix: string | null; message: string; ok?: boolean }): string {
  return publicMessagePage({
    title: o.title,
    prefix: o.prefix,
    body: `<h1>${esc(o.title)}</h1><div class="${o.ok ? 'ok' : 'card'}">${esc(o.message)}</div>
      ${o.prefix ? `<p><a href="/vol/${esc(o.prefix)}/me">My sign-ups</a></p>` : ''}`,
  });
}
