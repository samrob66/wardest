// The public Service Opportunities page /serve/<prefix> (spec §5.1). No sign-in. Counts only:
// never names, emails or private details. noindex (layout meta + X-Robots-Tag in the route).
import { esc } from '../lib/html';
import { iconSvg } from '../lib/serviceCategories';
import type { ServeEntry, ServeSection } from '../lib/serve';
import { displayUrl, safeHref } from '../lib/urls';
import { qrSvg } from '../lib/qr';
import { layout } from './layout';
import { fillBar, VOL_CSS } from './volCommon';
import { publicNav } from './volPublic';

export const PUBLIC_SERVICE_CSS = `<style>
  main{max-width:60rem}
  .serve-grid{display:grid;grid-template-columns:1fr;gap:0 1.5rem}
  @media (min-width:760px){.serve-grid.pair{grid-template-columns:1fr 1fr}}
  .serve-h{color:#1d3557;font-size:1.15rem;margin:1.4rem 0 .5rem;padding-bottom:.35rem;border-bottom:2px solid #c9b882}
  .entry{display:block;text-decoration:none;color:inherit}
  .entry:hover{box-shadow:0 6px 20px rgba(29,53,87,.13)}
  .entry .top{display:flex;align-items:center;gap:.6rem}
  .entry .ico{width:36px;height:36px;flex-shrink:0}.entry .ico svg{width:100%;height:100%}
  .entry .cat{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7a8d}
  .entry .title{font-weight:700;color:#1d3557}
  .filledtag{font-size:.72rem;border-radius:20px;padding:.1rem .5rem;background:#e9f5ec;color:#2b6b43;margin-left:.4rem}
  .qrfoot{margin:2rem auto 0;max-width:22rem;text-align:center;background:#1d3557;color:#fff;border-radius:16px;padding:1.2rem}
  .qrfoot .qr{width:170px;height:170px;margin:.6rem auto;background:#fff;border-radius:10px;padding:8px}
  .qrfoot .qr svg{width:100%;height:100%;display:block}
  .qrfoot a{color:#c9b882;font-family:'Courier New',monospace;font-size:.85rem}
  .qrfoot .label{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9b882}
  .bigbtn{display:inline-block;padding:.85rem 1.6rem;border-radius:28px;background:#1d3557;color:#fff;font-size:1.05rem;text-decoration:none;margin:.4rem 0}
</style>`;

// The QR + link for posters, at the bottom of the serve and help pages.
export function qrFooter(label: string, url: string): string {
  const href = safeHref(url);
  return `<section class="qrfoot">
    <div class="label">${esc(label)}</div>
    <div class="qr">${qrSvg(href)}</div>
    <a href="${esc(href)}">${esc(displayUrl(url))}</a>
  </section>`;
}

function entryHtml(e: ServeEntry): string {
  return `<a class="card entry" href="/v/${esc(e.publicId)}">
    <div class="top"><span class="ico">${iconSvg(e.categoryIcon)}</span>
      <span><span class="cat">${esc(e.categoryName ?? e.orgName)}</span><br>
        <span class="title">${esc(e.title)}</span>${e.filled ? '<span class="filledtag">Filled</span>' : ''}</span></div>
    <div class="muted" style="margin-top:.3rem">${esc(e.when)}</div>
    ${fillBar(e.confirmed, e.needed)}
  </a>`;
}

function sectionHtml(s: ServeSection): string {
  return `<div><h2 class="serve-h">${esc(s.label)}</h2>
    ${s.audience === 'youth' || s.audience === 'children' ? '<p class="muted" style="margin-top:0">A parent signs up for their child.</p>' : ''}
    ${s.entries.map(entryHtml).join('')}</div>`;
}

export function renderServePage(o: {
  wardName: string;
  prefix: string;
  sections: ServeSection[];
  shareUrl: string; // the ward's short link, else this page's address
  createHref: string | null; // signed-in leaders who may create in a category
}): string {
  const by = new Map(o.sections.map((s) => [s.audience, s]));
  const top = [by.get('brothers'), by.get('sisters')].filter((s): s is ServeSection => !!s);
  const bottom = [by.get('youth'), by.get('children')].filter((s): s is ServeSection => !!s);
  const body = o.sections.length
    ? `${top.length ? `<div class="serve-grid${top.length === 2 ? ' pair' : ''}">${top.map(sectionHtml).join('')}</div>` : ''}
       ${bottom.length ? `<div class="serve-grid${bottom.length === 2 ? ' pair' : ''}">${bottom.map(sectionHtml).join('')}</div>` : ''}`
    : '<div class="card"><p>No open opportunities right now.</p></div>';
  return layout({
    title: 'Service Opportunities',
    nav: publicNav(o.prefix),
    head: VOL_CSS + PUBLIC_SERVICE_CSS,
    body: `<h1>Service Opportunities</h1>
      <p class="muted" style="margin-top:0">${esc(o.wardName)}</p>
      ${o.createHref ? `<p><a class="bigbtn" href="${esc(o.createHref)}">Create Service Opportunity</a></p>` : ''}
      ${body}
      ${qrFooter('Scan to open this page', o.shareUrl)}`,
  });
}
