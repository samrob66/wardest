import { Hono } from 'hono';
import type { Env, PortalData } from './types';
import { normalizeSlug } from './lib/slug';
import { esc } from './lib/html';
import { getWardByPrefix, getPublicSpace, getPortalCards, getPortalShortSlug } from './lib/db';
import { renderPortal } from './views/portal';
import { renderPortalPrint, isPrintSize, type PrintSize } from './views/portalprint';
import { notFoundPage } from './views/notfound';

// app.wardest.com — the app. Phase 0: public portal render (screen + print).
export const appSite = new Hono<{ Bindings: Env }>();

// Dev/landing stub for app root (real dashboard arrives in Phase 1).
appSite.get('/', (c) =>
  c.html(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<meta name="robots" content="noindex"><title>Wardest</title>` +
      `<style>body{font-family:Georgia,serif;color:#2c3a4a;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.6}` +
      `a{color:#4a6fa5}h1{color:#1d3557}</style></head><body>` +
      `<h1>Wardest</h1><p>The app is coming soon. Sign in (coming soon).</p>` +
      `<p>Live demo portal: <a href="/p/m44">/p/m44</a> · ` +
      `<a href="/p/m44/print?size=letter">print</a></p></body></html>`,
  ),
);

appSite.get('/p/:prefix', async (c) => {
  const prefix = normalizeSlug(c.req.param('prefix'));
  const data = await loadPortal(c.env, prefix);
  if (!data) return c.html(notFoundPage(prefix), 404);
  c.header('X-Robots-Tag', 'noindex');
  return c.html(renderPortal(data));
});

appSite.get('/p/:prefix/print', async (c) => {
  const prefix = normalizeSlug(c.req.param('prefix'));
  const raw = (c.req.query('size') ?? 'letter').toLowerCase();
  const size: PrintSize = isPrintSize(raw) ? raw : 'letter';
  const data = await loadPortal(c.env, prefix);
  if (!data) return c.html(notFoundPage(prefix), 404);
  c.header('X-Robots-Tag', 'noindex');
  return c.html(renderPortalPrint(data, size));
});

async function loadPortal(env: Env, prefix: string): Promise<PortalData | null> {
  const ward = await getWardByPrefix(env, prefix);
  if (!ward) return null;
  const space = await getPublicSpace(env, ward.id);
  if (!space || space.portal_published === 0) return null;
  const [cards, portalSlug] = await Promise.all([
    getPortalCards(env, space.id),
    getPortalShortSlug(env, space.id),
  ]);
  return {
    wardName: ward.name,
    prefix: ward.prefix,
    portalTitle: space.portal_title,
    cards,
    portalSlug,
  };
}

// esc is re-exported implicitly via view modules; keep import used for lint clarity.
void esc;

export default appSite;
