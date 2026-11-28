// The leader page's own script on a small fake DOM.
// 2.3.2 (decision 22): Approve / Decline / Remove / Cancel this date on one line in that order; a
// stale link shows the relink box above the page without losing the form.
// 2.5 (decision 24): the Meadow layout (tabs along the bottom, a post's own screen with the day strip
// and •••, the full-screen form with Once / Pick days / Every week, Change and skip) and the 2.4
// parts (Volunteers for every leader, the pre-approve list, status marks).
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPage, GP_DIR } from '../build.mjs';
import { loadPortal, seedPost } from './harness.mjs';

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
    if (k === 'class') this.className = String(v);
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
  for (let i = 0; i < 10; i++) await tick();
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

/**
 * Loads leader.html with a fake DOM. answers is {action: answer | (data) => answer}; or pass
 * opts.call to answer every action yourself (the real script, below).
 */
async function openLeader(answers, opts = {}) {
  const nodes = { 'gp-main': new FakeNode('div'), 'gp-footer': new FakeNode('footer'), 'gp-head': new FakeNode('header') };
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
    location: { hash: opts.hash || '#k=leaderlink' },
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
    if (opts.call) return Promise.resolve(opts.call(action, data));
    const a = answers[action];
    return Promise.resolve(typeof a === 'function' ? a(data) : a || { ok: true });
  };
  ctx.GP.copyText = () => {};
  vm.runInContext(scripts[1], ctx);
  await settle();
  const main = nodes['gp-main'];
  const page = {
    main,
    calls,
    answers,
    GP: ctx.GP,
    find: (pred) => main.all().find(pred),
    findAll: (pred) => main.all().filter(pred),
    button: (label) => main.all().find((n) => n.tagName === 'button' && n.textContent === label),
    /** A bottom tab by its label (the Waiting tab also carries its count). */
    tab: (label) => main.all().find((n) => n.tagName === 'nav').children.find((b) => b && b.textContent.replace(/\d+$/, '') === label),
    click: async (node) => {
      node.fire('click');
      await settle();
    },
    focus: async () => {
      for (const fn of winListeners.focus || []) fn();
      await settle();
    },
    settle,
  };
  page.openPost = async (title) => {
    const card = page.find((n) => n.tagName === 'button' && n.className === 'gp-pcard' && (!title || n.textContent.includes(title)));
    await page.click(card);
  };
  return page;
}

const rowButtons = (row) => row.all().filter((n) => n.tagName === 'button').map((n) => n.textContent);
const personRows = (page) => page.findAll((n) => n.className === 'gp-person');
const chipOf = (row) => row.all().find((n) => /^gp-chip /.test(n.className));

describe('leader page: the action inventory', () => {
  it('every action the page used before 2.5 (and the 2.4 ones) is still called', () => {
    const src = buildPage('leader');
    for (const a of ['whoami', 'requestLeaderLink', 'signOutEverywhere', 'waiting', 'needsHelp', 'volunteers', 'listPosts', 'getPost', 'savePost', 'cancelDate', 'cancelPost', 'removeSignup', 'decide', 'bishopric', 'listVolunteers', 'decideVolunteer', 'preapproveCount', 'preapproveAdd', 'preapproveClear']) {
      expect(src).toContain(`'${a}'`);
    }
    expect(src).toContain("mode: 'close'");
  });
});

describe("leader page: buttons on a person's line", () => {
  it("Approve, Decline, Remove, then Cancel this date on the date's last line, in that order", async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [post()] } });
    await page.openPost();
    const rows = personRows(page).map((r) => [r.children[0].textContent, rowButtons(r)]);
    expect(rows).toEqual([
      // Dec 3, Bring a meal
      ['Sister One', ['Remove']],
      ['Brother New', ['Approve', 'Decline', 'Remove']],
      // Dec 3, Set up: nobody yet, and it is the date's last line
      ['No one yet.', ['Cancel this date']],
      // Dec 5
      ['Sister Two', ['Remove']],
      ['Sister Late', ['Remove', 'Cancel this date']],
    ]);
    // The buttons sit together in one group at the end of the line (it wraps under the name below 560px).
    for (const r of personRows(page)) {
      const groups = r.children.filter((c) => c.className === 'gp-actions');
      expect(groups.length).toBeLessThanOrEqual(1);
      if (groups.length) expect(r.children.at(-1)).toBe(groups[0]);
    }
    const css = readFileSync(join(GP_DIR, 'pages', 'gp.css'), 'utf8');
    expect(css).toMatch(/@media \(max-width: 559px\)\s*\{\s*\.gp-actions\s*\{\s*flex-basis:\s*100%/);
  });

  it('status marks: Needs approval, Email not confirmed, and Approved for a confirmed sign-up; 2.4 volunteerStatus wins', async () => {
    const p = post();
    p.signups[2] = { ...p.signups[2], volunteerStatus: 'leader' };
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [p] } });
    await page.openPost();
    const marks = personRows(page)
      .filter((r) => chipOf(r))
      .map((r) => [r.children[0].textContent, chipOf(r).textContent]);
    expect(marks).toEqual([
      ['Sister One', 'Approved'],
      ['Brother New', 'Needs approval'],
      ['Sister Two', 'Leader'],
      ['Sister Late', 'Email not confirmed'],
    ]);
    // A status word the page doesn't know shows as it is.
    const odd = post();
    odd.signups = [{ ...odd.signups[0], status: 'Something-new' }];
    const page2 = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [odd] } });
    await page2.openPost();
    expect(chipOf(personRows(page2)[0]).textContent).toBe('Something-new');
    expect(chipOf(personRows(page2)[0]).className).toBe('gp-chip gp-chip-neutral');
  });

  it('no Approve/Decline without canDecide; a post seen only through approving (canEdit false) has no Remove, Cancel or •••', async () => {
    const p = post({ canEdit: false });
    p.signups = p.signups.map((s) => ({ ...s, email: undefined, canDecide: s.signupId === 'u2' }));
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [p] } });
    await page.openPost();
    const rows = personRows(page).map((r) => [r.children[0].textContent, rowButtons(r)]);
    expect(rows).toEqual([
      ['Sister One', []],
      ['Brother New', ['Approve', 'Decline']],
      ['No one yet.', []],
      ['Sister Two', []],
      ['Sister Late', []],
    ]);
    expect(page.find((n) => n.attrs['aria-label'] === 'More actions')).toBeUndefined();
    expect(page.main.textContent).not.toContain('@example.test');
  });

  it('a single-date post has no Cancel this date', async () => {
    const p = post({ slots: post().slots.slice(0, 2), signups: post().signups.slice(0, 2) });
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [p] } });
    await page.openPost();
    expect(page.button('Cancel this date')).toBeUndefined();
    expect(page.find((n) => n.className === 'gp-strip')).toBeUndefined();
  });

  it('Approve on the post calls decide with the sign-up id (never an address) and reloads', async () => {
    let lists = 0;
    const page = await openLeader({
      whoami: WHOAMI,
      listPosts: () => {
        lists++;
        return { ok: true, posts: [post()] };
      },
      decide: { ok: true, message: 'Approved. 2 sign-ups now count. We emailed Brother New.' },
    });
    await page.openPost();
    const before = lists;
    const row = personRows(page).find((r) => r.children[0].textContent === 'Brother New');
    row.all().find((n) => n.textContent === 'Approve').fire('click');
    await page.settle();
    expect(page.calls.find((c) => c[0] === 'decide')[1]).toEqual({ signupId: 'u2', decision: 'approve', k: 'leaderlink' });
    expect(lists).toBe(before + 1);
    expect(page.main.textContent).toContain('Approved. 2 sign-ups now count.');
  });
});

describe('leader page: the Meadow layout', () => {
  it('tabs along the bottom by access; a Waiting count and a banner that opens Waiting', async () => {
    const waiting = { ok: true, volunteers: [1, 2].map((i) => ({ email: `w${i}@example.test`, name: 'Waiting ' + i, firstPost: 'Meals', firstPostOrganization: 'Relief Society', signups: [] })) };
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [post()] }, waiting });
    const nav = page.find((n) => n.tagName === 'nav');
    expect(nav.children.map((b) => b.textContent)).toEqual(['Opportunities', 'Waiting2', 'New', 'Short soon', 'Volunteers']);
    const banner = page.find((n) => n.className === 'gp-banner');
    expect(banner.textContent).toContain('2 people need approval');
    await page.click(banner);
    expect(page.main.textContent).toContain('Waiting 1');
    expect(page.find((n) => n.tagName === 'h1').textContent).toBe('Waiting for approval');

    const coord = await openLeader({ whoami: { ...WHOAMI, access: { ...WHOAMI.access, isBishopric: false, isCouncil: false, canApprove: false } }, listPosts: { ok: true, posts: [] } });
    expect(coord.find((n) => n.tagName === 'nav').children.filter(Boolean).map((b) => b.textContent)).toEqual(['Opportunities', 'New', 'Volunteers']);
    expect(coord.calls.some((c) => c[0] === 'waiting')).toBe(false);
  });

  it('a multi-date post shows the day strip: one date at a time, each with its weekday', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [post()] } });
    await page.openPost();
    const strip = page.find((n) => n.className === 'gp-strip');
    expect(strip.children.map((b) => b.textContent)).toEqual(['All 2', 'THU3Dec', 'SAT5Dec']);
    await page.click(strip.children[2]);
    expect(page.findAll((n) => n.className === 'gp-dayhead').map((n) => n.textContent)).toEqual(['Saturday, December 5']);
    expect(personRows(page).map((r) => r.children[0].textContent)).toEqual(['Sister Two', 'Sister Late']);
  });

  it('••• on a post: Edit, Copy the link, Copy this post, Close, Cancel this opportunity', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [post()] } });
    await page.openPost();
    await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
    const opts = page.findAll((n) => /^gp-opt/.test(n.className)).map((n) => n.textContent);
    expect(opts).toEqual(['Edit', 'Copy the link', 'Copy this post', 'Close (still happening, no new sign-ups)', 'Cancel this opportunity', 'Close this menu']);
    // Cancel this opportunity asks first, with an optional note.
    await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === 'Cancel this opportunity'));
    expect(page.button('Yes, cancel it')).toBeTruthy();
    expect(page.findAll((n) => /^gp-opt/.test(n.className))).toEqual([]);
  });

  it('leaving the Edit form (×) goes back to the post it came from', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [post()] }, getPost: { ok: true, post: { ...post(), publicNote: '', privateDetails: '', cutoffHours: 24 } } });
    await page.openPost();
    await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
    await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === 'Edit'));
    expect(page.find((n) => n.tagName === 'h1').textContent).toBe('Edit opportunity');
    await page.click(page.find((n) => n.attrs['aria-label'] === 'Close the form'));
    expect(page.find((n) => n.tagName === 'h1').textContent).toBe('Test – meal for a family');
    expect(page.main.textContent).not.toContain('no longer on your list');
  });

  it('the page-level ••• has Sign out everywhere', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, signOutEverywhere: { ok: true, message: 'Signed out. A new link is on its way.' } });
    await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
    await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === 'Sign out everywhere'));
    expect(page.calls.some((c) => c[0] === 'signOutEverywhere')).toBe(true);
    expect(page.main.textContent).toContain('Signed out. A new link is on its way.');
  });
});

// ---------- the scheduler ----------

const inside = (node, pred) => node.all().find(pred);
async function newForm(page) {
  await page.click(page.tab('New'));
  const title = page.find((n) => n.id === 'gp-title-in');
  title.value = 'Test – meals';
  title.fire('input');
}
async function pickHow(page, label) {
  await page.click(page.find((n) => n.attrs.role === 'radio' && n.textContent === label));
}
async function setDate(page, id, value) {
  const input = page.find((n) => n.id === id);
  input.value = value;
  input.fire('change');
  await page.settle();
}
function setRole(node, value) {
  const input = inside(node, (n) => n.tagName === 'input' && n.attrs.placeholder === 'e.g. Bring dinner');
  input.value = value;
  input.fire('input');
}
async function everyMonWedFri(page) {
  await pickHow(page, 'Every week');
  const days = page.find((n) => n.className === 'gp-days');
  for (const d of ['Mon', 'Wed', 'Fri']) await page.click(days.children.find((b) => b.textContent === d));
  // Mon, Mar 1, 2027 to Fri, Mar 12
  await setDate(page, 'gp-from', '2027-03-01');
  await setDate(page, 'gp-until', '2027-03-12');
}
const saved = (page) => page.calls.filter((c) => c[0] === 'savePost').at(-1)[1];

describe('leader page: the scheduler', () => {
  const base = () => ({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, savePost: { ok: true, postId: 'pnew', publicUrl: 'https://x.example.test/p' } });

  it('Every week Mon/Wed/Fri shows the dates at once, grouped by week, then saves those dates with the shared roles', async () => {
    const page = await openLeader(base());
    await newForm(page);
    await everyMonWedFri(page);
    const weeks = page.findAll((n) => n.className === 'gp-wk');
    expect(weeks.map((w) => w.children[0].textContent)).toEqual(['Week of Feb 28', 'Week of Mar 7']);
    expect(page.findAll((n) => /^gp-drow-t/.test(n.className)).map((n) => n.textContent)).toEqual(['MonMar 1', 'WedMar 3', 'FriMar 5', 'MonMar 8', 'WedMar 10', 'FriMar 12']);
    setRole(page.find((n) => n.attrs['aria-label'] === 'Roles on every date'), 'Bring dinner');
    await page.click(page.button('Publish'));
    const s = saved(page);
    expect(s.mode).toBe('publish');
    expect(s.post.slots.map((x) => [x.date, x.role, x.slotId])).toEqual([
      ['2027-03-01', 'Bring dinner', ''],
      ['2027-03-03', 'Bring dinner', ''],
      ['2027-03-05', 'Bring dinner', ''],
      ['2027-03-08', 'Bring dinner', ''],
      ['2027-03-10', 'Bring dinner', ''],
      ['2027-03-12', 'Bring dinner', ''],
    ]);
  });

  it('skip one date: it stays listed (struck through) but is not saved', async () => {
    const page = await openLeader(base());
    await newForm(page);
    await everyMonWedFri(page);
    await page.click(page.find((n) => n.attrs.role === 'switch' && n.attrs['aria-label'] === 'Wednesday, March 3'));
    expect(page.find((n) => n.className === 'gp-drow gp-off').textContent).toContain('Mar 3');
    expect(page.main.textContent).toContain('5 dates (1 skipped)');
    await page.click(page.button('Save draft'));
    expect(saved(page).post.slots.map((x) => x.date)).toEqual(['2027-03-01', '2027-03-05', '2027-03-08', '2027-03-10', '2027-03-12']);
    expect(saved(page).mode).toBe('draft');
  });

  it('Until before From and more than 60 dates: a clear message, no dates', async () => {
    const page = await openLeader(base());
    await newForm(page);
    await everyMonWedFri(page);
    await setDate(page, 'gp-until', '2027-02-01');
    expect(page.main.textContent).toContain('Until is before From.');
    expect(page.findAll((n) => n.className === 'gp-wk')).toEqual([]);
    await setDate(page, 'gp-until', '2028-03-01');
    expect(page.main.textContent).toContain('That is more than 60 dates; pick a shorter range.');
  });

  it('Change on one date gives it its own roles: only that date\'s slots differ', async () => {
    const page = await openLeader(base());
    await newForm(page);
    await everyMonWedFri(page);
    setRole(page.find((n) => n.attrs['aria-label'] === 'Roles on every date'), 'Bring dinner');
    const row = page.findAll((n) => /^gp-drow( |$)/.test(n.className)).find((r) => r.textContent.includes('Mar 5'));
    await page.click(inside(row, (n) => n.tagName === 'button' && n.textContent === 'Change'));
    const own = page.find((n) => n.attrs['aria-label'] === 'Roles on Fri, Mar 5');
    expect(own).toBeTruthy();
    setRole(own, 'Bring dessert');
    await page.click(page.button('Publish'));
    expect(saved(page).post.slots.map((x) => [x.date, x.role])).toEqual([
      ['2027-03-01', 'Bring dinner'],
      ['2027-03-03', 'Bring dinner'],
      ['2027-03-05', 'Bring dessert'],
      ['2027-03-08', 'Bring dinner'],
      ['2027-03-10', 'Bring dinner'],
      ['2027-03-12', 'Bring dinner'],
    ]);
  });

  it('Pick days: a dot marks a day that already has an opportunity (from the list already loaded)', async () => {
    const other = post({ postId: 'p9', slots: [{ slotId: 'z1', date: '2027-03-10', start: '', end: '', role: 'Help', needed: 1, filled: 0, waiting: 0 }], signups: [] });
    const page = await openLeader({ ...base(), listPosts: { ok: true, posts: [other] } });
    const before = page.calls.length;
    await newForm(page);
    await pickHow(page, 'Pick days');
    for (let i = 0; i < 30 && page.find((n) => n.tagName === 'strong' && /\d{4}$/.test(n.textContent)).textContent !== 'March 2027'; i++) {
      await page.click(page.find((n) => n.attrs['aria-label'] === 'Next month'));
    }
    const day = page.find((n) => n.attrs['data-d'] === '2027-03-10');
    expect(day.children.some((c) => c && c.className === 'gp-dots')).toBe(true);
    expect(day.attrs['aria-label']).toBe('Wednesday, March 10, 1 other opportunity');
    expect(page.find((n) => n.attrs['data-d'] === '2027-03-11').children.some((c) => c && c.className === 'gp-dots')).toBe(false);
    // Tapping days chooses them; × removes one; no new call was needed for the dots.
    await page.click(page.find((n) => n.attrs['data-d'] === '2027-03-11'));
    await page.click(page.find((n) => n.attrs['data-d'] === '2027-03-12'));
    expect(page.findAll((n) => /^gp-drow-t/.test(n.className)).map((n) => n.textContent)).toEqual(['ThuMar 11', 'FriMar 12']);
    await page.click(page.find((n) => n.attrs['aria-label'] === 'Remove Thursday, March 11'));
    expect(page.findAll((n) => /^gp-drow-t/.test(n.className)).map((n) => n.textContent)).toEqual(['FriMar 12']);
    expect(page.calls.slice(before).filter((c) => c[0] === 'listPosts')).toEqual([]);
  });

  describe('editing an existing post round-trips (Review Focus 1)', () => {
    const slotsOf = (over = {}) => [
      { slotId: 'a1', date: '2027-03-01', start: '17:30', end: '', role: 'Bring dinner', needed: 1, filled: 1, waiting: 0, roleNote: '', bringingPrompt: 'What are you bringing?' },
      { slotId: 'a2', date: '2027-03-03', start: '17:30', end: '', role: 'Bring dinner', needed: 1, filled: 0, waiting: 0, roleNote: '', bringingPrompt: 'What are you bringing?' },
      { slotId: 'a3', date: '2027-03-05', start: '17:30', end: '', role: 'Bring dinner', needed: 1, filled: 0, waiting: 0, roleNote: '', bringingPrompt: 'What are you bringing?' },
      { slotId: 'a4', date: '2027-03-05', start: '18:00', end: '', role: 'Clean up', needed: 2, filled: 0, waiting: 0, roleNote: 'Bring gloves', bringingPrompt: '' },
      ...(over.extra || []),
    ];
    const getPost = (slots) => ({ ok: true, post: { postId: 'p1', publicId: 'pub1', organization: 'Bishopric', category: 'service-project', title: 'Test – meals', audiences: ['Sisters'], publicNote: 'Note', privateDetails: '', cutoffHours: 24, status: 'Open', fromRequest: false, slots } });
    const strip = (s) => ({ slotId: s.slotId, date: s.date, start: s.start, end: s.end, role: s.role, needed: s.needed, roleNote: s.roleNote, bringingPrompt: s.bringingPrompt });
    async function openEdit(slots) {
      const listed = post({ slots: slots.map((s) => ({ ...s })), signups: [] });
      const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [listed] }, getPost: getPost(slots), savePost: { ok: true, postId: 'p1', publicUrl: 'https://x.example.test/p' } });
      await page.openPost();
      await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
      await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === 'Edit'));
      return page;
    }

    it('saving with no change sends the same slots with the same slot ids; it opens in Pick days', async () => {
      const slots = slotsOf();
      const page = await openEdit(slots);
      expect(page.find((n) => n.attrs.role === 'radio' && n.attrs['aria-checked'] === 'true').textContent).toBe('Pick days');
      await page.click(page.button('Save changes'));
      const s = saved(page);
      expect(s.mode).toBe('publish');
      expect(s.post.postId).toBe('p1');
      expect(s.post.slots).toEqual(slots.map(strip));
    });

    it('Change on one date keeps every slot id; skipping by × only drops that date', async () => {
      const slots = slotsOf();
      const page = await openEdit(slots);
      const row = () => page.findAll((n) => /^gp-drow( |$)/.test(n.className)).find((r) => r.textContent.includes('Mar 1'));
      await page.click(inside(row(), (n) => n.tagName === 'button' && n.textContent === 'Change'));
      const own = page.find((n) => n.attrs['aria-label'] === 'Roles on Mon, Mar 1');
      const needed = inside(own, (n) => n.tagName === 'input' && n.attrs['aria-label'] === 'How many people');
      needed.value = '3';
      needed.fire('input');
      await page.click(page.find((n) => n.attrs['aria-label'] === 'Remove Wednesday, March 3'));
      await page.click(page.button('Save changes'));
      const out = saved(page).post.slots;
      expect(out.map((x) => [x.slotId, x.date, x.role, String(x.needed)])).toEqual([
        ['a1', '2027-03-01', 'Bring dinner', '3'],
        ['a3', '2027-03-05', 'Bring dinner', '1'],
        ['a4', '2027-03-05', 'Clean up', '2'],
      ]);
    });

    it('a one-date post opens in Once and moving its date keeps its slot ids', async () => {
      const slots = slotsOf().filter((s) => s.date === '2027-03-05');
      const page = await openEdit(slots);
      expect(page.find((n) => n.attrs.role === 'radio' && n.attrs['aria-checked'] === 'true').textContent).toBe('Once');
      await setDate(page, 'gp-once', '2027-03-06');
      await page.click(page.button('Save changes'));
      expect(saved(page).post.slots.map((x) => [x.slotId, x.date, x.role])).toEqual([
        ['a3', '2027-03-06', 'Bring dinner'],
        ['a4', '2027-03-06', 'Clean up'],
      ]);
    });

    it('Copy this post sends no slot ids', async () => {
      const slots = slotsOf();
      const listed = post({ slots: slots.map((s) => ({ ...s })), signups: [] });
      const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [listed] }, getPost: getPost(slots), savePost: { ok: true, postId: 'p2', publicUrl: 'x' } });
      await page.openPost();
      await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
      await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === 'Copy this post'));
      await page.click(page.button('Save draft'));
      const s = saved(page).post;
      expect(s.postId).toBe('');
      expect(s.title).toBe('Copy of Test – meals');
      expect(s.slots.map((x) => x.slotId)).toEqual(['', '', '', '']);
      expect(s.slots.map((x) => x.role)).toEqual(['Bring dinner', 'Bring dinner', 'Bring dinner', 'Clean up']);
    });
  });
});

describe('leader page: a stale link', () => {
  const RELINK = { ok: false, error: 'This leader link has expired or is no longer valid. Ask for a new one.', relink: true };

  it('opening New checks the link: the relink box shows above the form, before anyone types', async () => {
    const answers = { whoami: WHOAMI, listPosts: { ok: true, posts: [] } };
    const page = await openLeader(answers);
    answers.whoami = RELINK;
    await page.click(page.tab('New'));
    const box = page.find((n) => n.id === 'gp-relink');
    expect(box).toBeTruthy();
    expect(box.textContent).toContain('Email me a leader link');
    expect(page.main.children[0]).toBe(box);
    // The form is still there below it.
    expect(page.find((n) => n.id === 'gp-title-in')).toBeTruthy();
  });

  it('a save answered with relink keeps what was typed (dates and roles too) and shows the box', async () => {
    const answers = { whoami: WHOAMI, listPosts: { ok: true, posts: [] }, savePost: RELINK };
    const page = await openLeader(answers);
    await newForm(page);
    await everyMonWedFri(page);
    setRole(page.find((n) => n.attrs['aria-label'] === 'Roles on every date'), 'Bring dinner');
    await page.click(page.button('Save draft'));
    expect(page.find((n) => n.id === 'gp-relink')).toBeTruthy();
    expect(page.find((n) => n.id === 'gp-title-in').value).toBe('Test – meals');
    expect(page.find((n) => n.id === 'gp-from').value).toBe('2027-03-01');
    expect(page.findAll((n) => /^gp-drow-t/.test(n.className))).toHaveLength(6);
    expect(inside(page.find((n) => n.attrs['aria-label'] === 'Roles on every date'), (n) => n.attrs.placeholder === 'e.g. Bring dinner').value).toBe('Bring dinner');
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

// ---------- 2.4: Volunteers for every leader, the pre-approve list ----------

const VOL = (over) => ({ vid: 'v-' + over.name.split(' ')[0].toLowerCase(), upcomingCount: 1, firstSignup: { title: 'Meals', date: '2026-12-02' }, children: [], ...over });
const ANY_LEADER = {
  ok: true,
  canSeeEmails: false,
  canAct: false,
  volunteers: [
    VOL({ name: 'Marcus Example', status: 'needs_approval' }),
    VOL({ name: 'Jonah Example', status: 'email_not_confirmed', upcomingCount: 0 }),
    VOL({ name: 'Ruth Example', status: 'approved', children: ['Ana', 'Mateo'], firstSignup: { title: 'Nativity set-up', date: '2026-12-12' } }),
    VOL({ name: 'Felix Example', status: 'declined', upcomingCount: 0, firstSignup: { title: 'Moving', date: '2026-11-20' } }),
    VOL({ name: 'Wendell Example', status: 'revoked', upcomingCount: 0, firstSignup: null }),
    VOL({ name: 'Grace Example', status: 'leader' }),
  ],
};
const BISHOPRIC = {
  ...ANY_LEADER,
  canSeeEmails: true,
  canAct: true,
  volunteers: ANY_LEADER.volunteers.map((v) => ({
    ...v,
    email: v.name.split(' ')[0].toLowerCase() + '@example.test',
    decidedBy: v.status === 'approved' ? 'Pre-approve list' : v.status === 'declined' || v.status === 'revoked' ? 'Bishop Example' : '',
    decidedAt: v.decidedBy ? '2026-11-20 10:00' : '',
    actions: { needs_approval: ['approve', 'decline'], approved: ['revoke'], declined: ['undo'], revoked: ['undo'] }[v.status] || [],
  })),
};
const vrows = (page) => page.findAll((n) => n.className === 'gp-vrow');
const vname = (row) => row.all().find((n) => n.className === 'gp-vname').textContent;

describe('leader page: Volunteers (2.4)', () => {
  it('any leader: name and mark, coming up, first sign-up, children under the parent; no emails, who decided or actions', async () => {
    const page = await openLeader({ whoami: { ...WHOAMI, access: { ...WHOAMI.access, isBishopric: false, canApprove: false } }, listPosts: { ok: true, posts: [] }, listVolunteers: ANY_LEADER });
    await page.click(page.tab('Volunteers'));
    expect(page.calls.some((c) => c[0] === 'listVolunteers')).toBe(true);
    const rows = vrows(page);
    expect(rows.map((r) => [vname(r), chipOf(r).textContent])).toEqual([
      ['Felix Example', 'Declined'],
      ['Grace Example', 'Leader'],
      ['Jonah Example', 'Email not confirmed'],
      ['Marcus Example', 'Needs approval'],
      ['Ruth Example', 'Approved'],
      ['Wendell Example', 'Revoked'],
    ]);
    // Red Declined and Revoked for every leader.
    expect(chipOf(rows[0]).className).toBe('gp-chip gp-chip-bad');
    expect(chipOf(rows[5]).className).toBe('gp-chip gp-chip-bad');
    expect(rows[4].textContent).toContain('1 coming up · first: Nativity set-up, Sat, Dec 12');
    expect(rows[2].textContent).toContain('Nothing coming up');
    const kids = rows[4].all().find((n) => n.className === 'gp-vkids');
    expect(kids.children.map((li) => li.textContent)).toEqual(['Ana (child)', 'Mateo (child)']);
    expect(page.main.textContent).not.toContain('@example.test');
    expect(page.main.textContent).not.toContain('decided by');
    expect(rows.flatMap(rowButtons)).toEqual([]);
    expect(page.main.textContent).not.toContain('Pre-approve list');
    expect(page.calls.some((c) => c[0] === 'preapproveCount')).toBe(false);
  });

  it('bishopric or approver: emails, who decided, and the actions it carries; Approve calls decideVolunteer', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, listVolunteers: BISHOPRIC, decideVolunteer: { ok: true, message: 'Approved.' } });
    await page.click(page.tab('Volunteers'));
    const byName = (n) => vrows(page).find((r) => vname(r) === n);
    expect(rowButtons(byName('Marcus Example'))).toEqual(['Approve', 'Decline']);
    expect(rowButtons(byName('Ruth Example'))).toEqual(['Revoke']);
    expect(rowButtons(byName('Felix Example'))).toEqual(['Undo decline']);
    expect(rowButtons(byName('Wendell Example'))).toEqual(['Undo revoke']);
    expect(rowButtons(byName('Grace Example'))).toEqual([]);
    expect(byName('Ruth Example').textContent).toContain('approved by Pre-approve list');
    expect(byName('Ruth Example').textContent).toContain('ruth@example.test');
    await page.click(byName('Marcus Example').all().find((n) => n.textContent === 'Approve'));
    expect(page.calls.find((c) => c[0] === 'decideVolunteer')[1]).toEqual({ vid: 'v-marcus', decision: 'approve', k: 'leaderlink' });
    expect(page.main.textContent).toContain('Approved.');
  });

  it('search (children too), status filter and sort', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, listVolunteers: ANY_LEADER });
    await page.click(page.tab('Volunteers'));
    const q = page.find((n) => n.id === 'gp-vq');
    q.value = 'mate';
    q.fire('input');
    expect(vrows(page).map(vname)).toEqual(['Ruth Example']);
    q.value = '';
    q.fire('input');
    await page.click(page.button('Declined or revoked'));
    expect(vrows(page).map(vname)).toEqual(['Felix Example', 'Wendell Example']);
    expect(page.main.textContent).toContain('2 of 6 people');
    await page.click(page.button('All'));
    const sort = page.find((n) => n.id === 'gp-vsort');
    sort.value = 'recent';
    sort.fire('change');
    expect(vrows(page).map(vname).slice(0, 3)).toEqual(['Ruth Example', 'Grace Example', 'Jonah Example']);
  });

  it("Sam's live 2.3.3 script: listVolunteers is unknown, so the bishopric's old list is used", async () => {
    const page = await openLeader({
      whoami: WHOAMI,
      listPosts: { ok: true, posts: [] },
      listVolunteers: { ok: false, error: 'Not found.' },
      volunteers: { ok: true, volunteers: [
        { email: 'a@example.test', name: 'A Person', status: 'Declined', decidedBy: 'Bishop Example', decidedAt: '2026-12-01 10:00', emailConfirmed: true, firstPost: 'Meals' },
        { email: 'b@example.test', name: 'B Person', status: 'Approved', decidedBy: 'Sister Example', decidedAt: '2026-12-01 10:00', emailConfirmed: true, firstPost: 'Meals' },
        { email: 'c@example.test', name: 'C Person', status: 'Pending', decidedBy: '', decidedAt: '', emailConfirmed: false, firstPost: 'Meals' },
      ] },
      bishopric: { ok: true, message: 'Undone.' },
    });
    await page.click(page.tab('Volunteers'));
    expect(vrows(page).map((r) => [vname(r), chipOf(r).textContent, rowButtons(r)])).toEqual([
      ['A Person', 'Declined', ['Undo decline']],
      ['B Person', 'Approved', ['Revoke']],
      ['C Person', 'Email not confirmed', []],
    ]);
    await page.click(page.button('Undo decline'));
    expect(page.calls.find((c) => c[0] === 'bishopric')[1]).toEqual({ email: 'a@example.test', decision: 'undo', k: 'leaderlink' });
  });

  it('the pre-approve list: only with canManagePreapprove; paste, Add, the total, Clear with a confirm; addresses never shown back', async () => {
    let pasted = null;
    const page = await openLeader({
      whoami: { ...WHOAMI, access: { ...WHOAMI.access, isApprover: true, canManagePreapprove: true } },
      listPosts: { ok: true, posts: [] },
      listVolunteers: BISHOPRIC,
      preapproveCount: { ok: true, total: 3, canManage: true },
      preapproveAdd: (d) => {
        pasted = d.emails;
        return { ok: true, added: 2, already: 1, invalid: 1, total: 5 };
      },
      preapproveClear: { ok: true, removed: 5 },
    });
    await page.click(page.tab('Volunteers'));
    const box = page.find((n) => n.className === 'gp-preapprove');
    expect(box.textContent).toContain('Pre-approve list');
    expect(box.textContent).toContain('3 addresses are on the list.');
    const paste = page.find((n) => n.id === 'gp-pre-paste');
    paste.value = 'new.one@example.test, new.two@example.test\nold@example.test; not-an-email';
    await page.click(page.button('Add'));
    expect(pasted).toBe('new.one@example.test, new.two@example.test\nold@example.test; not-an-email');
    expect(paste.value).toBe('');
    expect(box.textContent).toContain('Added 2. Already on the list: 1. Not an email address: 1.');
    expect(box.textContent).toContain('5 addresses are on the list.');
    expect(box.textContent).not.toContain('new.one@example.test');
    await page.click(page.button('Clear the list'));
    expect(page.calls.some((c) => c[0] === 'preapproveClear')).toBe(true);
    expect(box.textContent).toContain('0 addresses are on the list.');
  });
});

// ---------- against the real script (2.4 on main) ----------

describe('leader page against the real script answers (2.4)', () => {
  const NEW = 'brother.new@example.test';
  const LATE = 'sister.late@example.test';
  const plain = (x) => JSON.parse(JSON.stringify(x));
  const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');

  function setup() {
    const gp = loadPortal({ seed: true });
    seedPost(gp, {}, [
      { 'Slot id': 'm1', Date: '2026-12-03', Needed: 1 },
      { 'Slot id': 'm2', Date: '2026-12-04', Needed: 5 },
    ]);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
    const t = new RegExp('confirm[^\\s"]*#t=([0-9a-f]{64})').exec(gp.fakes.mail.sent.find((m) => m.to === NEW).body)[1];
    expect(plain(gp.apiConfirm_({ t })).ok).toBe(true);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Late', email: LATE });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Approved Volunteer', email: 'brother.volunteer@example.test' });
    gp.gpBegin_();
    return gp;
  }
  const realCall = (gp) => (action, data) => {
    gp.gpBegin_();
    return plain(gp.gpApi({ ...data, action }));
  };

  it('a post: marks from volunteerStatus, Approve / Decline where canDecide; Volunteers without emails for an Org editor', async () => {
    const gp = setup();
    const k = linkFor(gp, 'sister.example@example.test');
    const page = await openLeader({}, { hash: '#k=' + k, call: realCall(gp) });
    await page.openPost('Meals for the Sample family');
    const listed = plain(gp.apiListPosts_({ k })).posts[0].signups;
    expect(listed.map((s) => s.volunteerStatus)).toEqual(['needs_approval', 'email_not_confirmed', 'approved']);
    const rows = personRows(page).filter((r) => chipOf(r));
    expect(rows.map((r) => [r.children[0].textContent, chipOf(r).textContent])).toEqual([
      ['Approved Volunteer', 'Approved'],
      ['Brother New', 'Needs approval'],
      ['Sister Late', 'Email not confirmed'],
    ]);
    expect(rowButtons(rows[1]).slice(0, 2)).toEqual(['Approve', 'Decline']);
    await page.click(page.tab('Volunteers'));
    const vs = plain(gp.apiListVolunteers_({ k }));
    expect(vs.canSeeEmails).toBe(false);
    expect(vrows(page).length).toBe(vs.volunteers.length);
    expect(vrows(page).map((r) => chipOf(r).textContent)).toContain('Needs approval');
    expect(page.findAll((n) => n.className === 'gp-vrow').some((r) => r.textContent.includes('@'))).toBe(false);
    expect(page.find((n) => n.className === 'gp-preapprove')).toBeUndefined();
  });

  it('the bishop: Volunteers with emails and actions, and approving there works', async () => {
    const gp = setup();
    const k = linkFor(gp, 'bishop.example@example.test');
    const page = await openLeader({}, { hash: '#k=' + k, call: realCall(gp) });
    await page.click(page.tab('Volunteers'));
    const row = vrows(page).find((r) => vname(r) === 'Brother New');
    expect(row.textContent).toContain(NEW);
    expect(rowButtons(row)).toEqual(['Approve', 'Decline']);
    expect(page.find((n) => n.className === 'gp-preapprove')).toBeTruthy();
    await page.click(row.all().find((n) => n.textContent === 'Approve'));
    expect(gp.fakes.spreadsheet.rowsOf('Volunteers').find((v) => v.Email === NEW).Status).toBe('Approved');
    expect(chipOf(vrows(page).find((r) => vname(r) === 'Brother New')).textContent).toBe('Approved');
  });
});
