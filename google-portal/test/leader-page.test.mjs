// 2.3.2: the leader page's own script on a small fake DOM (decision 22): Approve / Decline /
// Remove / Cancel this date on one line in that order; a stale link shows the relink box above
// the page without losing the form.
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { buildPage } from '../build.mjs';

class FakeNode {
  constructor(tag, text) {
    this.tagName = tag;
    this.attrs = {};
    this.children = [];
    this.className = '';
    this.listeners = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.text = text === undefined ? '' : text;
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'id') this.id = String(v);
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
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
  fire(type, ev = {}) {
    for (const fn of this.listeners[type] || []) fn({ preventDefault() {}, target: this, ...ev });
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));
async function settle() {
  for (let i = 0; i < 8; i++) await tick();
}

const WHOAMI = {
  ok: true,
  leader: { name: 'Brother Example', calling: 'Executive Secretary', organization: 'Bishopric' },
  access: { isBishopric: true, isCouncil: true, canApprove: true, createOrgs: ['Bishopric', 'Relief Society'], baseCreateOrgs: ['Bishopric', 'Relief Society'], editOrgs: ['Bishopric', 'Relief Society'], catOrgs: { 'service-project': ['Bishopric', 'Relief Society'] }, coordinates: [] },
  organizations: ['Bishopric', 'Relief Society'],
  categories: [{ id: 'service-project', name: 'Service project', icon: '', audiences: [] }],
  defaults: { cutoffHours: 24 },
};

function post(over = {}) {
  return {
    postId: 'p1',
    publicId: 'pub1',
    publicUrl: 'https://script.example.test/exec?page=post#p=pub1',
    title: 'Test – meal for a family',
    organization: 'Bishopric',
    category: 'service-project',
    audiences: ['Sisters'],
    status: 'Open',
    hasPrivateDetails: true,
    fromRequest: false,
    canEdit: true,
    firstDate: '2026-12-03',
    slots: [
      { slotId: 's1', date: '2026-12-03', start: '', end: '', role: 'Bring a meal', needed: 2, filled: 1, waiting: 1 },
      { slotId: 's2', date: '2026-12-03', start: '', end: '', role: 'Set up', needed: 1, filled: 0, waiting: 0 },
      { slotId: 's3', date: '2026-12-05', start: '', end: '', role: 'Bring a meal', needed: 2, filled: 1, waiting: 1 },
    ],
    signups: [
      { signupId: 'u1', slotId: 's1', name: 'Sister One', label: 'Sister One', status: 'Confirmed', canDecide: false, email: 'one@example.test' },
      { signupId: 'u2', slotId: 's1', name: 'Brother New', label: 'Brother New', status: 'Waiting-approval', canDecide: true, email: 'new@example.test' },
      { signupId: 'u3', slotId: 's3', name: 'Sister Two', label: 'Sister Two', status: 'Confirmed', canDecide: false, email: 'two@example.test' },
      { signupId: 'u4', slotId: 's3', name: 'Sister Late', label: 'Sister Late', status: 'Waiting-email', canDecide: false, email: 'late@example.test' },
    ],
    ...over,
  };
}

/** Loads leader.html with a fake DOM; answers is {action: answer | (data) => answer}. */
async function openLeader(answers) {
  const nodes = { 'gp-main': new FakeNode('div'), 'gp-footer': new FakeNode('footer') };
  const docListeners = {};
  const winListeners = {};
  const calls = [];
  const document = {
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (t) => new FakeNode('#text', t),
    getElementById: (id) => nodes[id] || null,
    addEventListener: (t, fn) => (docListeners[t] = docListeners[t] || []).push(fn),
    visibilityState: 'visible',
  };
  const window = {
    location: { hash: '#k=leaderlink' },
    confirm: () => true,
    scrollTo: () => {},
    addEventListener: (t, fn) => (winListeners[t] = winListeners[t] || []).push(fn),
  };
  const ctx = vm.createContext({ document, window, console, setTimeout, Promise });
  const scripts = [...buildPage('leader').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) =>
    m[1].replace(/\{\{FALLBACK\}\}/g, 'false').replace(/\{\{WEB_APP_URL\}\}/g, '"https://script.example.test/exec"').replace(/\{\{[A-Z_]+\}\}/g, '"x"')
  );
  vm.runInContext(scripts[0], ctx);
  ctx.GP.call = (action, data) => {
    calls.push([action, JSON.parse(JSON.stringify(data || {}))]);
    const a = answers[action];
    return Promise.resolve(typeof a === 'function' ? a(data) : a || { ok: true });
  };
  vm.runInContext(scripts[1], ctx);
  await settle();
  const main = nodes['gp-main'];
  return {
    main,
    calls,
    answers,
    find: (pred) => main.all().find(pred),
    findAll: (pred) => main.all().filter(pred),
    button: (label) => main.all().find((n) => n.tagName === 'button' && n.textContent === label),
    focus: async () => {
      for (const fn of winListeners.focus || []) fn();
      await settle();
    },
    settle,
  };
}

const rowButtons = (row) => row.all().filter((n) => n.tagName === 'button').map((n) => n.textContent);
const personRows = (page) => page.findAll((n) => n.className === 'gp-person');

describe('leader page: buttons on a person\'s line', () => {
  it('Approve, Decline, Remove, then Cancel this date on the date\'s last row, in that order', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [post()] } });
    const rows = personRows(page).map((r) => [r.children[0].textContent, rowButtons(r)]);
    expect(rows).toEqual([
      // Dec 3, Bring a meal
      ['Sister One', ['Remove']],
      ['Brother New', ['Approve', 'Decline', 'Remove']],
      // Dec 3, Set up: nobody yet, and it is the date's last row
      ['No one yet.', ['Cancel this date']],
      // Dec 5
      ['Sister Two', ['Remove']],
      ['Sister Late', ['Remove', 'Cancel this date']],
    ]);
    // The buttons sit together in one group on the line.
    for (const r of personRows(page)) {
      const groups = r.children.filter((c) => c.className === 'gp-actions');
      expect(groups.length).toBeLessThanOrEqual(1);
      if (groups.length) expect(r.children.at(-1)).toBe(groups[0]);
    }
  });

  it('no Approve/Decline without canDecide; no Remove or Cancel this date without edit rights', async () => {
    const p = post({ canEdit: false });
    p.signups = p.signups.map((s) => ({ ...s, email: undefined, canDecide: s.signupId === 'u2' }));
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [p] } });
    const rows = personRows(page).map((r) => [r.children[0].textContent, rowButtons(r)]);
    expect(rows).toEqual([
      ['Sister One', []],
      ['Brother New', ['Approve', 'Decline']],
      ['No one yet.', []],
      ['Sister Two', []],
      ['Sister Late', []],
    ]);
  });

  it('Approve on the post calls decide with the sign-up id (never an address) and reloads the list', async () => {
    let lists = 0;
    const page = await openLeader({
      whoami: WHOAMI,
      listPosts: () => {
        lists++;
        return { ok: true, posts: [post()] };
      },
      decide: { ok: true, message: 'Approved. 2 sign-ups now count. We emailed Brother New.' },
    });
    const row = personRows(page).find((r) => r.children[0].textContent === 'Brother New');
    row.all().find((n) => n.textContent === 'Approve').fire('click');
    await page.settle();
    expect(page.calls.find((c) => c[0] === 'decide')[1]).toEqual({ signupId: 'u2', decision: 'approve', k: 'leaderlink' });
    expect(lists).toBe(2);
    expect(page.main.textContent).toContain('Approved. 2 sign-ups now count.');
  });
});

describe('leader page: a stale link', () => {
  const RELINK = { ok: false, error: 'This leader link has expired or is no longer valid. Ask for a new one.', relink: true };

  it('opening New opportunity checks the link: the relink box shows above the form, before anyone types', async () => {
    const answers = { whoami: WHOAMI, listPosts: { ok: true, posts: [] } };
    const page = await openLeader(answers);
    answers.whoami = RELINK;
    page.button('New opportunity').fire('click');
    await page.settle();
    const box = page.find((n) => n.id === 'gp-relink');
    expect(box).toBeTruthy();
    expect(box.textContent).toContain('Email me a leader link');
    expect(page.main.children[0]).toBe(box);
    // The form is still there below it.
    expect(page.find((n) => n.id === 'gp-title-in')).toBeTruthy();
  });

  it('a save answered with relink keeps what was typed and shows the box', async () => {
    const answers = { whoami: WHOAMI, listPosts: { ok: true, posts: [] }, savePost: RELINK };
    const page = await openLeader(answers);
    page.button('New opportunity').fire('click');
    await page.settle();
    const title = page.find((n) => n.id === 'gp-title-in');
    title.value = 'Test – typed title';
    title.fire('input');
    page.button('Save as draft').fire('click');
    await page.settle();
    expect(page.find((n) => n.id === 'gp-relink')).toBeTruthy();
    expect(page.find((n) => n.id === 'gp-title-in').value).toBe('Test – typed title');
  });

  it('coming back to the page checks the link at most once a minute', async () => {
    const answers = { whoami: WHOAMI, listPosts: { ok: true, posts: [] } };
    const page = await openLeader(answers);
    const whoamis = () => page.calls.filter((c) => c[0] === 'whoami').length;
    expect(whoamis()).toBe(1);
    await page.focus();
    expect(whoamis()).toBe(1); // just loaded: no second check within the minute
  });
});
