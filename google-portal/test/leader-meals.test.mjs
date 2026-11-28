// 2.6 (decision 28): meals on the leader page. Picture, meal block, Show on Service Opportunities
// switch, progress checklist, family emails, meal fields, and drafts with no dates yet.
// Invented fixtures only (the Example family, Anna and Ben, img.example.test).
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

const tick = () => new Promise((r) => setTimeout(r, 0));
async function settle() {
  for (let i = 0; i < 10; i++) await tick();
}

const MEALS_CAT = { id: 'meals-new-moms', name: 'Meals for New Moms', icon: '🍼', audiences: ['Sisters'] };
const WHOAMI = {
  ok: true,
  leader: { name: 'Sister Example', calling: 'Relief Society President', organization: 'Relief Society' },
  access: { isBishopric: false, isCouncil: true, canApprove: true, createOrgs: ['Relief Society'], baseCreateOrgs: ['Relief Society'], editOrgs: ['Relief Society'], catOrgs: { 'service-project': ['Relief Society'], 'meals-new-moms': ['Relief Society'] }, coordinates: [] },
  organizations: ['Relief Society'],
  categories: [{ id: 'service-project', name: 'Service project', icon: '', audiences: [] }, MEALS_CAT],
  defaults: { cutoffHours: 24 },
};
const PIC = 'https://img.example.test/welcome-baby.jpg';
const MEAL = { allergies: 'Peanuts, shellfish', likes: 'Soups', serves: 'Feeds 2 adults, 3 kids', dropoffWindow: '5:30–6:30 pm', dropoff: 'Quiet', coordinateWith: 'Anna and Ben' };
const progress = (over = {}) =>
  [
    { key: 'parents_reviewed', label: 'Parents reviewed', done: true, by: 'Sister Example', at: '2026-11-27 14:05' },
    { key: 'sent_ministering', label: 'Sent to ministering sisters', done: false, by: '', at: '' },
    { key: 'shown_on_portal', label: 'Shown on portal', done: false, by: '', at: '' },
    { key: 'ward_email', label: 'Ward email sent', done: false, by: '', at: '' },
    { key: 'discord', label: 'Posted on Discord', done: false, by: '', at: '' },
  ].map((it) => ({ ...it, ...(over[it.key] || {}) }));

/** A 2.5-shaped post (none of the 2.6 fields). */
function oldPost(over = {}) {
  return {
    postId: 'p1', publicId: 'pub1', publicUrl: 'https://script.example.test/exec?page=post#p=pub1', title: 'Clean the chapel', organization: 'Relief Society', category: 'service-project', audiences: ['Sisters'], status: 'Open', hasPrivateDetails: false, fromRequest: false, canEdit: true, firstDate: '2026-12-03',
    slots: [{ slotId: 's1', date: '2026-12-03', start: '', end: '', role: 'Help', needed: 2, filled: 0, waiting: 0 }],
    signups: [],
    ...over,
  };
}
/** A meal draft as Make opportunity leaves it: no dates yet, hidden from Serve. */
function mealPost(over = {}) {
  return oldPost({
    postId: 'pm', publicId: 'pubm', publicUrl: 'https://script.example.test/exec?page=post#p=pubm', title: 'Meals for the Example family', category: 'meals-new-moms', status: 'Draft', fromRequest: true, firstDate: '', slots: [],
    isMeal: true, showOnServe: false, picture: PIC, meal: { ...MEAL }, progress: progress(), familyEmails: ['anna@example.test', 'ben@example.test'],
    ...over,
  });
}
function mealGetPost(over = {}) {
  return { ok: true, post: { ...mealPost(), publicNote: 'Meals start about 3 days after baby comes; every other day.', privateDetails: '1 Example Lane', cutoffHours: 24, ...over } };
}

async function openLeader(answers) {
  const nodes = { 'gp-main': new FakeNode('div'), 'gp-footer': new FakeNode('footer'), 'gp-head': new FakeNode('header') };
  const calls = [];
  const document = {
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (t) => new FakeNode('#text', t),
    getElementById: (id) => nodes[id] || null,
    addEventListener: () => {},
    visibilityState: 'visible',
    get activeElement() {
      return FakeNode.active || null;
    },
  };
  FakeNode.active = null;
  const window = { location: { hash: '#k=leaderlink' }, confirm: () => true, scrollTo: () => {}, addEventListener: () => {} };
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
  ctx.GP.copyText = () => {};
  vm.runInContext(scripts[1], ctx);
  await settle();
  const main = nodes['gp-main'];
  const page = {
    main,
    calls,
    find: (pred) => main.all().find(pred),
    findAll: (pred) => main.all().filter(pred),
    button: (label) => main.all().find((n) => n.tagName === 'button' && n.textContent === label),
    tab: (label) => main.all().find((n) => n.tagName === 'nav').children.find((b) => b && b.textContent.replace(/\d+$/, '') === label),
    click: async (node) => {
      node.fire('click');
      await settle();
    },
    settle,
  };
  page.openPost = async (title) => {
    await page.click(page.find((n) => n.tagName === 'button' && n.className === 'gp-pcard' && (!title || n.textContent.includes(title))));
  };
  page.menu = async (label) => {
    await page.click(page.find((n) => n.attrs['aria-label'] === 'More actions'));
    await page.click(page.findAll((n) => /^gp-opt/.test(n.className)).find((n) => n.textContent === label));
  };
  return page;
}

const SWITCH = (page) => page.find((n) => n.attrs.role === 'switch' && n.attrs['data-focus'] === 'show-sw');
const progressRows = (page) => page.findAll((n) => /^gp-prow( |$)/.test(n.className));
const boxOf = (row) => row.all().find((n) => n.tagName === 'input' && n.attrs.type === 'checkbox');
const saved = (page) => page.calls.filter((c) => c[0] === 'savePost').at(-1)[1];
const RELINK = { ok: false, error: 'This leader link has expired or is no longer valid. Ask for a new one.', relink: true };

describe('leader page 2.6: a 2.5-shaped answer renders as on main', () => {
  it('no picture, meal block, switch, checklist or "No dates yet"; the edit form has no meal, family or show fields and saves the same keys', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [oldPost()] }, getPost: { ok: true, post: { ...oldPost(), publicNote: 'Bring gloves', privateDetails: '', cutoffHours: 24 } }, savePost: { ok: true, postId: 'p1', publicUrl: 'x' } });
    expect(page.main.textContent).not.toContain('No dates yet');
    await page.openPost();
    expect(page.findAll((n) => n.tagName === 'img')).toEqual([]);
    expect(page.find((n) => /gp-meal|gp-progress|gp-showrow|gp-nodates/.test(n.className))).toBeUndefined();
    expect(SWITCH(page)).toBeUndefined();
    await page.menu('Edit');
    expect(page.main.textContent).not.toContain('Meal details');
    expect(page.find((n) => n.id === 'gp-family')).toBeUndefined();
    expect(page.find((n) => n.id === 'gp-show')).toBeUndefined();
    await page.click(page.button('Save changes'));
    expect(Object.keys(saved(page).post)).toEqual(['postId', 'organization', 'category', 'title', 'audiences', 'publicNote', 'privateDetails', 'cutoffHours', 'slots']);
  });
});

describe('leader page 2.6: a meal post', () => {
  const answers = (over = {}) => ({ whoami: WHOAMI, listPosts: { ok: true, posts: [mealPost()] }, getPost: mealGetPost(), savePost: { ok: true, postId: 'pm', publicUrl: 'x' }, ...over });

  it('the list card says "No dates yet"; the post shows the picture, the meal block (allergies first), the switch off and the checklist open', async () => {
    const page = await openLeader(answers());
    const card = page.find((n) => n.className === 'gp-pcard');
    expect(card.textContent).toContain('No dates yet');
    await page.openPost();
    const img = page.find((n) => n.tagName === 'img');
    expect([img.attrs.src, img.attrs.alt, img.attrs.loading]).toEqual([PIC, '', 'lazy']);
    const meal = page.find((n) => n.className === 'gp-meal');
    expect(meal.children[0].className).toBe('gp-meal-row gp-allergy');
    expect(meal.children[0].textContent).toBe('AllergiesPeanuts, shellfish');
    expect(SWITCH(page).attrs['aria-checked']).toBe('false');
    expect(page.find((n) => n.className === 'gp-showrow').textContent).toContain('Show on Service Opportunities page');
    const details = page.find((n) => n.tagName === 'details');
    expect('open' in details.attrs).toBe(true);
    const rows = progressRows(page);
    expect(rows.map((r) => r.children[1].children[0].textContent)).toEqual(['Parents reviewed', 'Sent to ministering sisters', 'Shown on portal', 'Ward email sent', 'Posted on Discord']);
    expect(rows[0].textContent).toContain('by Sister Example, Fri, Nov 27, 2:05 PM');
    expect(boxOf(rows[0]).checked).toBe(true);
  });

  it('shown_on_portal is read-only (disabled, no handler); it follows the switch', async () => {
    const page = await openLeader(answers());
    await page.openPost();
    const auto = boxOf(progressRows(page)[2]);
    expect(auto.disabled).toBe(true);
    expect(auto.listeners.change).toBeUndefined();
    auto.checked = true;
    auto.fire('change');
    await settle();
    expect(page.calls.filter((c) => c[0] === 'setProgress')).toEqual([]);
  });

  it('turning the switch on calls setShowOnServe and takes showOnServe and progress from the answer', async () => {
    const page = await openLeader(answers({ setShowOnServe: { ok: true, showOnServe: true, progress: progress({ shown_on_portal: { done: true, by: 'Sister Example', at: '2026-11-28 09:30' } }) } }));
    await page.openPost();
    await page.click(SWITCH(page));
    expect(page.calls.find((c) => c[0] === 'setShowOnServe')[1]).toEqual({ postId: 'pm', show: true, k: 'leaderlink' });
    expect(SWITCH(page).attrs['aria-checked']).toBe('true');
    const auto = progressRows(page)[2];
    expect(boxOf(auto).checked).toBe(true);
    expect(auto.textContent).toContain('by Sister Example, Sat, Nov 28, 9:30 AM');
  });

  it('a refused switch goes back as it was and shows the message', async () => {
    const page = await openLeader(answers({ setShowOnServe: { ok: false, error: 'Only editors of this post can change that.' } }));
    await page.openPost();
    await page.click(SWITCH(page));
    expect(SWITCH(page).attrs['aria-checked']).toBe('false');
    expect(page.main.textContent).toContain('Only editors of this post can change that.');
  });

  it('a relink answer on the switch shows the relink box and never leaves the switch on', async () => {
    const page = await openLeader(answers({ setShowOnServe: RELINK }));
    await page.openPost();
    const sw = SWITCH(page);
    await page.click(sw);
    expect(sw.attrs['aria-checked']).toBe('false');
    expect(page.find((n) => n.id === 'gp-relink')).toBeTruthy();
    expect(page.findAll((n) => n.attrs.role === 'switch' && n.attrs['aria-checked'] === 'true')).toEqual([]);
  });

  it('a tick sends key and done, then redraws from the answer with who and when', async () => {
    const page = await openLeader(answers({ setProgress: (d) => ({ ok: true, progress: progress({ [d.key]: { done: d.done, by: 'Sister Example', at: '2026-11-28 10:15' } }) }) }));
    await page.openPost();
    const box = boxOf(progressRows(page)[1]);
    box.checked = true;
    box.fire('change');
    await settle();
    expect(page.calls.find((c) => c[0] === 'setProgress')[1]).toEqual({ postId: 'pm', key: 'sent_ministering', done: true, k: 'leaderlink' });
    const row = progressRows(page)[1];
    expect(boxOf(row).checked).toBe(true);
    expect(row.textContent).toContain('by Sister Example, Sat, Nov 28, 10:15 AM');
  });

  it('a refused or relinked tick puts the box back and shows the message', async () => {
    const page = await openLeader(answers({ setProgress: { ok: false, error: 'Not allowed.' } }));
    await page.openPost();
    const box = boxOf(progressRows(page)[3]);
    box.checked = true;
    box.fire('change');
    await settle();
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(false);
    expect(page.main.textContent).toContain('Not allowed.');

    const again = await openLeader(answers({ setProgress: RELINK }));
    await again.openPost();
    const b2 = boxOf(progressRows(again)[3]);
    b2.checked = true;
    b2.fire('change');
    await settle();
    expect(b2.checked).toBe(false);
    expect(again.find((n) => n.id === 'gp-relink')).toBeTruthy();
  });

  it('a non-meal post keeps its checklist behind a closed "Progress" disclosure', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [oldPost({ isMeal: false, showOnServe: true, progress: progress(), familyEmails: [] })] } });
    await page.openPost();
    const details = page.find((n) => n.tagName === 'details');
    expect(details).toBeTruthy();
    expect('open' in details.attrs).toBe(false);
    expect(details.children[0].tagName).toBe('summary');
    expect(details.children[0].textContent).toBe('Progress');
    expect(SWITCH(page).attrs['aria-checked']).toBe('true');
  });

  it('canEdit false (seen through approving): no switch, no checkbox inputs, no Add dates, no family emails', async () => {
    const { familyEmails, ...rest } = mealPost({ canEdit: false });
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [rest] } });
    await page.openPost();
    expect(SWITCH(page)).toBeUndefined();
    expect(page.findAll((n) => n.tagName === 'input')).toEqual([]);
    expect(progressRows(page)[0].textContent).toContain('Parents reviewed');
    expect(page.button('Add dates')).toBeUndefined();
    expect(page.main.textContent).not.toContain('anna@example.test');
    expect(page.main.textContent).toContain('No dates yet');
  });
});

describe('leader page 2.6: a draft with no dates', () => {
  const answers = (over = {}) => ({ whoami: WHOAMI, listPosts: { ok: true, posts: [mealPost()] }, getPost: mealGetPost(), savePost: { ok: true, postId: 'pm', publicUrl: 'x' }, ...over });

  it('the post shows no day strip and no person lines, and "No dates yet. Add dates before publishing."', async () => {
    const page = await openLeader(answers());
    await page.openPost();
    expect(page.find((n) => n.className === 'gp-strip')).toBeUndefined();
    expect(page.find((n) => n.className === 'gp-person')).toBeUndefined();
    expect(page.find((n) => n.className === 'gp-nodates').textContent).toContain('No dates yet. Add dates before publishing.');
  });

  it('Add dates opens the form at When; Publish says "Add at least one date before publishing." and sends nothing; Save draft sends slots: []', async () => {
    const page = await openLeader(answers());
    await page.openPost();
    await page.click(page.button('Add dates'));
    expect(page.calls.filter((c) => c[0] === 'getPost')).toHaveLength(1);
    expect(page.find((n) => n.id === 'gp-title-in').value).toBe('Meals for the Example family');
    expect(FakeNode.active && FakeNode.active.attrs['data-focus']).toBe('how-once');
    await page.click(page.findAll((n) => n.tagName === 'button').find((n) => n.textContent === 'Publish'));
    expect(page.calls.filter((c) => c[0] === 'savePost')).toEqual([]);
    expect(page.main.textContent).toContain('Add at least one date before publishing.');
    await page.click(page.button('Save draft'));
    const s = saved(page);
    expect(s.mode).toBe('draft');
    expect(s.post.slots).toEqual([]);
  });

  it('a new post with no date: Save draft sends slots: [], Publish is blocked', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, savePost: { ok: true, postId: 'pn', publicUrl: 'x' } });
    await page.click(page.tab('New'));
    await page.click(page.findAll((n) => n.tagName === 'button').find((n) => n.textContent === 'Publish'));
    expect(page.calls.filter((c) => c[0] === 'savePost')).toEqual([]);
    expect(page.main.textContent).toContain('Add at least one date before publishing.');
    await page.click(page.button('Save draft'));
    expect(saved(page).post.slots).toEqual([]);
  });
});

describe('leader page 2.6: the form', () => {
  const answers = () => ({ whoami: WHOAMI, listPosts: { ok: true, posts: [mealPost()] }, getPost: mealGetPost(), savePost: { ok: true, postId: 'pm', publicUrl: 'x' } });

  it('editing a meal post: Meal details (allergies first), family emails, the switch box and the request note above When; untouched fields go back as loaded', async () => {
    const page = await openLeader(answers());
    await page.openPost();
    await page.menu('Edit');
    const sec = page.findAll((n) => n.tagName === 'section').find((s) => s.children[0].textContent === 'Meal details');
    expect(sec).toBeTruthy();
    const fields = sec.all().filter((n) => n.tagName === 'textarea' || (n.tagName === 'input' && n.attrs.type !== 'radio'));
    expect(fields.map((n) => n.id)).toEqual(['gp-m-allergies', 'gp-m-likes', 'gp-m-serves', 'gp-m-window', 'gp-m-coord']);
    expect(fields[0].tagName).toBe('textarea');
    expect(fields[0].value).toBe('Peanuts, shellfish');
    const radios = sec.all().filter((n) => n.attrs.type === 'radio');
    expect(radios.map((r) => [r.value, r.checked])).toEqual([['Regular', false], ['Quiet', true]]);
    expect(page.find((n) => n.id === 'gp-family').value).toBe('anna@example.test, ben@example.test');
    expect(page.main.textContent).toContain("Each gets an email for every sign-up and cancellation (date, role, volunteer's first name).");
    expect(page.find((n) => n.id === 'gp-show').checked).toBe(false);
    // The request's scheduling hint sits right above When; Meal details right after What.
    const formKids = page.find((n) => n.className === 'gp-form-screen').children;
    const heads = formKids.map((n) => (n.tagName === 'section' ? n.children[0].textContent : n.className));
    expect(heads.indexOf('gp-reqnote')).toBe(heads.indexOf('When') - 1);
    expect(heads.indexOf('Meal details')).toBe(heads.indexOf('What') + 1);
    expect(formKids[heads.indexOf('gp-reqnote')].textContent).toContain('Meals start about 3 days after baby comes');
    await page.click(page.button('Save draft'));
    const s = saved(page).post;
    expect(s.meal).toEqual(MEAL);
    expect(s.familyEmails).toBe('anna@example.test, ben@example.test');
    expect(s.showOnServe).toBe(false);
    expect(s.slots).toEqual([]);
  });

  it('changes to the meal fields, family emails and the box are sent', async () => {
    const page = await openLeader(answers());
    await page.openPost();
    await page.menu('Edit');
    const a = page.find((n) => n.id === 'gp-m-allergies');
    a.value = 'Peanuts';
    a.fire('input');
    const regular = page.find((n) => n.attrs.type === 'radio' && n.value === 'Regular');
    regular.checked = true;
    regular.fire('change');
    const fam = page.find((n) => n.id === 'gp-family');
    fam.value = 'anna@example.test';
    fam.fire('input');
    const show = page.find((n) => n.id === 'gp-show');
    show.checked = true;
    show.fire('change');
    await page.click(page.button('Save draft'));
    const s = saved(page).post;
    expect(s.meal).toEqual({ ...MEAL, allergies: 'Peanuts', dropoff: 'Regular' });
    expect(s.familyEmails).toBe('anna@example.test');
    expect(s.showOnServe).toBe(true);
  });

  it('a new post: family emails and the box (checked); picking a meals category adds Meal details and unticks the box', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, savePost: { ok: true, postId: 'pn', publicUrl: 'x' } });
    await page.click(page.tab('New'));
    expect(page.find((n) => n.id === 'gp-family').value).toBe('');
    expect(page.find((n) => n.id === 'gp-show').checked).toBe(true);
    expect(page.main.textContent).not.toContain('Meal details');
    const cat = page.find((n) => n.id === 'gp-cat');
    cat.value = 'meals-new-moms';
    cat.fire('change');
    await settle();
    expect(page.main.textContent).toContain('Meal details');
    expect(page.find((n) => n.id === 'gp-show').checked).toBe(false);
    const a = page.find((n) => n.id === 'gp-m-allergies');
    a.value = 'None';
    a.fire('input');
    await page.click(page.button('Save draft'));
    const s = saved(page).post;
    expect(s.meal).toEqual({ allergies: 'None', likes: '', serves: '', dropoffWindow: '', dropoff: '', coordinateWith: '' });
    expect(s.familyEmails).toBe('');
    expect(s.showOnServe).toBe(false);
    expect(s.category).toBe('meals-new-moms');
  });

  it('a new non-meal post sends showOnServe true and no meal', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, savePost: { ok: true, postId: 'pn', publicUrl: 'x' } });
    await page.click(page.tab('New'));
    const cat = page.find((n) => n.id === 'gp-cat');
    cat.value = 'service-project';
    cat.fire('change');
    await settle();
    await page.click(page.button('Save draft'));
    const s = saved(page).post;
    expect(s.showOnServe).toBe(true);
    expect('meal' in s).toBe(false);
  });

  it('a ticked-by-hand box stays as the leader set it when the category changes', async () => {
    const page = await openLeader({ whoami: WHOAMI, listPosts: { ok: true, posts: [] }, savePost: { ok: true, postId: 'pn', publicUrl: 'x' } });
    await page.click(page.tab('New'));
    const show = page.find((n) => n.id === 'gp-show');
    show.checked = false;
    show.fire('change');
    const cat = page.find((n) => n.id === 'gp-cat');
    cat.value = 'service-project';
    cat.fire('change');
    await settle();
    expect(page.find((n) => n.id === 'gp-show').checked).toBe(false);
  });

  it('a refused Drop-off ("quiet" loaded) shows its message under Drop-off', async () => {
    const page = await openLeader({ ...answers(), getPost: mealGetPost({ meal: { ...MEAL, dropoff: 'quiet' } }), savePost: { ok: false, error: 'Please fix the marked fields.', fields: { 'meal.dropoff': 'Pick Regular or Quiet.' } } });
    await page.openPost();
    await page.menu('Edit');
    await page.click(page.button('Save draft'));
    expect(saved(page).post.meal.dropoff).toBe('quiet');
    const fs = page.find((n) => n.tagName === 'fieldset' && n.children[0].textContent === 'Drop-off');
    expect(fs.all().filter((n) => n.attrs.type === 'radio').map((r) => r.checked)).toEqual([false, false]);
    const msg = fs.all().find((n) => n.className === 'gp-error');
    expect(msg && msg.textContent).toBe('Pick Regular or Quiet.');
  });

  it("meal fields' lengths match the script's MEAL_FIELDS (300, 300, 60, 60, 100)", async () => {
    const page = await openLeader(answers());
    await page.openPost();
    await page.menu('Edit');
    const len = (id) => page.find((n) => n.id === id).attrs.maxlength;
    expect(['gp-m-allergies', 'gp-m-likes', 'gp-m-serves', 'gp-m-window', 'gp-m-coord'].map(len)).toEqual(['300', '300', '60', '60', '100']);
  });

  it('Copy this post of a meal post clears the family emails and keeps the meal fields', async () => {
    const page = await openLeader({ ...answers(), savePost: { ok: true, postId: 'p2', publicUrl: 'x' } });
    await page.openPost();
    await page.menu('Copy this post');
    expect(page.find((n) => n.id === 'gp-family').value).toBe('');
    await page.click(page.button('Save draft'));
    expect(saved(page).post.familyEmails).toBe('');
    expect(saved(page).post.meal).toEqual(MEAL);
    expect(saved(page).post.showOnServe).toBe(false);
  });
});
