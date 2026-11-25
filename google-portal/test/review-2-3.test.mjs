// 2.3 review round 1: template copies carry nothing over; jobs from the editor only for the
// Service Sheet's owner; font links without weights; stricter contrast over a picture; a theme
// value is never treated as a placeholder.
import { describe, it, expect } from 'vitest';
import { loadPortal, setSetting, seedPost } from './harness.mjs';

const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
const filesOf = (gp) => sys(gp).rowsOf('Request files');

function templateWith(gp, extra) {
  const t = gp.FormApp.create('Branded template');
  t.theme = 'riverbend-green';
  t.addTextItem().setTitle('Old question');
  Object.assign(t, extra);
  return t;
}

function setUpWithTemplate(gp, t) {
  setSetting(gp, 'form_template_url', `https://docs.google.com/forms/d/${t.getId()}/edit`);
  gp.fakes.props.delete('SYSTEM_ID');
  gp.gpBegin_();
  gp.gpMenuSetUp();
}

describe('a copied template brings nothing of its own', () => {
  it('a template with a response destination, old responses and quiz mode ends with none of them', () => {
    const gp = loadPortal({ seed: true });
    const t = templateWith(gp, { destination: 'ss-old-responses', responses: ['r1', 'r2'], quiz: true });
    setUpWithTemplate(gp, t);
    for (const f of filesOf(gp)) {
      const form = gp.fakes.forms.get(f['Form id']);
      expect(form.theme).toBe('riverbend-green');
      expect(form.destination).toBe(null);
      expect(form.responses).toEqual([]);
      expect(form.quiz).toBe(false);
    }
    // The template keeps its own.
    expect(t.destination).toBe('ss-old-responses');
    expect(t.responses).toEqual(['r1', 'r2']);
  });

  it('when the copy opens but can\'t be emptied, the copy is trashed and a plain form is made', () => {
    const gp = loadPortal({ seed: true });
    const t = templateWith(gp, { failDeleteItem: true });
    setUpWithTemplate(gp, t);
    const copies = gp.fakes.drive.copies.filter((c) => c.from === t.getId());
    expect(copies.length).toBeGreaterThan(0);
    for (const c of copies) expect(gp.fakes.drive.files.get(c.to).trashed).toBe(true);
    for (const f of filesOf(gp)) {
      expect(copies.map((c) => c.to)).not.toContain(f['Form id']);
      expect(gp.fakes.forms.get(f['Form id']).items.map((i) => i.title)).not.toContain('Old question');
    }
    expect(gp.fakes.alerts.at(-1)).toContain('Could not copy the form template');
  });
});

describe('timed jobs from the editor: only the Service Sheet\'s owner', () => {
  function primed() {
    const gp = loadPortal({ seed: true });
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-11-20' }]); // a past date: gpHourly marks it Past
    return gp;
  }

  it('an editor of the Service Sheet who is not its owner cannot run gpHourly from the editor', () => {
    const gp = primed();
    gp.fakes.state.activeUser = 'brother.counselor@example.test';
    gp.fakes.state.effectiveUser = 'brother.counselor@example.test';
    gp.gpHourly();
    gp.gpHourly();
    gp.gpBegin_();
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Open');
    expect(gp.fakes.system.rowsOf('Log').filter((l) => l.What === 'job refused')).toHaveLength(1);
  });

  it('the owner can', () => {
    const gp = primed();
    gp.gpHourly();
    gp.gpBegin_();
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Past');
  });

  it('the project\'s own trigger still runs it, whoever the active user is', () => {
    const gp = primed();
    gp.gpMenuInstallTriggers();
    const hourly = gp.fakes.triggers.find((t) => t.handler === 'gpHourly');
    gp.fakes.state.activeUser = '';
    gp.gpHourly({ triggerUid: hourly.getUniqueId() });
    gp.gpBegin_();
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Past');
  });

  it('if Drive reports no owner, the earlier rule (active user = the account it runs as) applies', () => {
    const gp = primed();
    gp.fakes.drive.files.get(gp.fakes.spreadsheet.getId()).owner = null;
    gp.fakes.state.activeUser = 'brother.counselor@example.test';
    gp.fakes.state.effectiveUser = 'brother.counselor@example.test';
    gp.gpHourly();
    gp.gpBegin_();
    expect(gp.fakes.spreadsheet.rowsOf('Posts')[0].Status).toBe('Past');
  });
});

describe('theme: font links, contrast, placeholders', () => {
  const BG = 'https://example.github.io/rb1links/background.png';

  it('asks Google Fonts for the family only, with no weight list', () => {
    const gp = loadPortal({ seed: true });
    setSetting(gp, 'theme_font', 'Lora');
    setSetting(gp, 'theme_heading_font', 'Playfair Display');
    const html = gp.renderPage_('serve', gp.settings_(), false);
    expect(html).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora&amp;family=Playfair+Display&amp;display=swap">');
    expect(html).not.toContain('wght');
  });

  it('over a picture the accent colours links and buttons only at 5.3:1 or more; without one, 4.5:1 is enough', () => {
    // #2f7d4f is about 5.2:1 on white: enough without a picture, not with one.
    const plain = loadPortal({ seed: true });
    setSetting(plain, 'theme_accent', '#2f7d4f');
    const a = plain.renderPage_('serve', plain.settings_(), false);
    expect(a).toContain('--gp-link: #2f7d4f');
    const pic = loadPortal({ seed: true });
    setSetting(pic, 'theme_accent', '#2f7d4f');
    setSetting(pic, 'theme_background_url', BG);
    const b = pic.renderPage_('serve', pic.settings_(), false);
    expect(b).toContain('--gp-accent: #2f7d4f');
    expect(b).not.toContain('--gp-link: #2f7d4f');
    expect(b).not.toContain('--gp-button: #2f7d4f');
    setSetting(pic, 'theme_accent', '#2f5d50');
    expect(pic.renderPage_('serve', pic.settings_(), false)).toContain('--gp-link: #2f5d50');
  });

  it('muted text is at least 4.5:1 on the panel over a black picture', () => {
    const gp = loadPortal();
    const css = gp.GP_PAGES.serve;
    const muted = /--gp-muted:\s*(#[0-9a-fA-F]{6})/.exec(css)[1];
    // The panel is white at 0.92 over the wash over the picture; over pure black it is at least
    // 0.92 * 255 = 234.6 per channel.
    const ch = (h, i) => parseInt(h.substr(1 + 2 * i, 2), 16) / 255;
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const panel = L([0.92, 0.92, 0.92]);
    const text = L([0, 1, 2].map((i) => ch(muted, i)));
    expect((panel + 0.05) / (text + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it('a placeholder typed into a theme value is never filled in', () => {
    const gp = loadPortal({ seed: true });
    // Not a valid font, so it is not used at all; and a valid one can't hold braces.
    setSetting(gp, 'theme_font', '{{CONTACT_EMAIL}}');
    setSetting(gp, 'ward_name', 'Riverbend {{WEB_APP_URL}}');
    const html = gp.renderPage_('serve', gp.settings_(), false);
    expect(html).not.toContain('fonts.googleapis.com');
    // Ward name is escaped text, and the theme is added after filling: no second pass fills it.
    expect(html).toContain('Riverbend {{WEB_APP_URL}}');
  });
});
