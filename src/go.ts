import { Hono } from 'hono';
import type { Env } from './types';
import { normalizeSlug } from './lib/slug';
import { lookupShortLink } from './lib/db';
import { notFoundPage } from './views/notfound';

// go4.cc — the shortener. KV mirror is the fast path; D1 is the fallback + source of truth.
export const go = new Hono<{ Bindings: Env }>();

go.get('/robots.txt', (c) =>
  c.text('User-agent: *\nDisallow:\n', 200, { 'content-type': 'text/plain; charset=utf-8' }),
);

go.get('/favicon.ico', (c) => c.body(null, 204));

go.get('/', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.redirect('https://wardest.com', 302);
});

go.get('/:slug', async (c) => {
  const slug = normalizeSlug(c.req.param('slug'));

  // 1) KV fast path — only active links are mirrored here.
  const hit = await c.env.GO4_LINKS.get(slug);
  if (hit) {
    c.header('Cache-Control', 'no-store'); // links are editable; never cache the redirect
    return c.redirect(hit, 302);
  }

  // 2) D1 fallback — re-checks disabled + ward status, then backfills KV.
  const row = await lookupShortLink(c.env, slug);
  if (row && row.disabled === 0 && row.ward_status === 'active') {
    await c.env.GO4_LINKS.put(slug, row.destination_url);
    c.header('Cache-Control', 'no-store');
    return c.redirect(row.destination_url, 302);
  }

  return c.html(notFoundPage(slug), 404);
});

export default go;
