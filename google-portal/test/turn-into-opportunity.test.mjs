// 2.2: a leader who reads a request ticks "Make opportunity" in the request sheet; the
// hourly job makes a DRAFT opportunity without request details on any public field.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPortal, seedPost } from './harness.mjs';
import { formSubmitEvent } from './fakes.mjs';
import { GP_DIR } from '../build.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');
const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
const fileFor = (gp, catId) => sys(gp).rowsOf('Request files').find((f) => f['Category id'] === catId);
const requestSheet = (gp, catId) => gp.fakes.spreadsheets.get(fileFor(gp, catId)['Sheet id']);
const posts = (gp) => gp.fakes.spreadsheet.rowsOf('Posts');
const slots = (gp) => gp.fakes.spreadsheet.rowsOf('Slots');

const REQUESTER = { Name: 'Sister Requester', 'Phone or email': '555-0142', Note: 'Our porch steps are broken' };

/** A ward with a Lend a hand request kind (Relief Society) whose drafts go to lend-a-hand-service. */
function ward() {
  const gp = loadPortal({ seed: true });
  const cats = gp.serviceTab_('Categories');
  cats.appendMany([
    { Id: 'lend-a-hand', Name: 'Lend a hand', Icon: '🤲', Kind: 'Request', 'Owning organizations': 'Relief Society', 'On Help page': true, 'Opportunity category': 'lend-a-hand-service' },
    { Id: 'lend-a-hand-service', Name: 'Lend a hand', Icon: '🤲', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', 'Default audiences': 'Sisters' },
  ]);
  gp.fakes.props.delete('SYSTEM_ID');
  gp.gpBegin_();
  gp.gpMenuSetUp();
  gp.gpBegin_();
  return gp;
}

function submit(gp, catId, answers) {
  const form = gp.fakes.forms.get(fileFor(gp, catId)['Form id']);
  gp.gpOnRequestSubmit(formSubmitEvent(form, answers));
}

/** Ticks Make opportunity (and optionally Copy contact) on the request sheet's only row. */
function tick(gp, catId, { copy = false, row = 0 } = {}) {
  const t = gp.table_(requestSheet(gp, catId).getSheetByName('Requests'));
  const r = t.rows()[row];
  t.update(r, copy ? { 'Make opportunity': true, 'Copy contact to private details': true } : { 'Make opportunity': true });
  gp.gpBegin_();
}

function runJob(gp) {
  gp.fakes.mail.sent.length = 0;
  gp.gpHourly();
  gp.gpBegin_();
}

function draftsFrom(gp) {
  return posts(gp).filter((p) => String(p['Created by']).startsWith('request '));
}

describe('Turn a request into a draft opportunity (decision 19)', () => {
  it('a ticked Lend a hand row makes exactly one Draft in lend-a-hand-service, writes Posted as, unticks; a second run makes nothing', () => {
    const gp = ward();
    submit(gp, 'lend-a-hand', REQUESTER);
    tick(gp, 'lend-a-hand');
    runJob(gp);
    const made = draftsFrom(gp);
    expect(made).toHaveLength(1);
    const p = made[0];
    const req = requestSheet(gp, 'lend-a-hand').rowsOf('Requests')[0];
    expect(p).toMatchObject({
      Status: 'Draft',
      Category: 'lend-a-hand-service',
      Organization: 'Relief Society',
      Title: 'Lend a hand',
      Audiences: 'Sisters',
      'Public note': '',
      'Private details': '',
      'Created by': 'request ' + req['Request id'],
      'Last changed by': 'From a request',
    });
    expect(req['Make opportunity']).toBe(false);
    expect(req['Posted as']).toContain('Draft made 2026-12-01');
    expect(req['Posted as']).toContain(p['Post id']);
    const s = slots(gp).filter((x) => x['Post id'] === p['Post id']);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ Date: '2026-12-08', Role: 'Help', Needed: 1 });

    // Ticking again after it was made: nothing new.
    tick(gp, 'lend-a-hand');
    runJob(gp);
    expect(draftsFrom(gp)).toHaveLength(1);
    expect(requestSheet(gp, 'lend-a-hand').rowsOf('Requests')[0]['Make opportunity']).toBe(false);
  });

  it('no public field carries the requester; private details only with Copy contact, never the note', () => {
    const gp = ward();
    submit(gp, 'lend-a-hand', REQUESTER);
    submit(gp, 'lend-a-hand', { Name: 'Brother Second', 'Phone or email': 'second@example.test', Note: 'Wheelchair ramp' });
    tick(gp, 'lend-a-hand', { row: 0 });
    tick(gp, 'lend-a-hand', { row: 1, copy: true });
    runJob(gp);
    const made = draftsFrom(gp);
    expect(made).toHaveLength(2);
    const plainOne = made.find((p) => !p['Private details']);
    const copied = made.find((p) => p['Private details']);
    expect(plainOne['Private details']).toBe('');
    expect(copied['Private details']).toBe('Requested by Brother Second, second@example.test');
    const publicText = JSON.stringify(
      made.map((p) => [p.Title, p['Public note'], p.Audiences, slots(gp).filter((s) => s['Post id'] === p['Post id']).map((s) => [s.Role, s['Role note'], s['Bringing prompt']])])
    );
    for (const bad of ['Sister Requester', '555-0142', 'porch', 'Brother Second', 'second@example.test', 'Wheelchair']) expect(publicText).not.toContain(bad);
    expect(JSON.stringify(made)).not.toContain('Wheelchair');
    expect(JSON.stringify(made)).not.toContain('porch');

    // Drafts are on no public answer; published, the public answers still carry nothing of the request.
    expect(JSON.stringify(plain(gp.apiServe_()))).not.toContain('Lend a hand');
    expect(plain(gp.apiPost_(plainOne['Public id'])).ok).toBe(false);
    const k = linkFor(gp, 'sister.example@example.test');
    for (const p of made) {
      const got = plain(gp.apiGetPost_({ k, postId: p['Post id'] }));
      expect(got.ok).toBe(true);
      const saved = plain(gp.apiSavePost_({ k, action: 'publish', post: { ...got.post, publicNote: 'Help with a small home repair.' } }));
      expect(saved.ok).toBe(true);
    }
    gp.fakes.cache.delete('serve');
    gp.gpBegin_();
    const pub = JSON.stringify([plain(gp.apiServe_()), ...made.map((p) => plain(gp.apiPost_(p['Public id'])))]);
    expect(pub).toContain('Lend a hand');
    for (const bad of ['Sister Requester', '555-0142', 'porch', 'Brother Second', 'second@example.test', 'Wheelchair', 'Requested by']) expect(pub).not.toContain(bad);
  });

  it('a Christmas row ticked with a blank Opportunity category: "Not made", no post', () => {
    const gp = ward();
    submit(gp, 'christmas', { Name: 'Sister Private', 'Phone or email': 'private@example.test', For: 'My family' });
    tick(gp, 'christmas');
    const before = posts(gp).length;
    runJob(gp);
    expect(posts(gp)).toHaveLength(before);
    const req = requestSheet(gp, 'christmas').rowsOf('Requests')[0];
    expect(req['Posted as']).toBe('Not made: set Opportunity category for Christmas help to the Id of an Opportunity row in Categories (now: blank)');
    expect(req['Make opportunity']).toBe(false);
    expect(gp.fakes.mail.sent).toEqual([]);
  });

  it('after "Not made", fixing Opportunity category and ticking again makes the draft', () => {
    const gp = ward();
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'lend-a-hand'), { 'Opportunity category': '' });
    gp.gpBegin_();
    submit(gp, 'lend-a-hand', REQUESTER);
    tick(gp, 'lend-a-hand');
    runJob(gp);
    expect(requestSheet(gp, 'lend-a-hand').rowsOf('Requests')[0]['Posted as']).toMatch(/^Not made/);
    const c2 = gp.serviceTab_('Categories');
    c2.update(c2.find('Id', 'lend-a-hand'), { 'Opportunity category': 'lend-a-hand-service' });
    gp.gpBegin_();
    tick(gp, 'lend-a-hand');
    runJob(gp);
    expect(draftsFrom(gp)).toHaveLength(1);
    expect(requestSheet(gp, 'lend-a-hand').rowsOf('Requests')[0]['Posted as']).toMatch(/^Draft made/);
  });

  it('an unknown, archived or non-opportunity Opportunity category also gives "Not made"', () => {
    for (const value of ['no-such-category', 'moving', 'archived-one']) {
      const gp = ward();
      const cats = gp.serviceTab_('Categories');
      cats.append({ Id: 'archived-one', Name: 'Old', Kind: 'Opportunity', Archived: true });
      cats.update(cats.find('Id', 'lend-a-hand'), { 'Opportunity category': value });
      gp.gpBegin_();
      submit(gp, 'lend-a-hand', REQUESTER);
      tick(gp, 'lend-a-hand');
      runJob(gp);
      expect(draftsFrom(gp)).toEqual([]);
      expect(requestSheet(gp, 'lend-a-hand').rowsOf('Requests')[0]['Posted as']).toBe(
        'Not made: set Opportunity category for Lend a hand to the Id of an Opportunity row in Categories (now: ' + value + ')'
      );
    }
  });

  it('the draft is not on serve until published; an RS Org editor can edit and publish it, an EQ Org editor cannot', () => {
    const gp = ward();
    submit(gp, 'lend-a-hand', REQUESTER);
    tick(gp, 'lend-a-hand');
    runJob(gp);
    const p = draftsFrom(gp)[0];
    expect(plain(gp.apiServe_()).posts).toEqual([]);
    const eq = linkFor(gp, 'brother.sample@example.test');
    expect(plain(gp.apiGetPost_({ k: eq, postId: p['Post id'] })).ok).toBe(false);
    const rs = linkFor(gp, 'sister.example@example.test');
    const list = plain(gp.apiListPosts_({ k: rs })).posts.find((x) => x.postId === p['Post id']);
    expect(list).toMatchObject({ status: 'Draft', canEdit: true, fromRequest: true });
    const got = plain(gp.apiGetPost_({ k: rs, postId: p['Post id'] }));
    expect(got.post.fromRequest).toBe(true);
    expect(plain(gp.apiSavePost_({ k: rs, action: 'publish', post: { ...got.post, publicNote: 'Help with a small repair.' } })).ok).toBe(true);
    gp.fakes.cache.delete('serve');
    gp.gpBegin_();
    expect(plain(gp.apiServe_()).posts.map((x) => x.title)).toEqual(['Lend a hand']);
  });

  it('the Moving date goes into the slot; a past or blank date gives today + 7', () => {
    const gp = ward();
    expect(gp.fakes.spreadsheet.rowsOf('Categories').find((c) => c.Id === 'moving')['Opportunity category']).toBe('moving-help');
    submit(gp, 'moving', { Name: 'A', 'Phone or email': 'a@example.test', 'Moving in or out': 'Moving in', Date: '2026-12-12' });
    submit(gp, 'moving', { Name: 'B', 'Phone or email': 'b@example.test', 'Moving in or out': 'Moving out', Date: '2026-11-20' });
    submit(gp, 'moving', { Name: 'C', 'Phone or email': 'c@example.test', 'Moving in or out': 'Moving out' });
    for (const row of [0, 1, 2]) tick(gp, 'moving', { row });
    runJob(gp);
    const made = draftsFrom(gp);
    expect(made).toHaveLength(3);
    const dates = made.map((p) => slots(gp).find((s) => s['Post id'] === p['Post id']).Date);
    expect(dates).toEqual(['2026-12-12', '2026-12-08', '2026-12-08']);
    // moving-help: Elders Quorum, no default audiences: Brothers.
    expect(made[0]).toMatchObject({ Category: 'moving-help', Organization: 'Elders Quorum', Audiences: 'Brothers', Title: 'Moving' });
  });

  it('the notice has no request text and goes only to people who can edit the draft', () => {
    const gp = ward();
    submit(gp, 'lend-a-hand', REQUESTER);
    tick(gp, 'lend-a-hand');
    runJob(gp);
    const to = gp.fakes.mail.sent.map((m) => m.to).sort();
    // Lend a hand's readers include the whole bishopric and Sister Coordinator (RS, Coordinator
    // box only, who can't edit it); its Notify is blank, so the readers who can edit get it.
    expect(to).toEqual(['bishop.example@example.test', 'brother.clerk@example.test', 'brother.counselor@example.test', 'sister.example@example.test']);
    for (const m of gp.fakes.mail.sent) {
      expect(m.subject).toBe('Draft opportunity from a Lend a hand request');
      expect(m.body).toContain('Open your leader page to check the date, write the public note and publish it.');
      for (const bad of ['Sister Requester', '555-0142', 'porch']) expect(m.body + m.htmlBody + m.subject).not.toContain(bad);
    }
  });

  it('with Notify set, only the Notify people who can edit the draft are told', () => {
    const gp = ward();
    const cats = gp.serviceTab_('Categories');
    cats.update(cats.find('Id', 'lend-a-hand'), { Notify: 'Owners' });
    gp.gpBegin_();
    submit(gp, 'lend-a-hand', REQUESTER);
    tick(gp, 'lend-a-hand');
    runJob(gp);
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['sister.example@example.test']);
  });

  it('older request sheets get the three columns; rotation keeps them', () => {
    const gp = ward();
    const f = fileFor(gp, 'lend-a-hand');
    const sh = requestSheet(gp, 'lend-a-hand').getSheetByName('Requests');
    // As an older sheet: drop the three new headers (they are the last three).
    const head = sh.raw()[0];
    const keep = head.filter((h) => !['Make opportunity', 'Copy contact to private details', 'Posted as'].includes(h));
    sh.getRange(1, 1, 1, head.length).setValues([[...keep, ...Array(head.length - keep.length).fill('')]]);
    for (let r = 2; r <= sh.getMaxRows(); r++) for (let c = keep.length + 1; c <= head.length; c++) sh.validations.delete(`${r},${c}`);
    for (let r = 2; r <= sh.getMaxRows(); r++) for (let c = keep.length + 1; c <= head.length; c++) if (sh.cell(r, c) !== '') sh.write(r, c, '');
    gp.gpBegin_();
    expect(gp.table_(sh).headers).not.toContain('Make opportunity');
    submit(gp, 'lend-a-hand', REQUESTER);
    // Without the columns nothing can be ticked, and the job leaves the sheet alone.
    runJob(gp);
    expect(gp.table_(sh).headers).not.toContain('Make opportunity');
    // Set up adds them.
    gp.gpMenuSetUp();
    gp.gpBegin_();
    const t = gp.table_(sh);
    for (const h of ['Make opportunity', 'Copy contact to private details', 'Posted as']) expect(t.headers).toContain(h);
    tick(gp, 'lend-a-hand');
    runJob(gp);
    expect(draftsFrom(gp)).toHaveLength(1);
    // Rotation on the 1st carries the columns and their values.
    gp.fakes.setNow('2027-01-01 02:00');
    gp.dailyRequests_();
    const now = sys(gp).rowsOf('Request files').find((x) => x['Category id'] === 'lend-a-hand');
    expect(now['Sheet id']).not.toBe(f['Sheet id']);
    const fresh = gp.fakes.spreadsheets.get(now['Sheet id']);
    const headers = fresh.getSheetByName('Requests').raw()[0];
    for (const h of ['Make opportunity', 'Copy contact to private details', 'Posted as']) expect(headers).toContain(h);
    expect(fresh.rowsOf('Requests')[0]['Posted as']).toContain('Draft made');
  });

  it('runs hourly, not every ten minutes', () => {
    const gp = ward();
    submit(gp, 'lend-a-hand', REQUESTER);
    tick(gp, 'lend-a-hand');
    gp.gpTenMinute();
    gp.gpBegin_();
    expect(draftsFrom(gp)).toEqual([]);
    runJob(gp);
    expect(draftsFrom(gp)).toHaveLength(1);
  });

  it('takes the script lock only for a request sheet with a ticked row', () => {
    const gp = ward();
    submit(gp, 'lend-a-hand', REQUESTER);
    let locks = 0;
    const real = gp.LockService.getScriptLock;
    gp.LockService.getScriptLock = () => {
      const l = real();
      const tryLock = l.tryLock;
      l.tryLock = (ms) => {
        locks++;
        return tryLock(ms);
      };
      return l;
    };
    gp.gpBegin_();
    gp.makeDraftsFromRequests_();
    expect(locks).toBe(0);
    tick(gp, 'lend-a-hand');
    gp.makeDraftsFromRequests_();
    // The file's lock, then the notices' own (outbox and log writes).
    expect(locks).toBeGreaterThan(0);
    expect(draftsFrom(gp)).toHaveLength(1);
  });

  it('two rows typed by hand without a Request id each get their own id and their own draft', () => {
    const gp = ward();
    const t = gp.table_(requestSheet(gp, 'lend-a-hand').getSheetByName('Requests'));
    t.appendMany([
      { Kind: 'Lend a hand', Name: 'Hand One', 'Phone or email': 'one@example.test', Status: 'New' },
      { Kind: 'Lend a hand', Name: 'Hand Two', 'Phone or email': 'two@example.test', Status: 'New' },
    ]);
    gp.gpBegin_();
    tick(gp, 'lend-a-hand', { row: 0 });
    tick(gp, 'lend-a-hand', { row: 1 });
    runJob(gp);
    const made = draftsFrom(gp);
    expect(made).toHaveLength(2);
    const rows = requestSheet(gp, 'lend-a-hand').rowsOf('Requests');
    const ids = rows.map((r) => r['Request id']);
    for (const id of ids) expect(id).toMatch(/^r[a-z2-7]{10}$/);
    expect(ids[0]).not.toBe(ids[1]);
    expect(made.map((p) => p['Created by']).sort()).toEqual(ids.map((id) => 'request ' + id).sort());
    expect(rows[0]['Posted as']).toContain(made.find((p) => p['Created by'] === 'request ' + ids[0])['Post id']);
    expect(rows[1]['Posted as']).toContain(made.find((p) => p['Created by'] === 'request ' + ids[1])['Post id']);
  });

  it('two ticked rows with the same Request id in one pass make one draft', () => {
    const gp = ward();
    const t = gp.table_(requestSheet(gp, 'lend-a-hand').getSheetByName('Requests'));
    t.appendMany([
      { 'Request id': 'rsame000001', Kind: 'Lend a hand', Name: 'Copy One', Status: 'New' },
      { 'Request id': 'rsame000001', Kind: 'Lend a hand', Name: 'Copy One', Status: 'New' },
    ]);
    gp.gpBegin_();
    tick(gp, 'lend-a-hand', { row: 0 });
    tick(gp, 'lend-a-hand', { row: 1 });
    runJob(gp);
    expect(draftsFrom(gp)).toHaveLength(1);
    const rows = requestSheet(gp, 'lend-a-hand').rowsOf('Requests');
    expect(rows[0]['Posted as']).toBe(rows[1]['Posted as']);
  });

  it('a failure in this part does not stop the other hourly parts', () => {
    const gp = ward();
    seedPost(gp, { 'Post id': 'pold', 'Public id': 'pubold', Status: 'Open' }, [{ 'Slot id': 'old1', Date: '2026-11-20' }]);
    submit(gp, 'lend-a-hand', REQUESTER);
    tick(gp, 'lend-a-hand');
    gp.fakes.props.set('SCHEMA_VERSION', gp.GP_VERSION);
    // Break the request file: its sheet is gone.
    gp.fakes.spreadsheets.delete(fileFor(gp, 'lend-a-hand')['Sheet id']);
    gp.gpBegin_();
    runJob(gp);
    expect(posts(gp).find((p) => p['Post id'] === 'pold').Status).toBe('Past');
    expect(sys(gp).rowsOf('Log').some((l) => l.What === 'job error' && String(l.Detail).includes('drafts from requests'))).toBe(true);
  });

  it('the leader page labels drafts from a request and reminds about the public note', () => {
    const html = readFileSync(join(GP_DIR, 'pages', 'leader.html'), 'utf8');
    expect(html).toContain('From a request');
    expect(html).toContain("Check the date and write the public note. Never put the family's name, address or situation in the public note.");
  });

  it('a ward on 2.1 that only pastes Code.gs gets the Moving seed from its next job', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Categories');
    t.update(t.find('Id', 'moving'), { 'Opportunity category': '' });
    gp.fakes.props.delete('MOVING_OPPORTUNITY_SEEDED');
    gp.fakes.props.set('SCHEMA_VERSION', 'phase-2.1');
    gp.gpBegin_();
    gp.gpTenMinute();
    expect(gp.fakes.props.get('SCHEMA_VERSION')).toBe(gp.GP_VERSION);
    expect(gp.fakes.spreadsheet.rowsOf('Categories').find((c) => c.Id === 'moving')['Opportunity category']).toBe('moving-help');
  });

  it('Categories gets the Opportunity category column; Moving is seeded once, never over a typed value', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Categories');
    expect(t.headers).toContain('Opportunity category');
    for (const id of ['christmas', 'other', 'christmas-giving']) expect(t.find('Id', id)['Opportunity category']).toBe('');
    // An older sheet: blank Moving cell, flag not set.
    t.update(t.find('Id', 'moving'), { 'Opportunity category': '' });
    gp.fakes.props.delete('MOVING_OPPORTUNITY_SEEDED');
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(gp.serviceTab_('Categories').find('Id', 'moving')['Opportunity category']).toBe('moving-help');
    // Cleared on purpose later: stays clear.
    const t2 = gp.serviceTab_('Categories');
    t2.update(t2.find('Id', 'moving'), { 'Opportunity category': '' });
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(gp.serviceTab_('Categories').find('Id', 'moving')['Opportunity category']).toBe('');
    // Typed value kept.
    const gp2 = loadPortal({ seed: true });
    const t3 = gp2.serviceTab_('Categories');
    t3.update(t3.find('Id', 'moving'), { 'Opportunity category': 'service-project' });
    gp2.fakes.props.delete('MOVING_OPPORTUNITY_SEEDED');
    gp2.gpEnsureTabs_(gp2.fakes.spreadsheet);
    expect(gp2.serviceTab_('Categories').find('Id', 'moving')['Opportunity category']).toBe('service-project');
  });
});
