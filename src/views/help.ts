// The public Request Help or Service pages (spec §6.1): the tiles page, one short form per
// request category, and the small pages around the emailed confirm link. No sign-in, noindex;
// never shows anyone's request.
import { esc } from '../lib/html';
import { iconSvg, type CategoryRow } from '../lib/serviceCategories';
import { requestKind } from '../lib/serviceRequests';
import { layout } from './layout';
import { PUBLIC_SERVICE_CSS, qrFooter } from './serve';

const HELP_CSS = `<style>
  .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:.9rem;margin-top:1rem}
  .tile{display:flex;flex-direction:column;align-items:center;gap:.5rem;text-align:center;padding:1.2rem .8rem;
    background:#fff;border:1px solid #dde3ed;border-radius:14px;text-decoration:none;color:#1d3557;font-weight:700;
    box-shadow:0 2px 10px rgba(29,53,87,.06)}
  .tile:hover{box-shadow:0 6px 20px rgba(29,53,87,.13);transform:translateY(-1px)}
  .tile .ico{width:64px;height:64px}.tile .ico svg{width:100%;height:100%}
  .radio{display:flex;gap:1.2rem;flex-wrap:wrap;margin:.2rem 0}
  .radio label{display:flex;gap:.35rem;align-items:center;margin:0;font-size:.95rem;color:#2c3a4a}
  .radio input{width:auto}
  .who{background:#f4f7fc;border:1px solid #dde3ed;border-radius:8px;padding:.6rem .8rem;margin:.8rem 0;font-size:.92rem}
</style>`;

const TURNSTILE_SCRIPT = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>';

export function renderHelpPage(o: { wardName: string; prefix: string; categories: CategoryRow[]; shareUrl: string }): string {
  const tiles = o.categories.length
    ? `<div class="tiles">${o.categories
        .map(
          (c) => `<a class="tile" href="/help/${esc(o.prefix)}/${esc(c.slug)}"><span class="ico">${iconSvg(c.icon)}</span>${esc(c.name)}</a>`,
        )
        .join('')}</div>`
    : '<div class="card"><p>Please speak with one of the ward’s leaders.</p></div>';
  return layout({
    title: 'Request Help or Service',
    nav: '',
    head: PUBLIC_SERVICE_CSS + HELP_CSS,
    body: `<h1>Request Help or Service</h1>
      <p class="muted" style="margin-top:0">${esc(o.wardName)}</p>
      <p>Need a hand? Choose what you need and we’ll make sure the right people know.</p>
      ${tiles}
      ${qrFooter('Scan to open this page', o.shareUrl)}`,
  });
}

export interface HelpFormValues {
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
  moving_dir?: string;
  preferred_date?: string;
  christmas_for?: string;
}

function radio(name: string, value: string, label: string, current: string | undefined): string {
  return `<label><input type="radio" name="${name}" value="${value}"${current === value ? ' checked' : ''} required> ${esc(label)}</label>`;
}

export function renderHelpForm(o: {
  wardName: string;
  prefix: string;
  category: CategoryRow;
  whoSees: string;
  siteKey: string;
  values?: HelpFormValues;
  error?: string;
}): string {
  const v = o.values ?? {};
  const kind = requestKind(o.category);
  const extra =
    kind === 'moving'
      ? `<label>Are you moving in or moving out?</label>
         <div class="radio">${radio('moving_dir', 'in', 'Moving in', v.moving_dir)}${radio('moving_dir', 'out', 'Moving out', v.moving_dir)}</div>
         <label>Preferred date (optional)</label><input type="date" name="preferred_date" value="${esc(v.preferred_date ?? '')}">`
      : kind === 'christmas'
        ? `<label>Who is it for?</label>
           <div class="radio">${radio('christmas_for', 'own', 'For my family', v.christmas_for)}${radio('christmas_for', 'other', 'For another family', v.christmas_for)}</div>`
        : '';
  return layout({
    title: o.category.name,
    nav: '',
    head: PUBLIC_SERVICE_CSS + HELP_CSS + TURNSTILE_SCRIPT,
    body: `<p class="muted" style="margin:0"><a href="/help/${esc(o.prefix)}">Request Help or Service</a> · ${esc(o.wardName)}</p>
      <h1 style="display:flex;align-items:center;gap:.6rem"><span style="width:48px;height:48px;display:inline-block">${iconSvg(o.category.icon)}</span>${esc(o.category.name)}</h1>
      <div class="who">${esc(o.whoSees)}</div>
      ${o.error ? `<div class="err">${esc(o.error)}</div>` : ''}
      <form method="post" action="/help/${esc(o.prefix)}/${esc(o.category.slug)}" class="card">
        <label>Your name</label><input name="name" required maxlength="80" autocomplete="name" value="${esc(v.name ?? '')}">
        <label>Your email (we’ll send a link to confirm it)</label>
        <input type="email" name="email" required maxlength="200" autocomplete="email" value="${esc(v.email ?? '')}">
        <label>Phone (optional)</label><input name="phone" maxlength="30" autocomplete="tel" value="${esc(v.phone ?? '')}">
        ${extra}
        <label>A short note (optional)</label>
        <input name="note" maxlength="200" value="${esc(v.note ?? '')}">
        <p class="muted" style="margin:.2rem 0">We’ll talk through the details with you in person.</p>
        <div class="cf-turnstile" data-sitekey="${esc(o.siteKey)}" style="margin-top:.7rem"></div>
        <button class="btn" type="submit">Send my request</button>
      </form>`,
  });
}

export function renderHelpNote(o: { title: string; message: string; prefix: string | null; ok?: boolean }): string {
  return layout({
    title: o.title,
    nav: '',
    body: `<h1>${esc(o.title)}</h1><div class="${o.ok ? 'ok' : 'card'}">${esc(o.message)}</div>
      ${o.prefix ? `<p><a href="/help/${esc(o.prefix)}">Back to Request Help or Service</a></p>` : ''}`,
  });
}

// The emailed confirm link opens this; only its button (POST) confirms (mail scanners prefetch).
export function renderHelpVerify(o: { action: string }): string {
  return layout({
    title: 'Confirm your request',
    nav: '',
    body: `<h1>Confirm your request</h1>
      <div class="card"><p>Press the button to confirm your email address and send your request.</p>
        <form method="post" action="${esc(o.action)}"><button class="btn" type="submit">Confirm my request</button></form></div>`,
  });
}
