// 2.3.3: a post for more than one audience shows once, under "Everyone" (decision 23).
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { buildPage } from '../build.mjs';
import { loadPortal, seedPost } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));

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
  all() {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
}

function runServe(answer) {
  const nodes = { 'gp-main': new FakeNode('div'), 'gp-footer': new FakeNode('footer') };
  const document = {
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (t) => new FakeNode('#text', t),
    getElementById: (id) => nodes[id] || null,
  };
  const ctx = vm.createContext({ document, window: { location: { hash: '' } }, console });
  const scripts = [...buildPage('serve').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) =>
    m[1].replace(/\{\{FALLBACK\}\}/g, 'false').replace(/\{\{WEB_APP_URL\}\}/g, '"https://script.example.test/exec"').replace(/\{\{[A-Z_]+\}\}/g, '"x"')
  );
  vm.runInContext(scripts[0], ctx);
  ctx.GP.call = () => ({ then: (ok) => ok(answer) });
  vm.runInContext(scripts[1], ctx);
  return nodes['gp-main'];
}

const P = (id, audiences, over = {}) => ({
  publicId: id,
  title: 'Post ' + id,
  organization: 'Relief Society',
  audiences,
  firstDate: '2026-12-03',
  lastDate: '2026-12-03',
  filled: 1,
  needed: 4,
  full: false,
  ...over,
});

/** [heading, [card titles]] for each section, in page order. */
function sections(main) {
  return main
    .all()
    .filter((n) => n.tagName === 'section')
    .map((sec) => [sec.children.find((c) => c.tagName === 'h2').textContent, sec.all().filter((n) => n.tagName === 'h3').map((h) => h.textContent)]);
}

describe('Service Opportunities page: Everyone (decision 23)', () => {
  it('a Brothers+Sisters post shows once, under Everyone, with "Brothers · Sisters"; a Sisters-only post only under Sisters', () => {
    const main = runServe({ ok: true, labels: { everyone: 'Everyone' }, posts: [P('meal', ['Sisters', 'Brothers']), P('sis', ['Sisters'])] });
    expect(sections(main)).toEqual([
      ['Everyone', ['Post meal']],
      ['Sisters', ['Post sis']],
    ]);
    const card = main.all().find((n) => n.tagName === 'a' && n.textContent.includes('Post meal'));
    expect(card.textContent).toContain('Brothers · Sisters');
    // Its fill bar and count once, with the post's real numbers.
    expect(card.textContent.match(/1 of 4 filled/g)).toHaveLength(1);
    expect(main.textContent.match(/Post meal/g)).toHaveLength(1);
    // A single-audience card has no audience line.
    const sis = main.all().find((n) => n.tagName === 'a' && n.textContent.includes('Post sis'));
    expect(sis.textContent).not.toContain('·  Sisters');
    expect(sis.all().some((n) => n.className === 'gp-aud')).toBe(false);
  });

  it('a Youth+Children post shows once under Everyone with "Youth · Children"', () => {
    const main = runServe({ ok: true, posts: [P('yc', ['Children', 'Youth'])] });
    expect(sections(main)).toEqual([['Everyone', ['Post yc']]]);
    expect(main.textContent).toContain('Youth · Children');
  });

  it('section order: giving card, Everyone, Brothers | Sisters, Youth, Children; empty sections hidden; filled last', () => {
    const main = runServe({
      ok: true,
      offers: [{ id: 'christmas-giving', label: 'Offer to give at Christmas', icon: '🎁', url: 'https://example.test/f' }],
      posts: [
        P('child', ['Children']),
        P('all-full', ['Brothers', 'Sisters'], { full: true, filled: 4 }),
        P('youth', ['Youth']),
        P('bro', ['Brothers']),
        P('all', ['Brothers', 'Sisters', 'Youth', 'Children']),
      ],
    });
    expect(main.children[0].textContent).toContain('Offer to give at Christmas');
    expect(sections(main)).toEqual([
      ['Everyone', ['Post all', 'Post all-full']],
      ['Brothers', ['Post bro']],
      ['Youth', ['Post youth']],
      ['Children', ['Post child']],
    ]);
    expect(main.textContent).toContain('Brothers · Sisters · Youth · Children');
  });

  it('an Everyone card for Youth or Children carries the parent line; one without them does not', () => {
    const PARENT = 'A parent signs up for their child';
    const main = runServe({ ok: true, posts: [P('yc', ['Youth', 'Children']), P('by', ['Brothers', 'Youth']), P('bs', ['Brothers', 'Sisters'])] });
    const card = (id) => main.all().find((n) => n.tagName === 'a' && n.textContent.includes('Post ' + id));
    expect(card('yc').textContent).toContain(PARENT);
    expect(card('by').textContent).toContain(PARENT);
    expect(card('bs').textContent).not.toContain(PARENT);
    // The parent line comes right under the audience line.
    const kids = card('by').children.filter(Boolean).map((c) => c.className);
    expect(kids.indexOf('gp-aud') + 1).toBe(kids.indexOf('gp-meta gp-parent'));
    // The Everyone section heading itself has no parent line.
    const everyone = main.all().find((n) => n.tagName === 'section');
    expect(everyone.children.filter((c) => c && c.tagName === 'p' && c.textContent === PARENT)).toEqual([]);
  });

  it('the section name comes from the API (TEXT.everyone), so a ward can rename it', () => {
    const main = runServe({ ok: true, labels: { everyone: 'All members' }, posts: [P('meal', ['Sisters', 'Brothers'])] });
    expect(sections(main)).toEqual([['All members', ['Post meal']]]);
  });

  it('apiServe_ carries the label', () => {
    const gp = loadPortal({ seed: true });
    expect(plain(gp.apiServe_()).labels).toEqual({ everyone: 'Everyone' });
  });
});

describe('audit: other lists show a multi-audience post once', () => {
  function ward() {
    const gp = loadPortal({ seed: true });
    seedPost(gp, { Audiences: 'Sisters, Brothers, Youth' }, [{ 'Slot id': 'm1', Date: '2026-12-03', Needed: 4 }]);
    seedPost(gp, { 'Post id': 'p2', 'Public id': 'pub2', Title: 'Second post', Audiences: 'Sisters' }, [{ 'Slot id': 'x1', Date: '2026-12-04', Needed: 2 }]);
    return gp;
  }

  it('apiServe_ lists each post once (the page does the grouping)', () => {
    const gp = ward();
    const posts = plain(gp.apiServe_()).posts;
    expect(posts.map((p) => p.publicId).sort()).toEqual(['pub2', 'pubmeals01']);
  });

  it('Other ways to serve (emails, My sign-ups) lists each post once', () => {
    const gp = ward();
    const d = gp.volunteerData_();
    const other = plain(gp.otherWays_(gp.settings_(), d, 'p2'));
    expect(other.map((o) => o.title)).toEqual(['Meals for the Sample family']);
  });

  it('Needs help soon lists each short role once', () => {
    const gp = ward();
    const rows = plain(gp.needsHelpRows_(gp.settings_()));
    expect(rows.filter((r) => r.title === 'Meals for the Sample family')).toHaveLength(1);
  });
});
