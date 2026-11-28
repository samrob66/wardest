// 2.4 (decision 24): Approvers per category, the Pre-approve list, volunteer status data.
import { describe, it, expect } from 'vitest';
import { loadPortal, seedPost, setSetting, addLeader, LEADERS } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');
const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
const NEW = 'brother.new@example.test';
const MEALS_APPROVER = 'sister.meals@example.test';

/** A ward where Meals (Relief Society) has its own Approvers: a leader who is not an RS leader. */
function ward({ approvers = MEALS_APPROVER, onLeaders = true, defaults = '' } = {}) {
  const gp = loadPortal({ seed: true });
  if (onLeaders) addLeader(gp, { Name: 'Sister Meals', Email: MEALS_APPROVER, Calling: 'Meals helper', Organization: 'Primary' });
  const ct = gp.serviceTab_('Categories');
  ct.update(ct.find('Id', 'meals'), { Approvers: approvers });
  if (defaults) setSetting(gp, 'default_approvers', defaults);
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03', Start: '17:00', Needed: 1 },
    { 'Slot id': 'm2', Date: '2026-12-04', Start: '17:00', Needed: 5 },
  ]);
  gp.gpBegin_();
  gp.fakes.mail.sent.length = 0;
  return gp;
}

function confirmNew(gp, email = NEW) {
  gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email });
  const t = tokenFrom(gp.fakes.mail.sent.find((m) => m.to === email).body, 'confirm');
  gp.fakes.mail.sent.length = 0;
  expect(plain(gp.apiConfirm_({ t })).ok).toBe(true);
}

describe('approverEmailsFor', () => {
  const gp0 = loadPortal();
  const post = { Category: 'meals', Organization: 'Relief Society' };
  const leaders = [...LEADERS, { Name: 'Sister Meals', Email: MEALS_APPROVER }];
  it('the category\'s Approvers, else default_approvers, else the organization leaders and the bishopric', () => {
    const cats = { meals: { Id: 'meals', Approvers: `${MEALS_APPROVER}, Sister.Meals@example.test` } };
    expect(plain(gp0.approverEmailsFor(post, cats, { default_approvers: 'brother.counselor@example.test' }, leaders))).toEqual([MEALS_APPROVER]);
    expect(plain(gp0.approverEmailsFor(post, { meals: { Id: 'meals', Approvers: '' } }, { default_approvers: 'brother.counselor@example.test' }, leaders))).toEqual(['brother.counselor@example.test']);
    expect(plain(gp0.approverEmailsFor(post, { meals: { Id: 'meals', Approvers: '' } }, { default_approvers: '' }, leaders)).sort()).toEqual(
      plain(gp0.approversFor(post, leaders)).sort()
    );
  });
  it('addresses not on the Leaders tab are dropped; with none left, the old rule applies', () => {
    const cats = { meals: { Id: 'meals', Approvers: `outsider@example.test, ${MEALS_APPROVER}` } };
    expect(plain(gp0.approverEmailsFor(post, cats, {}, leaders))).toEqual([MEALS_APPROVER]);
    const none = { meals: { Id: 'meals', Approvers: 'outsider@example.test' } };
    expect(plain(gp0.approverEmailsFor(post, none, {}, leaders)).sort()).toEqual(plain(gp0.approversFor(post, leaders)).sort());
  });
});

describe('Approvers (decision 24)', () => {
  it('the waiting notice goes only to the configured approvers', () => {
    const gp = ward();
    confirmNew(gp);
    const to = gp.fakes.mail.sent.filter((m) => m.subject.startsWith('Waiting for approval')).map((m) => m.to);
    expect(to).toEqual([MEALS_APPROVER]);
  });

  it('the 48 h nudge goes only to the configured approvers', () => {
    const gp = ward();
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother New', email: NEW });
    const t = tokenFrom(gp.fakes.mail.sent.find((m) => m.to === NEW).body, 'confirm');
    gp.apiConfirm_({ t });
    gp.fakes.mail.sent.length = 0;
    gp.fakes.setNow('2026-12-01 18:00'); // 47 h before m1
    gp.gpHourly();
    const to = gp.fakes.mail.sent.filter((m) => m.subject.startsWith('Urgent: waiting for approval')).map((m) => m.to);
    expect(to).toEqual([MEALS_APPROVER]);
  });

  it('default_approvers applies to categories without their own list', () => {
    const gp = ward({ approvers: '', defaults: 'brother.counselor@example.test' });
    confirmNew(gp);
    expect(gp.fakes.mail.sent.filter((m) => m.subject.startsWith('Waiting for approval')).map((m) => m.to)).toEqual(['brother.counselor@example.test']);
  });

  it('a listed approver who is not an organization leader can approve, and sees the posts without addresses', () => {
    const gp = ward();
    confirmNew(gp);
    const k = linkFor(gp, MEALS_APPROVER);
    const who = plain(gp.apiWhoami_({ k }));
    expect(who.access).toMatchObject({ isApprover: true, canManagePreapprove: true, canApprove: true });
    const p1 = plain(gp.apiListPosts_({ k })).posts.find((p) => p.postId === 'p1');
    expect(p1.canEdit).toBe(false);
    const su = p1.signups.find((s) => s.name === 'Brother New');
    expect(su).toMatchObject({ status: 'Waiting-approval', volunteerStatus: 'needs_approval', canDecide: true });
    expect(JSON.stringify(p1)).not.toContain(NEW);
    expect(plain(gp.apiDecide_({ k, signupId: su.signupId, decision: 'approve' })).ok).toBe(true);
    expect(gp.fakes.spreadsheet.rowsOf('Volunteers').find((v) => v.Email === NEW)).toMatchObject({ Status: 'Approved', 'Decided by': 'Sister Meals' });
  });

  it('the bishopric and the first post\'s organization leaders can still approve', () => {
    const gp = ward();
    confirmNew(gp);
    // The Relief Society president is not a listed approver: she approves on the post (canDecide),
    // and the volunteer list gives her no addresses or actions (contract: approvers only).
    const sk = linkFor(gp, 'sister.example@example.test');
    const su = plain(gp.apiListPosts_({ k: sk })).posts.find((p) => p.postId === 'p1').signups.find((x) => x.name === 'Brother New');
    expect(su).toMatchObject({ status: 'Waiting-approval', volunteerStatus: 'needs_approval', canDecide: true });
    const v = plain(gp.apiListVolunteers_({ k: sk })).volunteers.find((x) => x.name === 'Brother New');
    expect(v.actions).toBeUndefined();
    const b = plain(gp.apiListVolunteers_({ k: linkFor(gp, 'bishop.example@example.test') })).volunteers.find((x) => x.name === 'Brother New');
    expect(b.actions).toEqual(['approve', 'decline']);
  });

  it('Check health names an approver who is not on the Leaders tab', () => {
    const gp = ward({ approvers: 'outsider@example.test', onLeaders: false });
    const lines = gp.gpMenuCheckHealth().filter((l) => l.includes('outsider@example.test'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^PROBLEM Approver outsider@example.test is not on the Leaders tab/);
  });

  it('Set up adds the Approvers column, the default_approvers row and the Preapproved tab', () => {
    const gp = loadPortal({ seed: true });
    expect(gp.table_(gp.fakes.spreadsheet.getSheetByName('Categories')).headers).toContain('Approvers');
    expect(gp.fakes.spreadsheet.rowsOf('Settings').map((r) => r.Key)).toContain('default_approvers');
    gp.gpEnsureSystemTabs_(gp.fakes.system);
    expect(gp.fakes.system.getSheetByName('Preapproved').raw()[0]).toEqual(['Hash', 'Added at', 'Added by']);
  });
});

describe('Pre-approve list (decision 24)', () => {
  const B = 'bishop.example@example.test';

  it('only hashes are stored; no pasted address anywhere in the System Sheet', () => {
    const gp = ward();
    const r = plain(gp.apiPreapproveAdd_({ k: linkFor(gp, B), emails: `${NEW}; Sister.Two@example.test\nnot-an-address  ${NEW}, sister.two@example.test` }));
    expect(r).toEqual({ ok: true, added: 2, already: 2, invalid: 1, total: 2 });
    const system = JSON.stringify(sys(gp).sheets.map((sh) => sh.raw()));
    for (const bad of [NEW, 'sister.two', 'not-an-address']) expect(system.toLowerCase()).not.toContain(bad);
    const rows = sys(gp).rowsOf('Preapproved');
    expect(rows.map((x) => x['Added by'])).toEqual(['Bishop Example', 'Bishop Example']);
    for (const x of rows) expect(x.Hash).toMatch(/^[0-9a-f]{64}$/);
    expect(plain(gp.apiPreapproveCount_({ k: linkFor(gp, B) }))).toEqual({ ok: true, total: 2, canManage: true });
  });

  it('a matched sign-up is Confirmed and Approved by "Pre-approve list" with the normal confirmation, no confirm or approval email', () => {
    const gp = ward();
    gp.apiPreapproveAdd_({ k: linkFor(gp, B), emails: NEW });
    gp.fakes.mail.sent.length = 0;
    const r = plain(gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW }));
    expect(r).toEqual({ ok: true, message: 'Thanks. Check your email to finish or see your sign-up.' });
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').find((s) => s.Email === NEW).Status).toBe('Confirmed');
    expect(gp.fakes.spreadsheet.rowsOf('Volunteers').find((v) => v.Email === NEW)).toMatchObject({ Status: 'Approved', 'Decided by': 'Pre-approve list' });
    const subjects = gp.fakes.mail.sent.filter((m) => m.to === NEW).map((m) => m.subject);
    expect(subjects).toEqual(["You're signed up: Meals for the Sample family"]);
    expect(gp.fakes.mail.sent.some((m) => m.subject.startsWith('Waiting for approval'))).toBe(false);
    // The list adds no address anywhere: the only Log line naming it is the usual "mail sent" line
    // every confirmation email writes; Outbox, Counters and Preapproved never hold it.
    expect(sys(gp).rowsOf('Log').filter((l) => JSON.stringify(l).includes(NEW)).map((l) => l.What)).toEqual(['mail sent']);
    expect(JSON.stringify([sys(gp).rowsOf('Outbox'), sys(gp).rowsOf('Counters'), sys(gp).rowsOf('Preapproved')])).not.toContain(NEW);
  });

  it('the public answer is identical for a matched and an unmatched address', () => {
    const gp = ward();
    gp.apiPreapproveAdd_({ k: linkFor(gp, B), emails: NEW });
    const a = plain(gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW }));
    const b = plain(gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Other', email: 'sister.other@example.test' }));
    expect(a).toEqual(b);
  });

  it('earlier waiting sign-ups are confirmed when the address signs up again after being added', () => {
    const gp = ward();
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother New', email: NEW });
    gp.apiPreapproveAdd_({ k: linkFor(gp, B), emails: NEW });
    gp.fakes.mail.sent.length = 0;
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: NEW });
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').filter((s) => s.Email === NEW).map((s) => s.Status)).toEqual(['Confirmed', 'Confirmed']);
    expect(gp.fakes.mail.sent.filter((m) => m.to === NEW && m.subject.startsWith("You're signed up"))).toHaveLength(2);
  });

  it('Declined is never overridden by the list', () => {
    const gp = ward();
    confirmNew(gp);
    gp.apiDecide_({ k: linkFor(gp, B), email: NEW, decision: 'decline' });
    gp.apiPreapproveAdd_({ k: linkFor(gp, B), emails: NEW });
    gp.fakes.mail.sent.length = 0;
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother New', email: NEW });
    expect(gp.fakes.spreadsheet.rowsOf('Volunteers').find((v) => v.Email === NEW).Status).toBe('Declined');
    expect(gp.fakes.spreadsheet.rowsOf('Sign-ups').filter((s) => s.Email === NEW && s.Status === 'Confirmed')).toEqual([]);
  });

  it('clear and count; non-managers are refused and see 0', () => {
    const gp = ward();
    gp.apiPreapproveAdd_({ k: linkFor(gp, B), emails: `${NEW}, a@example.test` });
    const eq = linkFor(gp, 'brother.sample@example.test');
    expect(plain(gp.apiPreapproveCount_({ k: eq }))).toEqual({ ok: true, total: 0, canManage: false });
    expect(plain(gp.apiPreapproveAdd_({ k: eq, emails: 'x@example.test' })).ok).toBe(false);
    expect(plain(gp.apiPreapproveClear_({ k: eq })).ok).toBe(false);
    // A configured approver may manage it.
    expect(plain(gp.apiPreapproveCount_({ k: linkFor(gp, MEALS_APPROVER) }))).toEqual({ ok: true, total: 2, canManage: true });
    expect(plain(gp.apiPreapproveClear_({ k: linkFor(gp, B) }))).toEqual({ ok: true, removed: 2 });
    expect(plain(gp.apiPreapproveCount_({ k: linkFor(gp, B) })).total).toBe(0);
  });

  it('more than 2,000 entries in one paste is refused', () => {
    const gp = ward();
    const many = Array.from({ length: 2001 }, (_, i) => `p${i}@example.test`).join(',');
    expect(plain(gp.apiPreapproveAdd_({ k: linkFor(gp, B), emails: many }))).toEqual({ ok: false, error: 'Paste at most 2,000 addresses at a time.' });
  });
});

describe('volunteer status data (decision 24)', () => {
  it('listPosts keeps the pre-2.4 sign-up status values in status; the volunteer word is volunteerStatus', () => {
    const gp = ward();
    confirmNew(gp); // Waiting-approval, needs_approval
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Late', email: 'sister.late@example.test' }); // Waiting-email
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Bishop Example', email: 'bishop.example@example.test' }); // Confirmed, leader
    const p1 = plain(gp.apiListPosts_({ k: linkFor(gp, 'bishop.example@example.test') })).posts.find((p) => p.postId === 'p1');
    expect(p1.signups.map((s) => [s.name, s.status, s.volunteerStatus])).toEqual([
      ['Brother New', 'Waiting-approval', 'needs_approval'],
      ['Sister Late', 'Waiting-email', 'email_not_confirmed'],
      ['Bishop Example', 'Confirmed', 'leader'],
    ]);
    for (const s of p1.signups) expect(['Confirmed', 'Waiting-email', 'Waiting-approval']).toContain(s.status);
  });

  it('volunteerStatusOf covers every status', () => {
    const gp = loadPortal();
    const L = ['leader@example.test'];
    expect(gp.volunteerStatusOf('Leader@example.test', null, L)).toBe('leader');
    expect(gp.volunteerStatusOf('legacy@example.test', null, L)).toBe('approved');
    expect(gp.volunteerStatusOf('a@example.test', { Status: 'Approved' }, L)).toBe('approved');
    expect(gp.volunteerStatusOf('a@example.test', { Status: 'Pending', 'Email confirmed at': '2026-12-01 10:00' }, L)).toBe('needs_approval');
    expect(gp.volunteerStatusOf('a@example.test', { Status: 'Pending' }, L)).toBe('email_not_confirmed');
    expect(gp.volunteerStatusOf('a@example.test', { Status: 'Declined' }, L)).toBe('declined');
    expect(gp.volunteerStatusOf('a@example.test', { Status: 'Revoked' }, L)).toBe('revoked');
  });

  function busyWard() {
    const gp = ward();
    confirmNew(gp); // NEW: needs_approval
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Late', email: 'sister.late@example.test' }); // email_not_confirmed
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Bishop Example', email: 'bishop.example@example.test' }); // leader
    // A parent signing up two children, approved.
    gp.serviceTab_('Volunteers').append({ Email: 'parent@example.test', Name: 'Sister Parent', Status: 'Approved', 'Decided by': 'Bishop Example', 'Decided at': '2026-11-30 10:00', 'First post': 'p1' });
    const ps = gp.serviceTab_('Posts');
    ps.update(ps.find('Post id', 'p1'), { Audiences: 'Sisters, Children' });
    gp.gpBegin_();
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Parent', email: 'parent@example.test', childName: 'Ana' });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Parent', email: 'parent@example.test', childName: 'Ben' });
    gp.serviceTab_('Volunteers').append({ Email: 'declined@example.test', Name: 'Brother Declined', Status: 'Declined', 'Decided by': 'Bishop Example' });
    gp.gpBegin_();
    return gp;
  }

  it('listVolunteers for the bishopric: every status, addresses, who decided, actions, children; sorted', () => {
    const gp = busyWard();
    const r = plain(gp.apiListVolunteers_({ k: linkFor(gp, 'bishop.example@example.test') }));
    expect(r.canSeeEmails).toBe(true);
    expect(r.canAct).toBe(true);
    const by = Object.fromEntries(r.volunteers.map((v) => [v.name, v]));
    expect(r.volunteers.slice(0, 2).map((v) => v.status)).toEqual(['needs_approval', 'email_not_confirmed']);
    expect(by['Brother New']).toMatchObject({ status: 'needs_approval', email: NEW, actions: ['approve', 'decline'], upcomingCount: 1, firstSignup: { title: 'Meals for the Sample family', date: '2026-12-04' }, children: [] });
    expect(by['Sister Late']).toMatchObject({ status: 'email_not_confirmed', actions: [] });
    expect(by['Bishop Example']).toMatchObject({ status: 'leader', actions: [] });
    expect(by['Sister Parent']).toMatchObject({ status: 'approved', actions: ['revoke'], children: ['Ana', 'Ben'], decidedBy: 'Bishop Example', upcomingCount: 2 });
    expect(by['Brother Declined']).toMatchObject({ status: 'declined', actions: ['undo'], firstSignup: null, upcomingCount: 0 });
    for (const v of r.volunteers) expect(v.vid).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(r.volunteers.map((v) => v.vid))).not.toContain('example');
  });

  it('listVolunteers for a leader who is not an approver: no address, decidedBy or actions (absent)', () => {
    const gp = busyWard();
    const r = plain(gp.apiListVolunteers_({ k: linkFor(gp, 'sister.helper@example.test') }));
    expect(r.canSeeEmails).toBe(false);
    expect(r.canAct).toBe(false);
    for (const v of r.volunteers) {
      expect(Object.keys(v).sort()).toEqual(['children', 'firstSignup', 'name', 'status', 'upcomingCount', 'vid']);
    }
    expect(JSON.stringify(r)).not.toContain('@example.test');
  });

  it('decideVolunteer approves, revokes and undoes by vid; unknown vid and not allowed are refused', () => {
    const gp = busyWard();
    const bk = linkFor(gp, 'bishop.example@example.test');
    const list = () => Object.fromEntries(plain(gp.apiListVolunteers_({ k: bk })).volunteers.map((v) => [v.name, v]));
    // Not allowed: the Primary org editor can't approve Brother New (first post: Relief Society).
    const hk = linkFor(gp, 'sister.helper@example.test');
    expect(plain(gp.apiDecideVolunteer_({ k: hk, vid: list()['Brother New'].vid, decision: 'approve' }))).toEqual({ ok: false, error: "You can't approve or decline this person." });
    expect(plain(gp.apiDecideVolunteer_({ k: bk, vid: list()['Brother New'].vid, decision: 'approve' })).ok).toBe(true);
    expect(list()['Brother New'].status).toBe('approved');
    expect(plain(gp.apiDecideVolunteer_({ k: bk, vid: list()['Brother New'].vid, decision: 'revoke' })).ok).toBe(true);
    expect(list()['Brother New'].status).toBe('revoked');
    expect(plain(gp.apiDecideVolunteer_({ k: bk, vid: list()['Brother New'].vid, decision: 'undo' })).ok).toBe(true);
    expect(plain(gp.apiDecideVolunteer_({ k: bk, vid: '0123456789abcdef', decision: 'approve' }))).toEqual({ ok: false, error: 'Not found.' });
    expect(plain(gp.apiDecideVolunteer_({ k: hk, vid: list()['Brother Declined'].vid, decision: 'undo' }))).toEqual({ ok: false, error: 'Only the bishopric can do this.' });
  });

  it('the new actions go through doPost', () => {
    const gp = busyWard();
    const post = (body) => JSON.parse(gp.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
    const k = linkFor(gp, 'bishop.example@example.test');
    expect(post({ action: 'listVolunteers', k }).ok).toBe(true);
    expect(post({ action: 'preapproveCount', k })).toEqual({ ok: true, total: 0, canManage: true });
    expect(post({ action: 'preapproveAdd', k, emails: 'z@example.test' })).toEqual({ ok: true, added: 1, already: 0, invalid: 0, total: 1 });
    expect(post({ action: 'preapproveClear', k })).toEqual({ ok: true, removed: 1 });
    expect(post({ action: 'decideVolunteer', k, vid: 'ffffffffffffffff', decision: 'approve' })).toEqual({ ok: false, error: 'Not found.' });
  });
});
