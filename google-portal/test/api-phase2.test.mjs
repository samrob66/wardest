// Phase 2 public flow: sign-up outcomes by email only, confirm your address, waiting for
// approval, over-limit and withdraw, children, cancel of a waiting sign-up.
import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost, setSetting } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const tokenFrom = (text, page = '') => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const THANKS = 'Thanks. Check your email to finish or see your sign-up.';
// 1.1: the Bishopric tick (bishop, counselor, Executive Secretary) makes a bishopric approver.
const RS_APPROVERS = ['bishop.example@example.test', 'brother.clerk@example.test', 'brother.counselor@example.test', 'sister.example@example.test'];

function setup() {
  const gp = loadPortal({ seed: { settings: { hub_url: 'https://example.github.io/rb1links/' } } });
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03', Needed: 1 },
    { 'Slot id': 'm2', Date: '2026-12-04', Needed: 20, 'Bringing prompt': '' },
    { 'Slot id': 'm3', Date: '2026-12-05', Needed: 20 },
  ]);
  seedPost(gp, { 'Post id': 'p2', 'Public id': 'pubyouth01', Title: 'Youth service night', Organization: 'Young Women', Category: 'youth', Audiences: 'Youth, Sisters', 'Private details': 'Gate code 1234', 'Created by': 'bishop.example@example.test' }, [
    { 'Slot id': 'y1', Date: '2026-12-10', Needed: 10, 'Bringing prompt': '' },
  ]);
  seedPost(gp, { 'Post id': 'p3', 'Public id': 'pubsisters1', Title: 'Sisters only', Audiences: 'Sisters' }, [{ 'Slot id': 'x1', Date: '2026-12-10', Needed: 5 }]);
  gp.fakes.mail.sent.length = 0;
  return gp;
}

function approve(gp, email, name = 'Sister Approved') {
  gp.serviceTab_('Volunteers').append({ Email: email, Name: name, Status: 'Approved', 'Decided by': 'Bishop Example', 'Decided at': '2026-11-20 10:00', 'First post': 'p1', 'Email confirmed at': '2026-11-19 10:00' });
  gp.gpBegin_();
}

const signup = (gp, over = {}) =>
  plain(gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: 'brother.new@example.test', bringing: '', ...over }));
const rows = (gp, tab = 'Sign-ups') => gp.fakes.spreadsheet.rowsOf(tab);
const mailTo = (gp, to) => gp.fakes.mail.sent.filter((m) => m.to === to);

describe('signing up: outcomes go by email only', () => {
  it('a new address waits for its email click; the answer equals an approved address answer', () => {
    const gp = setup();
    approve(gp, 'sister.approved@example.test');
    const fresh = signup(gp);
    const known = signup(gp, { name: 'Sister Approved', email: 'sister.approved@example.test' });
    expect(fresh).toEqual({ ok: true, message: THANKS });
    expect(JSON.stringify(known)).toBe(JSON.stringify(fresh));
    const su = rows(gp);
    expect(su.map((r) => [r.Email, r.Status])).toEqual([
      ['brother.new@example.test', 'Waiting-email'],
      ['sister.approved@example.test', 'Confirmed'],
    ]);
    const vol = rows(gp, 'Volunteers').find((v) => v.Email === 'brother.new@example.test');
    expect(vol).toMatchObject({ Status: 'Pending', 'First post': 'p1', Name: 'Brother New', 'Email confirmed at': '' });
    const confirmMail = mailTo(gp, 'brother.new@example.test');
    expect(confirmMail).toHaveLength(1);
    expect(confirmMail[0].body).toContain('confirm.html#t=');
    expect(confirmMail[0].body).not.toContain('123 Example Lane');
    // The waiting count shows on the slot (for leaders), not in the public feed.
    expect(rows(gp, 'Slots').find((s) => s['Slot id'] === 'm2')).toMatchObject({ Filled: 1, Waiting: 1 });
    const pub = JSON.stringify(plain(gp.apiPost_('pubmeals01')));
    expect(pub).not.toContain('waiting');
  });

  it('an approved address is confirmed at once with private details, cancel and My sign-ups links', () => {
    const gp = setup();
    approve(gp, 'sister.approved@example.test');
    signup(gp, { name: 'Sister Approved', email: 'sister.approved@example.test', slotId: 'm1', bringing: 'Soup' });
    const [m] = mailTo(gp, 'sister.approved@example.test');
    expect(m.body).toContain('123 Example Lane');
    expect(m.body).toContain('https://example.github.io/rb1links/confirm.html#t=');
    expect(m.body).toContain('https://example.github.io/rb1links/me.html#t=');
    // Other ways to serve: other open posts with fill levels only.
    expect(m.body).toContain('Youth service night');
    expect(m.body).toContain('0 of 10 filled');
    const t = tokenFrom(m.body, 'confirm.html');
    expect(plain(gp.apiTokenInfo_({ t }))).toMatchObject({ ok: true, kind: 'cancel', status: 'Confirmed' });
  });

  it('a Leaders-tab address is confirmed without touching Volunteers; an existing row becomes Approved', () => {
    const gp = setup();
    signup(gp, { name: 'Sister Helper', email: 'Sister.Helper@example.test' });
    expect(rows(gp).at(-1).Status).toBe('Confirmed');
    const before = rows(gp, 'Volunteers');
    expect(before.find((v) => v.Email.startsWith('sister.helper'))).toBeUndefined();
    gp.serviceTab_('Volunteers').append({ Email: 'brother.sample@example.test', Name: 'Brother Sample', Status: 'Declined' });
    gp.gpBegin_();
    signup(gp, { name: 'Brother Sample', email: 'brother.sample@example.test' });
    expect(rows(gp).at(-1).Status).toBe('Confirmed');
    expect(rows(gp, 'Volunteers').find((v) => v.Email === 'brother.sample@example.test')).toMatchObject({ Status: 'Approved', 'Decided by': 'Leader list', 'Decided at': '2026-12-01 10:00' });
    expect(rows(gp, 'Volunteers')).toHaveLength(before.length + 1);
  });

  it('a declined address stores nothing and gets one contact email a day', () => {
    const gp = setup();
    gp.serviceTab_('Volunteers').append({ Email: 'declined@example.test', Name: 'Declined Person', Status: 'Declined' });
    gp.gpBegin_();
    expect(signup(gp, { email: 'declined@example.test' })).toEqual({ ok: true, message: THANKS });
    expect(signup(gp, { email: 'declined@example.test', slotId: 'm3' })).toEqual({ ok: true, message: THANKS });
    expect(rows(gp)).toEqual([]);
    const mails = mailTo(gp, 'declined@example.test');
    expect(mails).toHaveLength(1);
    expect(mails[0].body).toContain('Please contact help@riverbend.example to sign up.');
    // A blocked attempt counts toward the per-address limit like any other: a third role, then a fourth.
    expect(signup(gp, { email: 'declined@example.test', slotId: 'm1' }).ok).toBe(true);
    expect(signup(gp, { email: 'declined@example.test', publicId: 'pubyouth01', slotId: 'y1' }).error).toMatch(/^Too many sign-ups right now/);
  });

  it('review item 1: after 7 hours, declined, approved and new addresses answer the 4th role alike', () => {
    const gp = setup();
    gp.serviceTab_('Volunteers').append({ Email: 'declined@example.test', Name: 'Declined Person', Status: 'Declined' });
    approve(gp, 'sister.approved@example.test');
    const people = ['declined@example.test', 'sister.approved@example.test', 'brand.new@example.test'];
    const roles = [{ slotId: 'm1' }, { slotId: 'm2' }, { slotId: 'm3' }];
    for (const email of people) for (const r of roles) expect(signup(gp, { email, ...r })).toEqual({ ok: true, message: THANKS });
    gp.fakes.setNow('2026-12-01 17:00'); // longer than the script cache keeps anything
    const answers = people.map((email) => signup(gp, { email, publicId: 'pubyouth01', slotId: 'y1' }));
    for (const a of answers) expect(a).toEqual(answers[0]);
    expect(answers[0].error).toMatch(/^Too many sign-ups right now/);
    // The confirm-email counters last the day too.
    expect(gp.fakes.mail.sent.filter((m) => m.to === 'brand.new@example.test' && /confirm/i.test(m.subject))).toHaveLength(3);
  });

  it('a duplicate of a sign-up still waiting for its email click sends a fresh confirm email; others send nothing', () => {
    const gp = setup();
    signup(gp);
    const first = tokenFrom(mailTo(gp, 'brother.new@example.test')[0].body, 'confirm.html');
    gp.fakes.setNow('2026-12-03 11:00'); // the first link has expired
    gp.fakes.mail.sent.length = 0;
    expect(signup(gp)).toEqual({ ok: true, message: THANKS });
    expect(rows(gp)).toHaveLength(1);
    const again = mailTo(gp, 'brother.new@example.test');
    expect(again).toHaveLength(1);
    const fresh = tokenFrom(again[0].body, 'confirm.html');
    expect(fresh).not.toBe(first);
    expect(plain(gp.apiTokenInfo_({ t: first })).ok).toBe(false);
    expect(plain(gp.apiConfirm_({ t: fresh })).ok).toBe(true);
    // A confirmed duplicate sends nothing.
    approve(gp, 'sister.approved@example.test');
    signup(gp, { name: 'Sister Approved', email: 'sister.approved@example.test' });
    gp.fakes.mail.sent.length = 0;
    expect(signup(gp, { name: 'Sister Approved', email: 'sister.approved@example.test' })).toEqual({ ok: true, message: THANKS });
    expect(gp.fakes.mail.sent).toEqual([]);
  });

  it('an approved address on a full role is told by email (once a day), not on screen', () => {
    const gp = setup();
    approve(gp, 'sister.approved@example.test');
    approve(gp, 'brother.approved@example.test', 'Brother Approved');
    signup(gp, { slotId: 'm1', name: 'Sister Approved', email: 'sister.approved@example.test' });
    expect(signup(gp, { slotId: 'm1', name: 'Brother Approved', email: 'brother.approved@example.test' })).toEqual({ ok: true, message: THANKS });
    expect(signup(gp, { slotId: 'm1', name: 'Brother Approved', email: 'brother.approved@example.test' })).toEqual({ ok: true, message: THANKS });
    expect(rows(gp).filter((r) => r.Email === 'brother.approved@example.test')).toEqual([]);
    const mails = mailTo(gp, 'brother.approved@example.test');
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/already filled/);
  });

  it('confirm-your-address emails: at most 3 a day to one address and the daily total', () => {
    const gp = setup();
    gp.withLock_(() => {
      const dc = gp.dayCounters_();
      for (let i = 0; i < 3; i++) dc.bump('CA:' + gp.addrTag_('brother.new@example.test'));
    });
    signup(gp);
    expect(rows(gp)).toHaveLength(1);
    expect(rows(gp)[0].Status).toBe('Waiting-email');
    expect(gp.fakes.mail.sent).toEqual([]);
    setSetting(gp, 'confirm_limit_per_day', 1);
    signup(gp, { email: 'new.first@example.test' });
    signup(gp, { email: 'new.second@example.test' });
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['new.first@example.test']);
    expect(rows(gp).map((r) => r.Status)).toEqual(['Waiting-email', 'Waiting-email', 'Waiting-email']);
  });

  it('review item 3: a failure after the sign-up is stored still answers the usual sentence', () => {
    const gp = setup();
    approve(gp, 'sister.approved@example.test');
    gp.sendOrQueue_ = () => {
      throw new Error('Busy, please try again.');
    };
    expect(signup(gp, { name: 'Sister Approved', email: 'sister.approved@example.test' })).toEqual({ ok: true, message: THANKS });
    const su = rows(gp)[0];
    expect(su.Status).toBe('Confirmed');
    // The links were made with the sign-up, inside the lock.
    expect(gp.fakes.system.rowsOf('Tokens').filter((t) => t.Subject === su['Sign-up id']).map((t) => t.Kind)).toEqual(['cancel']);
    expect(gp.fakes.system.rowsOf('Log').some((l) => l.What === 'email not sent')).toBe(true);
  });

  it('review item 12: control characters in the name, child name and bringing become spaces', () => {
    const gp = setup();
    approve(gp, 'sister.approved@example.test');
    signup(gp, { publicId: 'pubyouth01', slotId: 'y1', name: 'Sister\r\nBcc: x@example.test', email: 'sister.approved@example.test', childName: 'A\u0085na', bringing: 'Soup\tand\nbread' });
    expect(rows(gp)[0]).toMatchObject({ Name: 'Sister Bcc: x@example.test', 'Child first name': 'A na' });
    signup(gp, { slotId: 'm2', name: 'Line\nBreak', email: 'brand.new@example.test' });
    for (const m of gp.fakes.mail.sent) expect(m.subject).not.toMatch(/[\r\n]/);
  });
});

describe('confirming the address', () => {
  it('moves the address to waiting for approval and tells the first post approvers once', () => {
    const gp = setup();
    signup(gp);
    signup(gp, { slotId: 'm3' });
    const t = tokenFrom(mailTo(gp, 'brother.new@example.test')[0].body, 'confirm.html');
    gp.fakes.mail.sent.length = 0;
    const info = plain(gp.apiTokenInfo_({ t }));
    expect(info).toMatchObject({ ok: true, kind: 'confirm', title: 'Meals for the Sample family', status: 'Waiting-email' });
    expect(JSON.stringify(info)).not.toContain('Brother New');
    expect(plain(gp.apiConfirm_({ t })).ok).toBe(true);
    expect(rows(gp).map((r) => r.Status)).toEqual(['Waiting-approval', 'Waiting-approval']);
    expect(rows(gp, 'Volunteers').find((v) => v.Email === 'brother.new@example.test')['Email confirmed at']).toBe('2026-12-01 10:00');
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(RS_APPROVERS);
    expect(gp.fakes.mail.sent[0].body).toContain('Brother New');
    expect(gp.fakes.mail.sent[0].body).not.toContain('brother.new@example.test');
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiConfirm_({ t }))).toEqual({ ok: true, message: 'Your address is already confirmed.' });
    expect(gp.fakes.mail.sent).toEqual([]);
    // A later sign-up skips the confirm email and goes straight to waiting for approval.
    signup(gp, { slotId: 'm1' });
    expect(rows(gp).at(-1).Status).toBe('Waiting-approval');
    expect(mailTo(gp, 'brother.new@example.test')).toEqual([]);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(RS_APPROVERS);
  });

  it('a confirm link clicked after 48 hours says it has expired', () => {
    const gp = setup();
    signup(gp);
    const t = tokenFrom(mailTo(gp, 'brother.new@example.test')[0].body, 'confirm.html');
    gp.fakes.setNow('2026-12-03 11:00');
    expect(plain(gp.apiConfirm_({ t }))).toEqual({ ok: false, error: 'This link has expired.' });
    expect(plain(gp.apiTokenInfo_({ t }))).toEqual({ ok: false, error: 'This link has expired.' });
    expect(rows(gp)[0].Status).toBe('Waiting-email');
  });

  it('confirming after the date has passed lapses that sign-up', () => {
    const gp = setup();
    gp.serviceTab_('Slots').append({ 'Slot id': 'm0', 'Post id': 'p1', Date: '2026-12-01', Role: 'Set up', Needed: 2, Filled: 0, Waiting: 0 });
    gp.gpBegin_();
    signup(gp, { slotId: 'm0' });
    signup(gp, { slotId: 'm3' });
    const t = tokenFrom(mailTo(gp, 'brother.new@example.test')[0].body, 'confirm.html');
    gp.fakes.setNow('2026-12-02 09:00');
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiConfirm_({ t }))).toEqual({ ok: true, message: 'Your address is confirmed. The date you signed up for has passed, so that sign-up has ended.' });
    expect(rows(gp).map((r) => r.Status)).toEqual(['Lapsed', 'Waiting-approval']);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(RS_APPROVERS);
  });
});

describe('over the number, withdraw and cancel', () => {
  it('a sign-up that counts after the role filled gets the withdraw email; withdrawing tells leaders nothing', () => {
    const gp = setup();
    signup(gp, { slotId: 'm1' });
    const t = tokenFrom(mailTo(gp, 'brother.new@example.test')[0].body, 'confirm.html');
    approve(gp, 'sister.approved@example.test');
    signup(gp, { slotId: 'm1', name: 'Sister Approved', email: 'sister.approved@example.test' });
    // The bishopric approved Brother New before he clicked; his click now counts him, over the number.
    const vt = gp.serviceTab_('Volunteers');
    vt.update(vt.find('Email', 'brother.new@example.test'), { Status: 'Approved', 'Decided by': 'Bishop Example' });
    gp.gpBegin_();
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiConfirm_({ t })).ok).toBe(true);
    const su = rows(gp).find((r) => r.Email === 'brother.new@example.test');
    expect(su).toMatchObject({ Status: 'Confirmed', 'Over limit': 'Yes' });
    const [m] = mailTo(gp, 'brother.new@example.test');
    expect(m.subject).toMatch(/already has the people it needs/);
    expect(m.body).toContain('123 Example Lane');
    const wt = tokenFrom(m.body, 'confirm.html');
    expect(plain(gp.apiTokenInfo_({ t: wt }))).toMatchObject({ ok: true, kind: 'withdraw', status: 'Confirmed' });
    expect(rows(gp, 'Slots').find((s) => s['Slot id'] === 'm1').Filled).toBe(2);
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiWithdraw_({ t: wt })).ok).toBe(true);
    expect(rows(gp).find((r) => r.Email === 'brother.new@example.test').Status).toBe('Withdrawn');
    expect(gp.fakes.mail.sent).toEqual([]);
    expect(rows(gp, 'Slots').find((s) => s['Slot id'] === 'm1').Filled).toBe(1);
    expect(plain(gp.apiWithdraw_({ t: wt })).ok).toBe(false);
  });

  it('cancelling a waiting sign-up tells leaders nothing; an over-filled cancel says still full', () => {
    const gp = setup();
    approve(gp, 'sister.approved@example.test');
    signup(gp, { slotId: 'm2' });
    const waitingId = rows(gp)[0]['Sign-up id'];
    const ct = gp.issueToken_('cancel', waitingId, '2026-12-05 23:59');
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiCancel_({ t: ct })).ok).toBe(true);
    expect(rows(gp)[0].Status).toBe('Cancelled');
    expect(gp.fakes.mail.sent).toEqual([]);
    // Over-filled: 2 of 1 confirmed, one cancels late → "still has the people it needs".
    gp.serviceTab_('Sign-ups').appendMany([
      { 'Sign-up id': 'sa', 'Post id': 'p1', 'Slot id': 'm1', Email: 'a@example.test', Name: 'A Person', Status: 'Confirmed', 'Signed up at': '2026-11-30 10:00' },
      { 'Sign-up id': 'sb', 'Post id': 'p1', 'Slot id': 'm1', Email: 'b@example.test', Name: 'B Person', Status: 'Confirmed', 'Signed up at': '2026-11-30 10:00' },
    ]);
    const bt = gp.issueToken_('cancel', 'sb', '2026-12-04 23:59');
    gp.fakes.setNow('2026-12-03 09:00');
    expect(plain(gp.apiCancel_({ t: bt })).ok).toBe(true);
    const notice = gp.fakes.mail.sent.find((m) => m.to === 'sister.example@example.test');
    expect(notice.subject).toMatch(/^Cancellation/);
    expect(notice.body).toContain('still has the people it needs');
    expect(notice.body).not.toContain('open again');
  });

  it('the fully filled notice goes once, to the post leaders and the category coordinators', () => {
    const gp = setup();
    const ct = gp.serviceTab_('Categories');
    ct.update(ct.find('Id', 'meals'), { Coordinators: 'sister.coordinator@example.test' });
    gp.serviceTab_('Slots').removeMany(gp.serviceTab_('Slots').rows().filter((s) => ['m2', 'm3'].includes(s['Slot id'])));
    gp.gpBegin_();
    approve(gp, 'sister.approved@example.test');
    signup(gp, { slotId: 'm1', name: 'Sister Approved', email: 'sister.approved@example.test' });
    const filled = gp.fakes.mail.sent.filter((m) => /fully filled/i.test(m.subject));
    expect(filled.map((m) => m.to).sort()).toEqual(['sister.coordinator@example.test', 'sister.example@example.test']);
    expect(filled[0].body).not.toContain('sister.approved@example.test');
  });
});

describe('children', () => {
  it('a parent signs up two children and themselves; a child on a Sisters-only post is refused', () => {
    const gp = setup();
    approve(gp, 'sister.approved@example.test');
    const base = { publicId: 'pubyouth01', slotId: 'y1', name: 'Sister Approved', email: 'sister.approved@example.test' };
    for (const childName of ['', 'Ana', 'Ben']) expect(signup(gp, { ...base, childName })).toEqual({ ok: true, message: THANKS });
    expect(rows(gp).map((r) => r['Child first name'])).toEqual(['', 'Ana', 'Ben']);
    expect(rows(gp, 'Slots').find((s) => s['Slot id'] === 'y1').Filled).toBe(3);
    const child = mailTo(gp, 'sister.approved@example.test')[1];
    expect(child.body).toContain('Ana');
    // Review Q2: one role from one address is one attempt, so any number of children fit.
    for (const childName of ['Cal', 'Dee', 'Eli']) expect(signup(gp, { ...base, childName })).toEqual({ ok: true, message: THANKS });
    expect(rows(gp)).toHaveLength(6);
    const refused = signup(gp, { publicId: 'pubsisters1', slotId: 'x1', name: 'Sister Two', email: 'two@example.test', childName: 'Ana' });
    expect(refused.ok).toBe(false);
    expect(refused.fields.childName).toBe('Children and youth can be signed up only for opportunities for youth or children.');
    expect(signup(gp, { ...base, childName: 'x'.repeat(41) }).fields.childName).toBeTruthy();
    // A child's own sign-up is on the parent's address; the leader sees the parent's name.
    expect(rows(gp).filter((r) => r['Child first name'] === 'Ana')[0]).toMatchObject({ Email: 'sister.approved@example.test', Name: 'Sister Approved' });
  });
});

describe('web entry', () => {
  it('confirm and withdraw reach their handlers through doPost', () => {
    const gp = setup();
    signup(gp);
    const t = tokenFrom(mailTo(gp, 'brother.new@example.test')[0].body, 'confirm.html');
    const post = (body) => JSON.parse(gp.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
    expect(post({ action: 'confirm', t })).toEqual({ ok: true, message: 'Thank you. Your address is confirmed. A ward leader will look at your sign-up soon, and we will email you when it counts.' });
    expect(post({ action: 'withdraw', t: 'f'.repeat(64) })).toEqual({ ok: false, error: 'This link has expired or is no longer valid.' });
  });
});

describe('serve feed', () => {
  it('carries each post category name and icon, and still no names, emails or waiting counts', () => {
    const gp = setup();
    signup(gp);
    const serve = plain(gp.apiServe_());
    expect(serve.posts.find((p) => p.publicId === 'pubmeals01')).toMatchObject({ categoryName: 'Meals', categoryIcon: '🍲', filled: 0 });
    const json = JSON.stringify(serve);
    for (const bad of ['Brother New', 'brother.new@example.test', 'waiting', '123 Example Lane']) expect(json).not.toContain(bad);
  });
});

describe('review round 1: withdraw timing and coordinators on cancellations', () => {
  it('item 6: a withdraw link ends when the role starts; after it, withdrawing is refused', () => {
    const gp = setup();
    gp.serviceTab_('Sign-ups').append({ 'Sign-up id': 'sw', 'Post id': 'p1', 'Slot id': 'm1', Email: 'a@example.test', Name: 'A Person', Status: 'Confirmed', 'Over limit': 'Yes', 'Signed up at': '2026-11-30 10:00' });
    const raw = gp.withLock_(() => gp.confirmationMsgs_([{ signup: gp.signupById_('sw').signup, post: gp.signupById_('sw').post, slot: gp.signupById_('sw').slot, over: true }], gp.volunteerData_()));
    const wt = tokenFrom(raw[0].text, 'confirm.html');
    const tok = gp.fakes.system.rowsOf('Tokens').find((t) => t.Kind === 'withdraw');
    expect(tok.Expires).toBe('2026-12-03 17:00');
    gp.fakes.setNow('2026-12-03 17:00');
    expect(plain(gp.apiWithdraw_({ t: wt }))).toEqual({ ok: false, error: 'This link has expired.' });
    // An older link that lasted longer is refused all the same.
    const late = gp.issueToken_('withdraw', 'sw', '2026-12-04 23:59');
    expect(plain(gp.apiWithdraw_({ t: late }))).toEqual({ ok: false, error: 'This has already happened.' });
    expect(rows(gp)[0].Status).toBe('Confirmed');
  });

  it('Q4: the category coordinators also get cancellation notices, once each', () => {
    const gp = setup();
    const ct = gp.serviceTab_('Categories');
    ct.update(ct.find('Id', 'meals'), { Coordinators: 'sister.coordinator@example.test, sister.example@example.test' });
    gp.gpBegin_();
    approve(gp, 'sister.approved@example.test');
    signup(gp, { slotId: 'm2', name: 'Sister Approved', email: 'sister.approved@example.test' });
    const t = tokenFrom(mailTo(gp, 'sister.approved@example.test')[0].body, 'confirm.html');
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiCancel_({ t })).ok).toBe(true);
    expect(gp.fakes.mail.sent.map((m) => m.to).sort()).toEqual(['sister.coordinator@example.test', 'sister.example@example.test']);
  });
});
