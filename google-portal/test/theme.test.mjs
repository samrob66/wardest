// 2.3: the ward's look on every portal page (decision 20). Settings theme_background_url,
// theme_accent, theme_font and theme_heading_font; blank keeps today's look.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPortal, setSetting } from './harness.mjs';
import { GP_DIR, PAGE_NAMES } from '../build.mjs';

const BG = 'https://example.github.io/rb1links/background.png';

function themed(values = {}) {
  const gp = loadPortal({ seed: true });
  const v = { theme_background_url: BG, theme_accent: '#2f5d50', theme_font: 'Lora', ...values };
  for (const [k, val] of Object.entries(v)) setSetting(gp, k, val);
  return gp;
}

describe('theme settings', () => {
  it('Set up adds the five rows (blank)', () => {
    const gp = loadPortal({ seed: true });
    const keys = gp.fakes.spreadsheet.rowsOf('Settings').map((r) => r.Key);
    for (const k of ['theme_background_url', 'theme_accent', 'theme_font', 'theme_heading_font', 'form_template_url']) expect(keys).toContain(k);
    const s = gp.settings_();
    for (const k of ['theme_background_url', 'theme_accent', 'theme_font', 'theme_heading_font', 'form_template_url']) expect(s[k]).toBe('');
  });

  it('a ward on 2.2 that only pastes Code.gs gets the rows from its next job', () => {
    const gp = loadPortal({ seed: true });
    const sh = gp.fakes.spreadsheet.getSheetByName('Settings');
    const t = gp.table_(sh);
    t.removeMany(t.rows().filter((r) => String(r.Key).startsWith('theme_') || r.Key === 'form_template_url'));
    gp.fakes.props.set('SCHEMA_VERSION', 'phase-2.2');
    gp.gpBegin_();
    gp.gpTenMinute();
    const keys = gp.fakes.spreadsheet.rowsOf('Settings').map((r) => r.Key);
    expect(keys).toContain('theme_background_url');
    expect(keys).toContain('form_template_url');
    expect(gp.fakes.props.get('SCHEMA_VERSION')).toBe(gp.GP_VERSION);
  });

  it('blank keeps today\'s look: no theme block, no font link', () => {
    const gp = loadPortal({ seed: true });
    for (const name of PAGE_NAMES) {
      const html = gp.renderPage_(name, gp.settings_(), false);
      expect(html).not.toContain('fonts.googleapis.com');
      expect(html).not.toContain('id="gp-theme"');
    }
  });

  it('valid values reach every page as CSS variables, with one Google Fonts link', () => {
    const gp = themed({ theme_heading_font: 'Playfair Display' });
    for (const name of PAGE_NAMES) {
      const html = gp.renderPage_(name, gp.settings_(), name === 'leader');
      expect(html).toContain('<style id="gp-theme">');
      expect(html).not.toContain('url(&quot;'); // CSS is not HTML-escaped inside <style>
      // 2.5: the picture is the band across the top; text sits on plain paper below it.
      expect(html).toContain(`--gp-band: url("${BG}")`);
      expect(html).not.toContain('--gp-bg:');
      expect(html).not.toContain('--gp-panel');
      expect(html).toContain('--gp-accent: #2f5d50');
      expect(html).toContain("--gp-font: 'Lora', Georgia, 'Times New Roman', serif");
      expect(html).toContain("--gp-heading-font: 'Playfair Display', Georgia, 'Times New Roman', serif");
      const links = html.match(/<link [^>]*fonts\.googleapis\.com[^>]*>/g) || [];
      expect(links).toEqual(['<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora&amp;family=Playfair+Display&amp;display=swap">']);
      // The theme comes after gp.css, inside <head>.
      expect(html.indexOf('id="gp-theme"')).toBeGreaterThan(html.indexOf('--gp-ink'));
      expect(html.indexOf('id="gp-theme"')).toBeLessThan(html.indexOf('</head>'));
    }
  });

  it('a dark accent also colours links and buttons; a light one only rules and bars', () => {
    const dark = themed().renderPage_('serve', themed().settings_(), false);
    expect(dark).toContain('--gp-link: #2f5d50');
    expect(dark).toContain('--gp-button: #2f5d50');
    const gp = themed({ theme_accent: '#c9e8d0' });
    const light = gp.renderPage_('serve', gp.settings_(), false);
    expect(light).toContain('--gp-accent: #c9e8d0');
    expect(light).toContain('--gp-bar: #c9e8d0');
    expect(light).not.toContain('--gp-link: #c9e8d0');
    expect(light).not.toContain('--gp-button: #c9e8d0');
  });

  it('only one value set: only that one is used', () => {
    const gp = loadPortal({ seed: true });
    setSetting(gp, 'theme_accent', '#2f5d50');
    const html = gp.renderPage_('help', gp.settings_(), false);
    expect(html).toContain('--gp-accent: #2f5d50');
    expect(html).not.toContain('--gp-band: url("http'); // gp.css's own drawn band only
    expect(html).not.toContain('fonts.googleapis.com');
  });

  it('bad values are ignored (nothing injected) and Check health reports each as PROBLEM', () => {
    const bad = {
      theme_background_url: 'https://example.test/a.png");}body{color:red',
      theme_accent: 'red',
      theme_font: 'Lora;}</style><script>x()</script>',
      theme_heading_font: 'A very long font name that goes past forty characters',
    };
    const gp = themed(bad);
    const html = gp.renderPage_('serve', gp.settings_(), false);
    expect(html).not.toContain('id="gp-theme"');
    expect(html).not.toContain('color:red');
    expect(html).not.toContain('x()');
    expect(html).not.toContain('fonts.googleapis.com');
    const lines = gp.gpMenuCheckHealth().filter((l) => /theme_/.test(l));
    expect(lines).toHaveLength(4);
    for (const l of lines) expect(l).toMatch(/^PROBLEM /);
    for (const k of Object.keys(bad)) expect(lines.some((l) => l.includes(k))).toBe(true);
  });

  it('only https pictures: javascript:, data: and http: are refused', () => {
    for (const u of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'http://example.test/a.png', 'https://exa mple.test/a.png', "https://example.test/a'.png", 'https://example.test/a\\b.png']) {
      const gp = themed({ theme_background_url: u });
      const html = gp.renderPage_('serve', gp.settings_(), false);
      expect(html).not.toContain('--gp-band: url("' + u);
      expect(html.match(/--gp-band:/g)).toHaveLength(1); // gp.css's own drawn band only
      expect(gp.gpMenuCheckHealth().some((l) => l.startsWith('PROBLEM') && l.includes('theme_background_url'))).toBe(true);
    }
  });

  it('valid theme values give no theme PROBLEM line in Check health', () => {
    const gp = themed({ theme_heading_font: 'Playfair Display' });
    expect(gp.gpMenuCheckHealth().filter((l) => /theme_/.test(l) && l.startsWith('PROBLEM'))).toEqual([]);
  });

  it('Make hub files writes the themed pages', () => {
    const gp = themed();
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    gp.gpMenuMakeHubFiles();
    const serve = [...gp.fakes.drive.files.values()].find((f) => f.name === 'serve.html' && !f.trashed).content;
    expect(serve).toContain('id="gp-theme"');
    expect(serve).toContain(BG);
  });

  it('gp.css draws the band from --gp-band (a drawn stand-in by default) and uses the theme variables', () => {
    const css = readFileSync(join(GP_DIR, 'pages', 'gp.css'), 'utf8');
    expect(css).toMatch(/--gp-band:\s*url\("data:image\/svg\+xml,/);
    expect(css).toMatch(/body::before\s*\{[^}]*height:\s*300px/);
    expect(css).toMatch(/body::before\s*\{[^}]*background-image:\s*var\(--gp-band\)/);
    expect(css).toMatch(/@media \(min-width: 900px\)\s*\{\s*body::before\s*\{\s*height:\s*380px/);
    expect(css).toMatch(/var\(--gp-button, var\(--gp-heading\)\)/);
    expect(css).toMatch(/var\(--gp-heading-font, var\(--gp-font\)\)/);
    expect(css).toMatch(/@media print\s*\{[^]*body::before/);
  });

  it('nothing from a real ward is in the portal sources', () => {
    for (const f of ['gp.css', ...PAGE_NAMES.map((n) => n + '.html')]) {
      // The real ward's short name, town and background picture, spelled indirectly so this
      // file stays clean for the same search.
      const banned = new RegExp(['bTQ0', 'bWFwbGV0b24=', 'cGFzdHVyZXM='].map((b) => Buffer.from(b, 'base64').toString()).join('|'), 'i');
      expect(readFileSync(join(GP_DIR, 'pages', f), 'utf8')).not.toMatch(banned);
    }
  });
});

