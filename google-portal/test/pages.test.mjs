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

// ---------- rendering pages against fixtures (a tiny DOM, enough for el()/show()) ----------

class FakeNode {
  constructor(doc, tag) {
    Object.assign(this, { doc, tagName: tag, children: [], attrs: {}, listeners: {}, className: '', _text: '', value: '', checked: false, disabled: false });
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'id') this.doc.ids[v] = this;
  }
  getAttribute(k) {
    return this.attrs[k];
  }
  addEventListener(t, f) {
    (this.listeners[t] = this.listeners[t] || []).push(f);
  }
  set textContent(v) {
    this.children = [];
    this._text = String(v);
  }
  get textContent() {
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set innerHTML(v) {
    this.children = [];
    this._text = '';
  }
  set id(v) {
    this.setAttribute('id', v);
  }
  querySelector() {
    return null;
  }
  all() {
    return [this, ...this.children.flatMap((c) => c.all())];
  }
}

/** Runs a built page's scripts with fetch answering from fixtures; resolves to the fake document. */
async function renderPage(name, hash, answers) {
  const doc = { ids: {}, title: '' };
  doc.createElement = (t) => new FakeNode(doc, t);
  doc.createTextNode = (t) => {
    const n = new FakeNode(doc, '#text');
    n._text = String(t);
    return n;
  };
  doc.getElementById = (id) => doc.ids[id] || null;
  for (const id of ['gp-main', 'gp-title', 'gp-back', 'gp-footer']) doc.createElement('div').setAttribute('id', id);
  const fetch = async (url, opts) => {
    const action = opts && opts.body ? JSON.parse(opts.body).action : /[?&]api=([a-z]+)/.exec(url)[1];
    const body = answers[action];
    return { ok: true, json: async () => (typeof body === 'function' ? body(opts && opts.body && JSON.parse(opts.body)) : body) };
  };
  const ctx = vm.createContext({ document: doc, window: { location: { hash }, confirm: () => true, scrollTo() {} }, fetch, console, setTimeout, Promise });
  const html = buildPage(name);
  for (const [, js] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(js.replace(/\{\{FALLBACK\}\}/g, 'false').replace(/\{\{WEB_APP_URL\}\}/g, '"https://script.example.test/exec"').replace(/\{\{[A-Z_]+\}\}/g, '"x"'), ctx);
  }
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
  return doc;
}

const WARD = { name: 'Riverbend 1st Ward (example)', contact: 'help@riverbend.example' };
const slot = (over = {}) => ({ slotId: 's1', date: '2026-12-03', start: '17:00', end: '18:00', role: 'Help with games', needed: 10, filled: 2, roleNote: '', bringingPrompt: '', full: false, past: false, ...over });
const post = (over = {}) => ({ publicId: 'pubkids', title: 'Primary activity', organization: 'Primary', audiences: ['Children'], publicNote: 'Games night.', cutoffHours: 24, status: 'Open', slots: [slot()], ...over });

describe('post.html', () => {
  it('a Children post asks "Who is serving?" and sends the child first name', async () => {
    let sent = null;
    const doc = await renderPage('post', '#p=pubkids', {
      post: { ok: true, ward: WARD, post: post() },
      signup: (body) => {
        sent = body;
        return { ok: true, message: 'Thanks. Check your email to finish or see your sign-up.' };
      },
    });
    const main = doc.ids['gp-main'];
    expect(main.textContent).toContain('Who is serving?');
    expect(main.textContent).toContain('My child');
    const child = doc.ids['gp-child'];
    expect(child).toBeTruthy();
    // Pick the role, "My child", type the names, submit.
    const nodes = main.all();
    nodes.find((n) => n.tagName === 'input' && n.attrs.name === 'gp-slot').listeners.change[0]();
    const mine = nodes.find((n) => n.tagName === 'input' && n.attrs.name === 'gp-who' && n.value === 'child');
    mine.checked = true;
    mine.listeners.change[0]();
    child.value = 'Ana';
    doc.ids['gp-name'].value = 'Sister Parent';
    doc.ids['gp-email'].value = 'parent@example.test';
    nodes.find((n) => n.tagName === 'form').listeners.submit[0]({ preventDefault() {} });
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
    expect(sent).toMatchObject({ action: 'signup', childName: 'Ana', name: 'Sister Parent', slotId: 's1' });
    expect(main.textContent).toContain('Thanks. Check your email to finish or see your sign-up.');
  });

  it('a Sisters post has no child field, shows no waiting count, and an over-filled role reads "12 of 10"', async () => {
    const doc = await renderPage('post', '#p=pubkids', {
      post: { ok: true, ward: WARD, post: post({ audiences: ['Sisters'], slots: [slot({ filled: 12, full: true }), slot({ slotId: 's2', date: '2026-12-04' })] }) },
    });
    const text = doc.ids['gp-main'].textContent;
    expect(doc.ids['gp-child']).toBeUndefined();
    expect(text).not.toContain('Who is serving?');
    expect(text).not.toMatch(/waiting/i);
    expect(text).toContain('12 of 10');
  });
});

describe('serve.html', () => {
  it('Brothers and Sisters side by side, Youth and Children with the parent line, category icons', async () => {
    const card = (id, audiences, over = {}) => ({ publicId: id, title: 'Post ' + id, organization: 'Relief Society', category: 'meals', categoryName: 'Meals', categoryIcon: '🍲', audiences, firstDate: '2026-12-03', lastDate: '2026-12-03', needed: 4, filled: 1, full: false, status: 'Open', ...over });
    const doc = await renderPage('serve', '', {
      serve: { ok: true, ward: WARD, posts: [card('a', ['Brothers', 'Sisters']), card('b', ['Children'])] },
    });
    const main = doc.ids['gp-main'];
    const nodes = main.all();
    const pair = nodes.find((n) => / gp-pair|^gp-pair/.test(n.className));
    expect(pair).toBeTruthy();
    expect(pair.textContent).toContain('Brothers');
    expect(pair.textContent).toContain('Sisters');
    expect(main.textContent).toContain('A parent signs up for their child');
    expect(main.textContent).toContain('🍲');
    expect(main.textContent).not.toContain('Youth');
  });
});

const tick = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};
const click = (node) => node.listeners.click[0]();
const byText = (root, tag, text) => root.all().find((n) => n.tagName === tag && n.textContent === text);

describe('leader.html', () => {
  const whoami = (access) => ({
    ok: true,
    leader: { name: 'Sister Example', calling: 'Relief Society President', organization: 'Relief Society' },
    access: { isBishopric: false, isCouncil: true, canApprove: true, createOrgs: ['Relief Society'], baseCreateOrgs: ['Relief Society'], editOrgs: ['Relief Society'], catOrgs: {}, coordinates: [], ...access },
    organizations: ['Relief Society', 'Primary'],
    categories: [{ id: 'meals', name: 'Meals', icon: '🍲', audiences: ['Sisters'] }, { id: 'children', name: 'Primary help', icon: '🧸', audiences: ['Children'] }],
    defaults: { cutoffHours: 24 },
  });
  const listPosts = {
    ok: true,
    posts: [
      {
        postId: 'p1', publicId: 'pub1', publicUrl: 'post.html#p=pub1', title: 'Meals', organization: 'Relief Society', category: 'meals', audiences: ['Sisters'], status: 'Open', canEdit: true, firstDate: '2026-12-03',
        slots: [{ slotId: 's1', date: '2026-12-03', start: '17:00', end: '', role: 'Bring a meal', needed: 10, filled: 7, waiting: 3 }],
        signups: [
          { signupId: 'a', slotId: 's1', name: 'Brother New', childName: '', label: 'Brother New', status: 'Waiting-approval', email: 'brother.new@example.test' },
          { signupId: 'b', slotId: 's1', name: 'Sister Parent', childName: 'Ana', label: 'Ana (signed up by Sister Parent)', status: 'Confirmed', email: 'parent@example.test' },
        ],
      },
    ],
  };

  it('shows waiting counts and statuses, and the phase 2 tabs work', async () => {
    let decided = null;
    const doc = await renderPage('leader', '#k=' + 'a'.repeat(64), {
      whoami: whoami({}),
      listPosts,
      waiting: { ok: true, volunteers: [{ email: 'brother.new@example.test', name: 'Brother New', firstPost: 'Meals', firstPostOrganization: 'Relief Society', signups: [{ title: 'Meals', date: '2026-12-03', start: '17:00', role: 'Bring a meal', childName: '' }] }] },
      decide: (body) => {
        decided = body;
        return { ok: true, message: 'Approved. 1 sign-up now counts. We emailed Brother New.' };
      },
      needsHelp: { ok: true, rows: [{ title: 'Meals', organization: 'Relief Society', date: '2026-12-03', start: '17:00', end: '', role: 'Bring a meal', filled: 7, needed: 10, publicUrl: 'post.html#p=pub1' }] },
    });
    const main = doc.ids['gp-main'];
    expect(main.textContent).toContain('7 of 10 · 3 waiting');
    expect(main.textContent).toContain('Ana (signed up by Sister Parent)');
    expect(main.textContent).toContain('Waiting for approval');
    expect(main.textContent).not.toContain('Send details');
    expect(byText(main, 'button', 'Volunteers')).toBeUndefined();
    click(byText(main, 'button', 'Waiting for approval'));
    await tick();
    expect(main.textContent).toContain('brother.new@example.test');
    click(byText(main, 'button', 'Approve'));
    await tick();
    expect(decided).toMatchObject({ action: 'decide', email: 'brother.new@example.test', decision: 'approve' });
    expect(main.textContent).toContain('Approved. 1 sign-up now counts.');
    click(byText(main, 'button', 'Needs help soon'));
    await tick();
    expect(main.textContent).toContain('7 of 10 filled');
    click(byText(main, 'button', 'New opportunity'));
    await tick();
    expect(main.textContent).toContain('Category');
    expect(main.textContent).toContain('Who is serving');
  });

  it('a coordinator only picks their categories; the bishopric gets Volunteers with Undo and Revoke', async () => {
    const coord = await renderPage('leader', '#k=' + 'a'.repeat(64), {
      whoami: { ...whoami({ isCouncil: false, canApprove: false, createOrgs: ['Relief Society'], baseCreateOrgs: [], editOrgs: [], catOrgs: { meals: ['Relief Society'] }, coordinates: ['meals'] }), categories: [{ id: 'meals', name: 'Meals', icon: '🍲', audiences: ['Sisters'] }] },
      listPosts: { ok: true, posts: [] },
    });
    const main = coord.ids['gp-main'];
    expect(byText(main, 'button', 'Waiting for approval')).toBeUndefined();
    click(byText(main, 'button', 'New opportunity'));
    await tick();
    expect(coord.ids['gp-cat'].children.map((o) => o.value)).toEqual(['meals']);
    expect(coord.ids['gp-org'].children.map((o) => o.value)).toEqual(['Relief Society']);

    const bish = await renderPage('leader', '#k=' + 'a'.repeat(64), {
      whoami: whoami({ isBishopric: true }),
      listPosts: { ok: true, posts: [] },
      volunteers: {
        ok: true,
        volunteers: [
          { email: 'a@example.test', name: 'A Person', status: 'Declined', decidedBy: 'Bishop Example', decidedAt: '2026-12-01 10:00', emailConfirmed: true, firstPost: 'Meals' },
          { email: 'b@example.test', name: 'B Person', status: 'Approved', decidedBy: 'Sister Example', decidedAt: '2026-12-01 10:00', emailConfirmed: true, firstPost: 'Meals' },
        ],
      },
    });
    const bmain = bish.ids['gp-main'];
    click(byText(bmain, 'button', 'Volunteers'));
    await tick();
    expect(byText(bmain, 'button', 'Undo decline')).toBeTruthy();
    expect(byText(bmain, 'button', 'Revoke')).toBeTruthy();
  });
});

describe('me.html', () => {
  it('lists upcoming sign-ups with details and cancel, other ways to serve, and past ones', async () => {
    let cancelled = null;
    const doc = await renderPage('me', '#t=' + 'b'.repeat(64), {
      me: {
        ok: true,
        name: 'Sister Approved',
        upcoming: [{ title: 'Meals', publicUrl: 'post.html#p=pub1', date: '2026-12-03', start: '17:00', end: '', role: 'Bring a meal', childName: '', bringing: 'Soup', status: 'Confirmed', others: ['Sister'], privateDetails: '123 Example Lane', cancelToken: 'c'.repeat(64) }],
        past: [{ title: 'Old', publicUrl: 'post.html#p=old', date: '2026-11-03', start: '', end: '', role: 'Helper', childName: 'Ana', bringing: '', status: 'Confirmed', others: [] }],
        otherWays: [{ title: 'Clean the building', filled: 1, needed: 4, url: 'post.html#p=o' }],
      },
      cancel: (body) => {
        cancelled = body;
        return { ok: true, message: 'Your sign-up is cancelled. Thank you for letting us know.' };
      },
    });
    const main = doc.ids['gp-main'];
    for (const s of ['Coming up', '123 Example Lane', 'Also serving: Sister', 'Other ways to serve', 'Clean the building', '1 of 4 filled', 'Past', 'for Ana']) expect(main.textContent).toContain(s);
    click(byText(main, 'button', 'Cancel'));
    await tick();
    expect(cancelled).toMatchObject({ action: 'cancel', t: 'c'.repeat(64) });
  });

  it('without a link it offers "Email me my link"', async () => {
    const doc = await renderPage('me', '', {});
    expect(doc.ids['gp-main'].textContent).toContain('Email me my link');
  });
});
