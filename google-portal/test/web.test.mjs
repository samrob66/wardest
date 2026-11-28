import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost, setSetting } from './harness.mjs';

const json = (out) => JSON.parse(out.getContent());

function setup() {
  const gp = loadPortal({ seed: true });
  seedPost(gp, {}, [{ 'Slot id': 'm1' }]);
  return gp;
}

describe('doGet', () => {
  it('answers api=serve, post and ping as JSON', () => {
    const gp = setup();
    const out = gp.doGet({ parameter: { api: 'serve' } });
    expect(out.mime).toBe('JSON');
    const r = json(out);
    expect(r.ok).toBe(true);
    expect(r.posts).toHaveLength(1);
    expect(json(gp.doGet({ parameter: { api: 'post', p: 'pubmeals01' } })).post.title).toBe('Meals for the Sample family');
    expect(json(gp.doGet({ parameter: { api: 'ping' } }))).toEqual({ ok: true, at: '2026-12-01 10:00', build: gp.GP_BUILD });
  });

  it('serves the fallback pages with title and viewport', () => {
    const gp = setup();
    const out = gp.doGet({ parameter: { page: 'serve' } });
    expect(out.title).toBe('Service Opportunities · Riverbend 1st Ward (example)');
    expect(out.metas).toContainEqual(['viewport', 'width=device-width, initial-scale=1']);
    expect(out.html).toContain('fallback: true');
  });

  it('answers Not found for anything else', () => {
    const gp = setup();
    expect(json(gp.doGet({ parameter: {} }))).toEqual({ ok: false, error: 'Not found.' });
    expect(json(gp.doGet({ parameter: { api: 'signup' } }))).toEqual({ ok: false, error: 'Not found.' });
    expect(json(gp.doGet({ parameter: { page: 'admin' } }))).toEqual({ ok: false, error: 'Not found.' });
    expect(json(gp.doGet({}))).toEqual({ ok: false, error: 'Not found.' });
  });
});

describe('doPost and gpApi', () => {
  it('dispatches allowed actions from a JSON text body', () => {
    const gp = setup();
    const r = json(gp.doPost({ postData: { contents: JSON.stringify({ action: 'signup', publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' }) } }));
    expect(r.ok).toBe(true);
  });

  it('savePost through doPost takes its draft/publish/close choice as mode', () => {
    const gp = setup();
    const k = gp.issueToken_('leader', 'sister.example@example.test', '2027-01-01 00:00');
    const post = { organization: 'Relief Society', category: 'service-project', title: 'Meals', audiences: ['Sisters'], slots: [{ date: '2026-12-08', role: 'Cook', needed: 1 }] };
    const r = json(gp.doPost({ postData: { contents: JSON.stringify({ action: 'savePost', mode: 'publish', k, post }) } }));
    expect(r.ok).toBe(true);
    expect(gp.fakes.spreadsheet.rowsOf('Posts').find((p) => p['Post id'] === r.postId).Status).toBe('Open');
    const c = json(gp.doPost({ postData: { contents: JSON.stringify({ action: 'savePost', mode: 'close', k, post: { postId: r.postId } }) } }));
    expect(c.ok).toBe(true);
  });

  it('refuses unknown actions and bad bodies', () => {
    const gp = setup();
    expect(json(gp.doPost({ postData: { contents: '{"action":"nope"}' } }))).toEqual({ ok: false, error: 'Not found.' });
    expect(json(gp.doPost({ postData: { contents: '{"action":"serve"}' } }))).toEqual({ ok: false, error: 'Not found.' });
    expect(json(gp.doPost({ postData: { contents: 'not json' } }))).toEqual({ ok: false, error: 'Bad request.' });
    expect(json(gp.doPost({}))).toEqual({ ok: false, error: 'Bad request.' });
    expect(json(gp.doPost({ postData: { contents: '[1]' } }))).toEqual({ ok: false, error: 'Bad request.' });
  });

  it('gpApi also allows serve, post and help', () => {
    const gp = setup();
    expect(gp.gpApi({ action: 'serve' }).ok).toBe(true);
    expect(gp.gpApi({ action: 'post', p: 'pubmeals01' }).ok).toBe(true);
    expect(gp.gpApi({ action: 'help' }).ok).toBe(true);
    expect(gp.gpApi({ action: 'nope' })).toEqual({ ok: false, error: 'Not found.' });
  });

  it('a handler exception gives the generic message and one Log row, no details', () => {
    const gp = setup();
    gp.apiTokenInfo_ = () => {
      throw new Error('secret internals at row 7');
    };
    const r = json(gp.doPost({ postData: { contents: '{"action":"tokenInfo","t":"x"}' } }));
    expect(r).toEqual({ ok: false, error: 'Something went wrong. Please try again later or contact help@riverbend.example.' });
    const logs = gp.fakes.system.rowsOf('Log').filter((l) => l.What === 'api error');
    expect(logs).toHaveLength(1);
    expect(logs[0].Detail).toContain('tokenInfo');
  });

  it('a busy lock answers Busy', () => {
    const gp = setup();
    gp.fakes.lockBusy(true);
    const r = json(gp.doPost({ postData: { contents: JSON.stringify({ action: 'signup', publicId: 'pubmeals01', slotId: 'm1', name: 'A', email: 'a@example.test' }) } }));
    expect(r).toEqual({ ok: false, error: 'Busy, please try again.' });
  });
});

describe('renderPage_', () => {
  it('fills placeholders, escaped in HTML and JSON in scripts', () => {
    const gp = setup();
    const html = gp.renderPage_('serve', gp.settings_(), false);
    expect(html).toContain('<meta property="og:title" content="Riverbend 1st Ward (example) · Service Opportunities">');
    expect(html).toContain('webAppUrl: "https://script.example.test/macros/s/EXAMPLE/exec"');
    expect(html).toContain('fallback: false');
    expect(html).toContain('help@riverbend.example');
    expect(html).not.toContain('{{');
    expect(html).not.toContain('og:image');
  });

  it('escapes a ward name like <Riverbend & Co>', () => {
    const gp = setup();
    setSetting(gp, 'ward_name', '<Riverbend & Co>');
    setSetting(gp, 'preview_image_url', 'https://example.test/p.png?a=1&b="2"');
    const html = gp.renderPage_('post', gp.settings_(), true);
    expect(html).not.toContain('<Riverbend');
    expect(html).toContain('&lt;Riverbend &amp; Co&gt;');
    expect(html).toContain('wardName: "\\u003cRiverbend \\u0026 Co\\u003e"');
    expect(html).toContain('content="https://example.test/p.png?a=1&amp;b=&quot;2&quot;"');
  });

  it('renders the hub sections with the short links', () => {
    const gp = setup();
    setSetting(gp, 'serve_short_link', 'https://zippa.run/rb1Serve');
    const html = gp.renderHubSections_(gp.settings_());
    expect(html).toContain('zippa.run/rb1Serve');
    expect(html).not.toContain('{{');
  });

  it('gives each hub card a QR button with its short link', () => {
    const gp = setup();
    setSetting(gp, 'serve_short_link', 'https://short.example.test/rbServe');
    setSetting(gp, 'help_short_link', 'http://short.example.test/rbHelp');
    const html = gp.renderHubSections_(gp.settings_());
    expect(html).toContain(`openQR('Service Opportunities','https://short.example.test/rbServe')`);
    expect(html).toContain(`openQR('Service Requests','https://short.example.test/rbHelp')`);
    expect(html).toContain('<div class="gp-hub-link">short.example.test/rbServe</div>');
    expect(html).toContain('<div class="gp-hub-link">short.example.test/rbHelp</div>');
    expect(html).not.toMatch(/\.png/i);
  });

  it('leaves the QR button out of a card whose short link is blank, keeping its link', () => {
    const gp = setup();
    setSetting(gp, 'serve_short_link', '');
    setSetting(gp, 'help_short_link', 'https://short.example.test/rbHelp');
    const html = gp.renderHubSections_(gp.settings_());
    expect(html).not.toContain(`openQR('Service Opportunities'`);
    expect(html.match(/class="gp-hub-qr"/g)).toHaveLength(1);
    expect(html).toContain(`openQR('Service Requests','https://short.example.test/rbHelp')`);
    expect(html).toContain('href="serve.html"');
    expect(html).toContain('href="help.html"');
    expect(html).not.toMatch(/<div class="gp-hub-link"><\/div>/);
    expect(html).not.toContain("'https://'");
  });

  it('leaves both QR buttons out when neither short link is set', () => {
    const gp = setup();
    const html = gp.renderHubSections_(gp.settings_());
    expect(html).not.toMatch(/class="gp-hub-qr"/);
    expect(html).not.toContain('onclick="openQR(');
    expect(html).toContain('href="serve.html"');
    expect(html).toContain('href="help.html"');
    expect(html).not.toContain('{{');
  });

  it('leaves out the QR button for a short link that is not a plain address', () => {
    const gp = setup();
    setSetting(gp, 'serve_short_link', "https://short.example.test/x');alert(1);//");
    const html = gp.renderHubSections_(gp.settings_());
    expect(html).not.toContain(`openQR('Service Opportunities'`);
    expect(html).not.toMatch(/onclick="[^"]*alert/);
    expect(html).toContain('href="serve.html"');
  });
});
