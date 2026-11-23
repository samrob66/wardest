import { describe, it, expect, afterEach, vi } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, makeWard, asUser } from './helpers';
import { fixture, futureDate } from './volFixtures';
import { DISCLAIMER, siteFooter } from '../src/views/footer';
import { Hono } from 'hono';
import { installErrorPages } from '../src/views/errorPages';
import { appSite } from '../src/app';

// General Handbook 38.8.21.2: an online resource made to help with callings must say it is not
// an official, Church-sponsored product, and should give contact information.
const TEXT =
  'WardForward is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.';

async function page(url: string, init?: RequestInit): Promise<{ status: number; html: string }> {
  const res = await SELF.fetch(url, init);
  return { status: res.status, html: await res.text() };
}

const mutable = env as unknown as { CONTACT_EMAIL?: string };
afterEach(() => {
  mutable.CONTACT_EMAIL = '';
});

describe('independence disclaimer on every surface', () => {
  it('has the exact wording', () => {
    expect(DISCLAIMER).toBe(TEXT);
  });

  it('landing (wardforward.com)', async () => {
    const r = await page('http://wardforward.com/');
    expect(r.status).toBe(200);
    expect(r.html).toContain(TEXT);
  });

  it('app layout page (signed out and signed in)', async () => {
    expect((await page('http://localhost/')).html).toContain(TEXT);
    const w = await makeWard(env);
    expect((await page('http://localhost/', { headers: { cookie: await asUser(w.founderId) } })).html).toContain(TEXT);
  });

  it('public portal and its print layouts', async () => {
    const w = await makeWard(env);
    const portal = await page(`http://localhost/p/${w.prefix}`);
    expect(portal.status).toBe(200);
    expect(portal.html).toContain(TEXT);
    for (const size of ['letter', 'poster-24x36']) {
      const p = await page(`http://localhost/p/${w.prefix}/print?size=${size}`);
      expect(p.status, size).toBe(200);
      expect(p.html, size).toContain(TEXT);
    }
  });

  it('a /v/ public post page', async () => {
    const fx = await fixture({ date: futureDate() });
    const r = await page(`http://localhost/v/${fx.publicId}`);
    expect(r.status).toBe(200);
    expect(r.html).toContain(TEXT);
  });

  it('a /vol/ volunteer page', async () => {
    const fx = await fixture({ date: futureDate() });
    const r = await page(`http://localhost/vol/${fx.prefix}/me`);
    expect(r.status).toBe(200);
    expect(r.html).toContain(TEXT);
  });

  it('the not-found page', async () => {
    const r = await page('http://localhost/p/no-such-ward-here');
    expect(r.status).toBe(404);
    expect(r.html).toContain(TEXT);
  });
});

describe('unknown paths and errors are branded pages with the disclaimer', () => {
  it('an unknown path on the app host -> 404 HTML page', async () => {
    const res = await SELF.fetch('http://localhost/no/such/page');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type') ?? '').toContain('text/html');
    const html = await res.text();
    expect(html).toContain(TEXT);
    expect(html).toContain("This link doesn't exist");
  });

  it('an unknown path on the landing host -> 404 HTML page', async () => {
    const res = await SELF.fetch('http://wardforward.com/x');
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain(TEXT);
  });

  it('a thrown error in a real app route -> 500 HTML page, logged, message not leaked', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = new Proxy(env.DB, {
      get(target, prop) {
        if (prop === 'prepare') return () => { throw new Error('secret db detail'); };
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
    const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
    // A route on appSite itself and routes mounted from the volunteer sub-app.
    for (const path of ['/p/m44', '/v/abc123', '/vol/m44/me']) {
      const res = await appSite.fetch(new Request('http://localhost' + path), { ...env, DB: broken }, ctx);
      expect(res.status, path).toBe(500);
      const html = await res.text();
      expect(html, path).toContain(TEXT);
      expect(html, path).not.toContain('secret db detail');
      expect(html, path).not.toMatch(/at \w+ \(/); // no stack
    }
    expect(err.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('secret db detail');
    err.mockRestore();
  });

  it('installErrorPages gives any Hono app the same 404 and 500 pages', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = new Hono();
    app.get('/boom', () => { throw new Error('kaboom'); });
    installErrorPages(app);
    const boom = await app.request('/boom');
    expect(boom.status).toBe(500);
    const html = await boom.text();
    expect(html).toContain(TEXT);
    expect(html).not.toContain('kaboom');
    const missing = await app.request('/nope');
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain(TEXT);
    err.mockRestore();
  });
});

describe('contact line', () => {
  it('is hidden when CONTACT_EMAIL is empty', async () => {
    mutable.CONTACT_EMAIL = '';
    const r = await page('http://localhost/');
    expect(r.html).toContain(TEXT);
    expect(r.html).not.toContain('mailto:');
    expect(siteFooter()).not.toContain('Contact');
  });

  it('shows an escaped mailto link when CONTACT_EMAIL is set', async () => {
    mutable.CONTACT_EMAIL = ' help+"wf"@example.test ';
    const r = await page('http://localhost/');
    expect(r.html).toContain('Contact: <a href="mailto:help+&quot;wf&quot;@example.test">help+&quot;wf&quot;@example.test</a>');
    expect(r.html).not.toContain('"wf"@');
    const landing = await page('http://wardforward.com/');
    expect(landing.html).toContain('mailto:help+&quot;wf&quot;@example.test');
  });
});
