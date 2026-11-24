import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { GP_DIR, PAGE_NAMES, buildPage } from '../build.mjs';

const PAGE_FOOTER = 'This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.';
const read = (f) => readFileSync(join(GP_DIR, 'pages', f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

function loadGP() {
  const ctx = vm.createContext({ window: {}, document: undefined, console });
  vm.runInContext(read('gp.js'), ctx);
  return ctx.GP;
}

describe('gp.js pure helpers', () => {
  const GP = loadGP();

  it('expandDates picks the weekdays between two dates', () => {
    expect(plain(GP.expandDates('2026-12-01', '2026-12-14', [1, 3]))).toEqual(['2026-12-02', '2026-12-07', '2026-12-09', '2026-12-14']);
    expect(plain(GP.expandDates('2026-12-01', '2026-12-03', []))).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']);
    expect(GP.expandDates('2026-12-01', '2028-12-01', [0, 1, 2, 3, 4, 5, 6])).toHaveLength(100);
    expect(plain(GP.expandDates('2026-12-05', '2026-12-01', [1]))).toEqual([]);
    expect(plain(GP.expandDates('nope', '2026-12-01', [1]))).toEqual([]);
  });

  it('groupByAudience lists a post in each of its audiences, full posts last', () => {
    const posts = [
      { publicId: 'a', audiences: ['Youth', 'Children'], full: true },
      { publicId: 'b', audiences: ['Youth'], full: false },
      { publicId: 'c', audiences: ['Sisters'], full: false },
    ];
    const g = plain(GP.groupByAudience(posts));
    expect(Object.keys(g)).toEqual(['Brothers', 'Sisters', 'Youth', 'Children']);
    expect(g.Youth.map((p) => p.publicId)).toEqual(['b', 'a']);
    expect(g.Children.map((p) => p.publicId)).toEqual(['a']);
    expect(g.Brothers).toEqual([]);
  });

  it('formats dates and times', () => {
    expect(GP.fmtDate('2026-12-03')).toBe('Thu, Dec 3');
    expect(GP.fmtTime('00:30')).toBe('12:30 AM');
    expect(GP.fmtTime('12:00')).toBe('12:00 PM');
    expect(GP.fmtTime('18:30')).toBe('6:30 PM');
    expect(GP.fmtTime('')).toBe('');
  });

  it('parses a hash and builds page addresses both ways', () => {
    expect(plain(GP.parseHash('#k=abc&p=x%20y'))).toEqual({ k: 'abc', p: 'x y' });
    GP.init({ page: 'serve', webAppUrl: 'https://script.example.test/exec', fallback: false });
    expect(GP.pageUrl('post', { p: 'abc' })).toBe('post.html#p=abc');
    GP.init({ page: 'serve', webAppUrl: 'https://script.example.test/exec', fallback: true });
    expect(GP.pageUrl('post', { p: 'abc' })).toBe('https://script.example.test/exec?page=post#p=abc');
    expect(GP.pageUrl('serve')).toBe('https://script.example.test/exec?page=serve');
  });
});

describe('page files', () => {
  for (const name of PAGE_NAMES) {
    it(`${name}.html has noindex, placeholders, the footer and the build markers`, () => {
      const html = read(`${name}.html`);
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).toContain('name="viewport"');
      expect(html).toContain('{{WARD_NAME}}');
      expect(html).toContain('{{CONTACT_EMAIL}}');
      expect(html).toContain('{{PAGE_TITLE}}');
      expect(html).toContain('{{WEB_APP_URL}}');
      expect(html).toContain('{{FALLBACK}}');
      expect(html).toContain('property="og:title" content="{{WARD_NAME}} · {{PAGE_TITLE}}"');
      expect(html).toContain('{{PREVIEW_IMAGE}}');
      expect(html).toContain(PAGE_FOOTER);
      expect(html).toContain('<!-- GP:CSS -->');
      expect(html).toContain('<!-- GP:JS -->');
    });
  }

  it('every inline script compiles once placeholders are filled', () => {
    for (const name of PAGE_NAMES) {
      const html = buildPage(name);
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      expect(scripts.length).toBe(2);
      for (const js of scripts) {
        const filled = js.replace(/\{\{FALLBACK\}\}/g, 'false').replace(/\{\{[A-Z_]+\}\}/g, '"x"');
        expect(() => new vm.Script(filled, { filename: `${name}.html` })).not.toThrow();
      }
    }
  });

  it('never puts data into innerHTML', () => {
    for (const f of [...PAGE_NAMES.map((n) => `${n}.html`), 'gp.js']) {
      const uses = read(f).match(/innerHTML[^;\n]*/g) || [];
      for (const u of uses) expect(u.trim()).toBe("innerHTML = ''");
    }
  });

  it('never uses eval-like sinks', () => {
    for (const f of [...PAGE_NAMES.map((n) => `${n}.html`), 'gp.js']) {
      const text = read(f);
      expect(text).not.toMatch(/outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/);
    }
  });

  it('gp.css starts with recolourable variables and keeps buttons tall', () => {
    const css = read('gp.css');
    expect(css.indexOf(':root')).toBeLessThan(200);
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it('the hub sections snippet links serve.html and help.html with QR placeholders', () => {
    const html = read('hub-sections.html');
    for (const s of ['Service Opportunities', 'Service Requests', 'serve.html', 'help.html', 'serve-qr.png', 'help-qr.png', '{{SERVE_SHORT_LINK}}', '{{HELP_SHORT_LINK}}']) {
      expect(html).toContain(s);
    }
  });
});
