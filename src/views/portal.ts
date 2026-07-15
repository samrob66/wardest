import type { PortalData, PortalCard } from '../types';
import { esc, go4Url, GO4_HOST } from '../lib/html';
import { qrSvg } from '../lib/qr';

const CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
const QR_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>';

const DISCLAIMER = 'Not an official website of The Church of Jesus Christ of Latter-day Saints';

function cardHtml(card: PortalCard, i: number): string {
  const href = card.short_slug ? go4Url(card.short_slug) : (card.url ?? '#');
  const shortText = card.short_slug ? `${GO4_HOST}/${card.short_slug}` : '';
  const qr = qrSvg(href);
  const label = esc(card.title);
  const modalId = `qr-${i}`;

  return `
    <article class="card">
      <div class="card-top">
        <a class="main-link" href="${esc(href)}" target="_blank" rel="noopener">
          <span class="chev">${CHEVRON}</span>
          <span class="link-label">${label}</span>
        </a>
        <a class="qr-btn" href="#${modalId}" aria-label="Show QR code for ${label}">
          <span class="qr-ico">${QR_ICON}</span><span class="qr-txt">Show<br>QR</span>
        </a>
      </div>
      ${shortText ? `<div class="short-url">${esc(shortText)}</div>` : ''}
    </article>
    <div class="modal" id="${modalId}">
      <a class="modal-backdrop" href="#!" aria-label="Close"></a>
      <div class="modal-card">
        <div class="modal-title">${label}</div>
        ${shortText ? `<div class="modal-url">${esc(shortText)}</div>` : ''}
        <div class="modal-qr">${qr}</div>
        <a class="modal-close" href="#!">Close</a>
      </div>
    </div>`;
}

export function renderPortal(data: PortalData): string {
  const title = data.portalTitle ?? `${data.wardName} Links`;
  const masterUrl = data.portalSlug
    ? go4Url(data.portalSlug)
    : `https://app.wardest.com/p/${data.prefix}`;
  const masterText = data.portalSlug
    ? `${GO4_HOST}/${data.portalSlug}`
    : `app.wardest.com/p/${data.prefix}`;
  const masterQr = qrSvg(masterUrl);
  const cards = data.cards.map(cardHtml).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;color:#2c3a4a;min-height:100vh;
    background:linear-gradient(160deg,#eef2f8,#e2e8f2 60%,#dbe3ef);
    display:flex;flex-direction:column;align-items:center;padding:2.5rem 1rem 4rem}
  .header{text-align:center;margin-bottom:1.6rem}
  .ward-name{font-size:1.5rem;font-weight:700;letter-spacing:.02em;color:#1d3557}
  .ward-sub{font-size:.68rem;color:#6b7a8d;letter-spacing:.06em;text-transform:uppercase;margin-top:.5rem}
  .divider{width:60px;height:3px;background:#c9b882;border-radius:2px;margin:1rem auto 0}
  .links{display:flex;flex-direction:column;gap:.9rem;width:100%;max-width:480px}
  .card{background:#fff;border:1px solid #dde3ed;border-radius:14px;
    box-shadow:0 2px 10px rgba(29,53,87,.07);overflow:hidden;transition:box-shadow .2s,transform .15s}
  .card:hover{box-shadow:0 6px 20px rgba(29,53,87,.13);transform:translateY(-1px)}
  .card-top{display:flex;align-items:stretch}
  .main-link{flex:1;display:flex;align-items:center;gap:.75rem;padding:.9rem 1rem;
    text-decoration:none;color:#1d3557;transition:background .15s}
  .main-link:hover{background:#f4f7fc}
  .chev{flex-shrink:0;width:20px;height:20px;color:#4a6fa5;opacity:.7;display:flex}
  .chev svg{width:100%;height:100%}
  .main-link:hover .chev{opacity:1;transform:translateX(2px)}
  .link-label{font-size:.98rem;font-weight:600;line-height:1.3}
  .qr-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;
    padding:0 .85rem;min-width:64px;background:#f9fafc;border-left:1px solid #dde3ed;
    color:#4a6fa5;font-size:.66rem;text-align:center;line-height:1.15;text-decoration:none;
    transition:background .15s,color .15s}
  .qr-btn:hover{background:#eaf0fb;color:#1d3557}
  .qr-ico{width:18px;height:18px;display:block}.qr-ico svg{width:100%;height:100%}
  .short-url{font-size:.68rem;color:#8fa0b5;padding:.32rem 1rem .46rem 3.7rem;
    border-top:1px solid #f0f3f8;font-family:'Courier New',monospace}
  /* Master QR */
  .master{width:100%;max-width:480px;margin-top:1.8rem;background:#1d3557;border-radius:16px;
    padding:1.5rem 1.25rem;display:flex;flex-direction:column;align-items:center;gap:.7rem;
    box-shadow:0 4px 20px rgba(29,53,87,.25)}
  .master-label{font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9b882}
  .master-title{font-size:1rem;font-weight:700;color:#fff;text-align:center}
  .master-qr{width:180px;height:180px;background:#fff;border-radius:10px;padding:8px;border:4px solid #fff}
  .master-qr svg{width:100%;height:100%;display:block}
  .master-url{font-size:.7rem;color:#9fb0c6;font-family:'Courier New',monospace;letter-spacing:.03em}
  .footer{margin-top:1.8rem;font-size:.7rem;color:#8695a8;text-align:center}
  .footer a{color:#4a6fa5}
  /* Pure-CSS QR modal (no JS, no external requests) */
  .modal{display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;padding:1rem}
  .modal:target{display:flex}
  .modal-backdrop{position:absolute;inset:0;background:rgba(20,30,48,.5);display:block}
  .modal-card{position:relative;background:#fff;border-radius:18px;padding:1.6rem 1.8rem;
    width:min(90vw,300px);text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.28)}
  .modal-title{font-size:1rem;font-weight:700;color:#1d3557}
  .modal-url{font-size:.7rem;color:#8fa0b5;font-family:'Courier New',monospace;margin:.25rem 0 1rem}
  .modal-qr{width:min(70vw,240px);height:min(70vw,240px);margin:0 auto;border:1px solid #e0e6ef;border-radius:8px;padding:8px}
  .modal-qr svg{width:100%;height:100%;display:block}
  .modal-close{display:inline-block;margin-top:1.1rem;padding:.45rem 1.4rem;border-radius:20px;
    border:1.5px solid #c2cfe0;color:#4a6fa5;text-decoration:none;font-size:.85rem}
  .modal-close:hover{background:#f0f4fb}
</style>
</head>
<body>
  <header class="header">
    <div class="ward-name">${esc(data.wardName)}</div>
    <div class="ward-sub">${DISCLAIMER}</div>
    <div class="divider"></div>
  </header>
  <main class="links">${cards}</main>
  <section class="master">
    <div class="master-label">Scan to share this page</div>
    <div class="master-title">${esc(title)}</div>
    <div class="master-qr">${masterQr}</div>
    <div class="master-url">${esc(masterText)}</div>
  </section>
  <footer class="footer">
    Powered by Wardest · <a href="/p/${esc(data.prefix)}/print">Printable version</a>
  </footer>
</body>
</html>`;
}
