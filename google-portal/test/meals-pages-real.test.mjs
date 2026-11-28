// 2.6 (decision 28), plan task 4: the post page and the leader page against the REAL script's
// answers (gpApi through the harness), not stubs. Invented fixtures only.
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { buildPage } from '../build.mjs';
import { loadPortal, seedPost } from './harness.mjs';

class FakeNode {
  constructor(doc, tag, text) {
    this.doc = doc;
    this.tagName = tag;
    this.attrs = {};
    this.children = [];
    this.className = '';
    this.listeners = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.text = text === undefined ? '' : String(text);
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'id') {
      this.id = String(v);
      if (this.doc) this.doc.ids[v] = this;
    }
    if (k === 'class') this.className = String(v);
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  querySelector(sel) {
    const m = /^\[data-focus="(.+)"\]$/.exec(sel);
    return m ? this.all().find((n) => n.attrs['data-focus'] === m[1]) || null : null;
  }
  focus() {
    FakeNode.active = this;
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
  fire(type, ev = {}) {
    for (const fn of this.listeners[type] || []) fn({ preventDefault() {}, target: this, ...ev });
  }
}

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};
const plain = (x) => JSON.parse(JSON.stringify(x));
const PIC = 'https://img.example.test/welcome-baby.jpg';
const LEADER = 'sister.example@example.test';

/** Runs a built page with GP.call answered by the real script (gpApi), as google.script.run would. */
async function openPage(name, hash, gp) {
  const doc = { ids: {} };
  doc.createElement = (t) => new FakeNode(doc, t);
  doc.createTextNode = (t) => new FakeNode(null, '#text', t);
  doc.getElementById = (id) => doc.ids[id] || null;
  doc.addEventListener = () => {};
  doc.visibilityState = 'visible';
  Object.defineProperty(doc, 'activeElement', { get: () => FakeNode.active || null });
  for (const id of ['gp-main', 'gp-title', 'gp-back', 'gp-footer', 'gp-pic', 'gp-head']) doc.createElement('div').setAttribute('id', id);
  FakeNode.active = null;
  const window = { location: { hash }, confirm: () => true, scrollTo: () => {}, addEventListener: () => {} };
  const ctx = vm.createContext({ document: doc, window, console, setTimeout, Promise });
  const scripts = [...buildPage(name).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) =>
    m[1].replace(/\{\{FALLBACK\}\}/g, 'false').replace(/\{\{WEB_APP_URL\}\}/g, '"https://script.example.test/exec"').replace(/\{\{[A-Z_]+\}\}/g, '"x"')
  );
  vm.runInContext(scripts[0], ctx);
  const calls = [];
  ctx.GP.call = (action, data) => {
    calls.push(action);
    return Promise.resolve(plain(gp.gpApi({ ...plain(data || {}), action })));
  };
  ctx.GP.copyText = () => {};
  vm.runInContext(scripts[1], ctx);
  await settle();
  const main = doc.ids['gp-main'];
  return {
    doc,
    main,
    calls,
    find: (pred) => main.all().find(pred),
    findAll: (pred) => main.all().filter(pred),
    button: (label) => main.all().find((n) => n.tagName === 'button' && n.textContent === label),
    click: async (node) => {
      node.fire('click');
      await settle();
    },
  };
}

/** A published meal post, still hidden from Serve, in a category with a picture. */
function mealWard() {
  const gp = loadPortal({ seed: true });
  const cats = gp.serviceTab_('Categories');
  cats.update(cats.find('Id', 'meals-new-moms'), { Picture: PIC });
  seedPost(
    gp,
    {
      'Post id': 'pm',
      'Public id': 'pubmeal26',
      Category: 'meals-new-moms',
      Title: 'Meals for the Example family',
      Audiences: 'Sisters',
      'Public note': 'Meals start about 3 days after baby comes; every other day.',
      'Private details': '1 Example Lane, 555-0100',
      'Show on Serve': 'No',
      Allergies: 'Peanuts, shellfish',
      'Food likes': 'Soups',
      Serves: 'Feeds 2 adults, 3 kids',
      'Drop-off window': '5:30–6:30 pm',
      'Drop-off': 'Quiet',
      'Coordinate with': 'Anna and Ben',
      'Family emails': 'anna@example.test, ben@example.test',
    },
    [{ 'Slot id': 'pm-s1', Date: '2026-12-08' }, { 'Slot id': 'pm-s2', Date: '2026-12-10' }]
  );
  return gp;
}
const postRow = (gp) => gp.fakes.spreadsheet.rowsOf('Posts').find((p) => p['Post id'] === 'pm');

describe('meals pages against the real script (2.6)', () => {
  it('public post: picture above the title, the meal block with allergies first, no address or phone; Serve leaves it out', async () => {
    const gp = mealWard();
    const page = await openPage('post', '#p=pubmeal26', gp);
    const pic = page.doc.ids['gp-pic'];
    expect(pic.className).toBe('');
    expect(pic.all().find((n) => n.tagName === 'img').attrs.src).toBe(PIC);
    const meal = page.find((n) => n.className === 'gp-meal');
    expect(meal).toBeTruthy();
    expect(meal.children[0].className).toBe('gp-meal-row gp-allergy');
    expect(meal.children[0].textContent).toBe('AllergiesPeanuts, shellfish');
    expect(meal.textContent).toContain('Quiet drop-off — text on arrival');
    expect(meal.textContent).toContain('Anna and Ben');
    expect(page.main.textContent).not.toContain('Example Lane');
    expect(page.main.textContent).not.toContain('555-0100');
    expect(page.main.textContent).not.toContain('anna@example.test');
    // The meal block sits after the organization line, before the note and the sign-up rows.
    expect(page.main.children[0].children.map((c) => c.className)).toEqual(['gp-meta', 'gp-meal', 'gp-note']);
    const serve = await openPage('serve', '', gp);
    expect(serve.main.textContent).not.toContain('Meals for the Example family');
  });

  it('leader: the switch (off) and the open checklist; turning it on ticks Shown on portal and the post shows on Serve', async () => {
    const gp = mealWard();
    const k = gp.issueToken_('leader', LEADER, '2027-01-01 00:00');
    const page = await openPage('leader', '#k=' + k, gp);
    await page.click(page.find((n) => n.tagName === 'button' && n.className === 'gp-pcard' && n.textContent.includes('Example family')));
    expect(page.find((n) => n.tagName === 'img').attrs.src).toBe(PIC);
    expect(page.find((n) => n.className === 'gp-meal').children[0].textContent).toBe('AllergiesPeanuts, shellfish');
    const sw = () => page.find((n) => n.attrs.role === 'switch' && n.attrs['data-focus'] === 'show-sw');
    expect(sw().attrs['aria-checked']).toBe('false');
    expect('open' in page.find((n) => n.tagName === 'details').attrs).toBe(true);
    const rows = () => page.findAll((n) => /^gp-prow( |$)/.test(n.className));
    expect(rows().map((r) => r.children[1].children[0].textContent)).toEqual(['Parents reviewed', 'Sent to ministering sisters', 'Shown on portal', 'Ward email sent', 'Posted on Discord']);
    const auto = () => rows()[2].children[0];
    expect(auto().checked).toBe(false);
    expect(auto().disabled).toBe(true);

    await page.click(sw());
    expect(sw().attrs['aria-checked']).toBe('true');
    expect(auto().checked).toBe(true);
    expect(rows()[2].textContent).toMatch(/by Sister Example, (Sun|Mon|Tue|Wed|Thu|Fri|Sat), Dec 1, \d{1,2}:\d{2} (AM|PM)/);
    expect(String(postRow(gp)['Show on Serve'])).toBe('Yes');
    const serve = await openPage('serve', '', gp);
    expect(serve.main.textContent).toContain('Meals for the Example family');

    // A hand tick records who and when.
    const reviewed = rows()[0].children[0];
    reviewed.checked = true;
    reviewed.fire('change');
    await settle();
    expect(rows()[0].children[0].checked).toBe(true);
    expect(rows()[0].textContent).toContain('by Sister Example, ');
  });

  it('leader form: Save changes round-trips meal, family emails and Show on Serve; an edit is saved to the sheet', async () => {
    const gp = mealWard();
    const k = gp.issueToken_('leader', LEADER, '2027-01-01 00:00');
    const page = await openPage('leader', '#k=' + k, gp);
    const before = { ...postRow(gp) };
    await page.click(page.find((n) => n.tagName === 'button' && n.className === 'gp-pcard' && n.textContent.includes('Example family')));
    await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
    await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === 'Edit'));
    expect(page.find((n) => n.id === 'gp-m-allergies').value).toBe('Peanuts, shellfish');
    expect(page.find((n) => n.id === 'gp-family').value).toBe('anna@example.test, ben@example.test');
    expect(page.find((n) => n.id === 'gp-show').checked).toBe(false);
    await page.click(page.button('Save changes'));
    expect(page.main.textContent).toContain('Published.');
    const after = postRow(gp);
    for (const col of ['Allergies', 'Food likes', 'Serves', 'Drop-off window', 'Drop-off', 'Coordinate with', 'Family emails', 'Show on Serve']) {
      expect([col, String(after[col])]).toEqual([col, String(before[col])]);
    }

    // Change the allergies, the family emails and the box, then save again.
    await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
    await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === 'Edit'));
    const a = page.find((n) => n.id === 'gp-m-allergies');
    a.value = 'Peanuts';
    a.fire('input');
    const fam = page.find((n) => n.id === 'gp-family');
    fam.value = 'anna@example.test';
    fam.fire('input');
    const show = page.find((n) => n.id === 'gp-show');
    show.checked = true;
    show.fire('change');
    await page.click(page.button('Save changes'));
    expect(page.main.textContent).toContain('Published.');
    const row = postRow(gp);
    expect(row.Allergies).toBe('Peanuts');
    expect(String(row['Family emails'])).toBe('anna@example.test');
    expect(String(row['Show on Serve'])).toBe('Yes');
    expect(row['Coordinate with']).toBe('Anna and Ben');
  });
});
