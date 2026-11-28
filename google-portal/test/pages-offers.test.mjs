// Runs the serve and help pages' own scripts against a tiny fake DOM and a canned API answer, to
// check the Christmas giving card (decision 17) shows on Serve only when the API lists an offer,
// and never on Help.
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { buildPage } from '../build.mjs';

class FakeNode {
  constructor(tag, text) {
    this.tagName = tag;
    this.attrs = {};
    this.children = [];
    this.className = '';
    this.text = text === undefined ? '' : text;
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  addEventListener() {}
  querySelector() {
    return null;
  }
  set innerHTML(v) {
    if (v === '') this.children = [];
  }
  set textContent(v) {
    this.children = [];
    this.text = String(v);
  }
  get textContent() {
    return this.text + this.children.map((c) => c.textContent).join('');
  }
  /** Every node below this one, depth first. */
  all() {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
}

function runPage(name, answer) {
  const nodes = { 'gp-main': new FakeNode('div'), 'gp-serve': new FakeNode('a'), 'gp-footer': new FakeNode('footer') };
  const document = {
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (t) => new FakeNode('#text', t),
    getElementById: (id) => nodes[id] || null,
  };
  const ctx = vm.createContext({ document, window: { location: { hash: '' } }, console });
  const scripts = [...buildPage(name).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) =>
    m[1].replace(/\{\{FALLBACK\}\}/g, 'false').replace(/\{\{WEB_APP_URL\}\}/g, '"https://script.example.test/exec"').replace(/\{\{[A-Z_]+\}\}/g, '"x"')
  );
  vm.runInContext(scripts[0], ctx);
  // A synchronous stand-in for the web app.
  ctx.GP.call = () => ({ then: (ok) => ok(answer) });
  vm.runInContext(scripts[1], ctx);
  return nodes['gp-main'];
}

const OFFER = { id: 'christmas-giving', label: 'Offer to give at Christmas', icon: '🎁', url: 'https://docs.example.test/forms/d/e/pub-form9/viewform' };
const POST = { publicId: 'pubmeals01', title: 'Meals for the Sample family', organization: 'Relief Society', audiences: ['Sisters'], firstDate: '2026-12-03', lastDate: '2026-12-03', filled: 0, needed: 1, full: false };
const links = (root) => root.all().filter((n) => n.tagName === 'a');

describe('serve page: Christmas giving card', () => {
  it('shows a small card at the top (under the filter buttons), linking to the form, when the API lists an offer', () => {
    const main = runPage('serve', { ok: true, posts: [POST], offers: [OFFER] });
    expect(main.children[0].className).toBe('gp-filters');
    const first = main.children[1];
    expect(first.tagName).toBe('a');
    expect(first.attrs.href).toBe(OFFER.url);
    expect(first.textContent).toContain('🎁');
    expect(first.textContent).toContain('Offer to give at Christmas');
    // The posts still follow.
    expect(main.textContent).toContain('Meals for the Sample family');
    expect(main.textContent.indexOf('Offer to give at Christmas')).toBeLessThan(main.textContent.indexOf('Meals for the Sample family'));
  });

  it('also shows when there are no posts', () => {
    const main = runPage('serve', { ok: true, posts: [], offers: [OFFER] });
    expect(main.textContent).toContain('Offer to give at Christmas');
    expect(main.textContent).toContain('Nothing to sign up for right now');
  });

  it('has no card when there is no offer (unticked, or an older script without offers)', () => {
    for (const answer of [{ ok: true, posts: [POST], offers: [] }, { ok: true, posts: [POST] }]) {
      const main = runPage('serve', answer);
      expect(main.textContent).not.toContain('Offer to give at Christmas');
      expect(links(main).map((a) => a.attrs.href)).not.toContain(OFFER.url);
    }
  });
});

describe('help page', () => {
  it('never shows an offer, whatever the answer carries', () => {
    const tiles = [{ id: 'moving', name: 'Moving help', icon: '🚚', url: 'https://docs.example.test/forms/d/e/pub-form1/viewform' }];
    const main = runPage('help', { ok: true, tiles, offers: [OFFER] });
    expect(main.textContent).not.toContain('Offer to give at Christmas');
    expect(links(main).map((a) => a.attrs.href)).toEqual([tiles[0].url]);
  });
});
