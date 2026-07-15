import type { PortalData, PortalCard } from '../types';
import { esc, go4Url, GO4_HOST } from '../lib/html';
import { qrSvg } from '../lib/qr';

export type PrintSize = 'letter' | 'a4' | 'tabloid' | 'poster-18x24' | 'poster-24x36';

// page = @page size; fs = root font-size. Everything else is in `em`, so a larger fs scales
// the whole (vector) layout up for posters without any rasterization.
const SIZES: Record<PrintSize, { page: string; fs: string }> = {
  letter: { page: '8.5in 11in', fs: '12pt' },
  a4: { page: '210mm 297mm', fs: '12pt' },
  tabloid: { page: '11in 17in', fs: '16pt' },
  'poster-18x24': { page: '18in 24in', fs: '26pt' },
  'poster-24x36': { page: '24in 36in', fs: '34pt' },
};

export function isPrintSize(s: string): s is PrintSize {
  return Object.prototype.hasOwnProperty.call(SIZES, s);
}

function rowHtml(card: PortalCard): string {
  const href = card.short_slug ? go4Url(card.short_slug) : (card.url ?? '#');
  const shortText = card.short_slug ? `${GO4_HOST}/${card.short_slug}` : '';
  return `
    <div class="plink">
      <div class="qr">${qrSvg(href)}</div>
      <div class="meta">
        <div class="plabel">${esc(card.title)}</div>
        ${shortText ? `<div class="purl">${esc(shortText)}</div>` : ''}
      </div>
    </div>`;
}

export function renderPortalPrint(data: PortalData, size: PrintSize): string {
  const { page, fs } = SIZES[size];
  const title = data.portalTitle ?? `${data.wardName} Links`;
  const masterUrl = data.portalSlug
    ? go4Url(data.portalSlug)
    : `https://app.wardest.com/p/${data.prefix}`;
  const masterText = data.portalSlug
    ? `${GO4_HOST}/${data.portalSlug}`
    : `app.wardest.com/p/${data.prefix}`;
  const rows = data.cards.map(rowHtml).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${esc(title)} — Print (${size})</title>
<style>
  @page{size:${page};margin:0}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%}
  body{font-family:Georgia,serif;font-size:${fs};color:#2c3a4a;min-height:100vh;
    background:linear-gradient(160deg,#eef2f8,#dbe3ef);
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
    display:flex;flex-direction:column;align-items:center;padding:1.3em 1.5em 1.6em}
  .ward-name{font-size:2.2em;font-weight:700;color:#1d3557;text-align:center;line-height:1.1}
  .ward-sub{font-size:.62em;color:#6b7a8d;letter-spacing:.08em;text-transform:uppercase;text-align:center;margin-top:.5em}
  .divider{width:8em;height:.18em;background:#c9b882;border-radius:.1em;margin:.7em auto 1.1em}
  .links{width:100%;max-width:44em;display:flex;flex-direction:column;gap:.55em}
  .plink{display:flex;align-items:center;gap:.9em;background:rgba(255,255,255,.97);
    border:1px solid #dde3ed;border-radius:.7em;padding:.55em .8em}
  .plink .qr{width:5em;height:5em;flex-shrink:0;background:#fff;border:1px solid #eee;border-radius:.3em;padding:.18em}
  .plink .qr svg{width:100%;height:100%;display:block}
  .plabel{font-size:1.2em;font-weight:700;color:#1d3557;line-height:1.2}
  .purl{font-size:.82em;color:#8fa0b5;font-family:'Courier New',monospace;margin-top:.15em}
  .pmaster{margin-top:1.1em;background:#1d3557;color:#fff;border-radius:1em;
    padding:1.1em 1.3em;display:flex;flex-direction:column;align-items:center;gap:.5em}
  .pmaster-label{font-size:.7em;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9b882}
  .pmaster-title{font-size:1.1em;font-weight:700;text-align:center}
  .pmaster .qr{width:12em;height:12em;background:#fff;border-radius:.5em;padding:.4em}
  .pmaster .qr svg{width:100%;height:100%;display:block}
  .pmaster-url{font-size:.78em;color:#9fb0c6;font-family:'Courier New',monospace}
</style>
</head>
<body>
  <div class="ward-name">${esc(data.wardName)}</div>
  <div class="ward-sub">Not an official website of The Church of Jesus Christ of Latter-day Saints</div>
  <div class="divider"></div>
  <div class="links">${rows}</div>
  <div class="pmaster">
    <div class="pmaster-label">Scan to open this page</div>
    <div class="pmaster-title">${esc(title)}</div>
    <div class="qr">${qrSvg(masterUrl)}</div>
    <div class="pmaster-url">${esc(masterText)}</div>
  </div>
</body>
</html>`;
}
