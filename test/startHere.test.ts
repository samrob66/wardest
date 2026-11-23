// Executive Secretary "Start here" track (spec 2026-11-23-execsec-start-here-design.md).
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import schemaSql from '../db/schema.sql?raw';
import upgradeSql from '../db/upgrade-2026-11-23-start-here.sql?raw';
import seedSql from '../db/seed-start-here.sql?raw';
import solutionsSeedSql from '../db/seed-solutions.sql?raw';
import { renderLanding } from '../src/views/landing';
import { asUser, countQueries, ensureUser, env, makeLeader, makeWard, schemaStatements, uniqueEmail } from './helpers';
import { parseSetupStep } from '../src/lib/solutions';
import { loadStartHere } from '../src/lib/startHere';
import { newId } from '../src/lib/ids';

const form = (d: Record<string, string>) => new URLSearchParams(d).toString();

async function post(uid: string, path: string, data: Record<string, string>) {
  return SELF.fetch(`http://localhost${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: await asUser(uid), 'content-type': 'application/x-www-form-urlencoded' },
    body: form(data),
  });
}

// Runs `fn` with `email` on the operator allowlist.
async function asOperator<T>(email: string, fn: () => Promise<T>): Promise<T> {
  const mutable = env as unknown as { OPERATOR_EMAILS: string };
  mutable.OPERATOR_EMAILS = email;
  try {
    return await fn();
  } finally {
    mutable.OPERATOR_EMAILS = '';
  }
}

async function insertSolution(o: { title: string; status?: string; step?: number | null; position?: number }): Promise<string> {
  const id = newId('sol');
  await env.DB.prepare(
    `INSERT INTO solutions (id, category, title, slug, summary, status, setup_step, position)
     VALUES (?, 'exec_secretary', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, o.title, id, `About ${o.title}`, o.status ?? 'published', o.step ?? null, o.position ?? 0)
    .run();
  return id;
}

describe('parseSetupStep', () => {
  it('blank is null, 1-99 is the number, anything else is an error', () => {
    expect(parseSetupStep('')).toEqual({ ok: true, value: null });
    expect(parseSetupStep('   ')).toEqual({ ok: true, value: null });
    expect(parseSetupStep(undefined)).toEqual({ ok: true, value: null });
    expect(parseSetupStep('7')).toEqual({ ok: true, value: 7 });
    expect(parseSetupStep(' 12 ')).toEqual({ ok: true, value: 12 });
    expect(parseSetupStep('1')).toEqual({ ok: true, value: 1 });
    expect(parseSetupStep('99')).toEqual({ ok: true, value: 99 });
    for (const bad of ['0', '-3', '2.5', 'abc', '100', '1000', '1e1', '0x5', '07a']) {
      expect(parseSetupStep(bad), bad).toEqual({
        ok: false,
        error: 'Setup step must be a whole number from 1 to 99, or blank.',
      });
    }
  });
});

describe('operator Setup step field', () => {
  it('saves a valid step, re-renders with an error and saves nothing for a bad one, blank saves NULL', async () => {
    const email = uniqueEmail('operator');
    const opId = await ensureUser(env, email, 'Operator');
    const id = await insertSolution({ title: 'Op step test', status: 'draft' });
    const base = {
      title: 'Op step test', category: 'exec_secretary', summary: 's', body: '', video_url: '',
      template_type: '', template_value: '', implementation_scope: 'ward_singleton', status: 'draft',
    };
    const step = async () =>
      (await env.DB.prepare(`SELECT setup_step FROM solutions WHERE id = ?`).bind(id).first<{ setup_step: number | null }>())!
        .setup_step;
    await asOperator(email, async () => {
      const form = await (await SELF.fetch(`http://localhost/operator/solutions/${id}`, { headers: { cookie: await asUser(opId) } })).text();
      expect(form).toContain('name="setup_step"');
      expect(form).toContain('Setup step (Start here order; blank = not in the track)');

      expect((await post(opId, `/operator/solutions/${id}`, { ...base, setup_step: '3' })).status).toBe(302);
      expect(await step()).toBe(3);

      for (const bad of ['abc', '0', '-3', '2.5', '1000']) {
        const res = await post(opId, `/operator/solutions/${id}`, { ...base, title: 'Changed', setup_step: bad });
        expect(res.status, bad).toBe(200);
        expect(await res.text()).toContain('Setup step must be a whole number from 1 to 99, or blank.');
        expect(await step()).toBe(3);
        const t = await env.DB.prepare(`SELECT title FROM solutions WHERE id = ?`).bind(id).first<{ title: string }>();
        expect(t!.title).toBe('Op step test');
      }

      const list = await (await SELF.fetch(`http://localhost/operator/solutions`, { headers: { cookie: await asUser(opId) } })).text();
      expect(list).toContain('Step 3');

      expect((await post(opId, `/operator/solutions/${id}`, { ...base, setup_step: '' })).status).toBe(302);
      expect(await step()).toBeNull();

      // Create with a step; create with a bad step saves nothing.
      expect((await post(opId, `/operator/solutions`, { ...base, title: 'Created with step', setup_step: '5' })).status).toBe(302);
      const made = await env.DB.prepare(`SELECT setup_step FROM solutions WHERE title = 'Created with step'`).first<{ setup_step: number }>();
      expect(made!.setup_step).toBe(5);
      const bad = await post(opId, `/operator/solutions`, { ...base, title: 'Created with bad step', setup_step: 'x' });
      expect(bad.status).toBe(200);
      expect(await bad.text()).toContain('Setup step must be a whole number');
      expect(await env.DB.prepare(`SELECT 1 AS x FROM solutions WHERE title = 'Created with bad step'`).first()).toBeNull();
    });
  });
});

describe('db/upgrade-2026-11-23-start-here.sql', () => {
  it('brings an older solutions table to the same columns as db/schema.sql', async () => {
    const create = schemaStatements(schemaSql).find((s) => /^CREATE TABLE solutions\s*\(/.test(s))!;
    expect(create).toContain('setup_step');
    const probe = `solutions_upgrade_probe_${newId('x').replace(/[^a-z0-9]/gi, '')}`;
    const old = create
      .replace(/^CREATE TABLE solutions/, `CREATE TABLE ${probe}`)
      .split('\n')
      .filter((l) => !/^\s*setup_step\b/.test(l))
      .join('\n');
    await env.DB.prepare(old).run();
    const upgrade = schemaStatements(upgradeSql);
    expect(upgrade.length).toBeGreaterThan(0);
    for (const s of upgrade) await env.DB.prepare(s.replace(/\bsolutions\b/g, probe)).run();
    const cols = async (t: string) =>
      (await env.DB.prepare(`PRAGMA table_info(${t})`).all<{ name: string; type: string; notnull: number; dflt_value: unknown }>()).results
        .map((c) => `${c.name}:${c.type}:${c.notnull}:${String(c.dflt_value)}`)
        .sort();
    expect(await cols(probe)).toEqual(await cols('solutions'));
    await env.DB.prepare(`DROP TABLE ${probe}`).run();
  });
});

// ---------------------------------------------------------------- Task A2: loader, page, card

// Solutions are global and this file's tests share one D1, so each test that needs an exact set
// of steps first takes every existing solution out of the track.
async function clearSteps(): Promise<void> {
  await env.DB.prepare(`UPDATE solutions SET setup_step = NULL`).run();
}

async function insertImpl(o: {
  wardId: string; solutionId: string; status: string; owner: string | null; visibility?: 'ward' | 'restricted';
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO implementations (id, ward_id, space_id, solution_id, visibility, status, owner_user_id)
     VALUES (?, ?, NULL, ?, ?, ?, ?)`,
  )
    .bind(newId('impl'), o.wardId, o.solutionId, o.visibility ?? 'ward', o.status, o.owner)
    .run();
}

async function getPage(uid: string, path: string) {
  const res = await SELF.fetch(`http://localhost${path}`, { redirect: 'manual', headers: { cookie: await asUser(uid) } });
  return { status: res.status, html: await res.text() };
}

async function wardWithMember() {
  const w = await makeWard(env);
  const memberId = await makeLeader(env, w.wardId, { email: uniqueEmail('member'), name: 'Plain Member' });
  return { ...w, memberId };
}

describe('loadStartHere', () => {
  it('lists published step solutions by step, then position, then title; drafts and stepless are left out', async () => {
    await clearSteps();
    const { wardId, founderId } = await makeWard(env);
    const charlie = await insertSolution({ title: 'Charlie', step: 1, position: 2 });
    const delta = await insertSolution({ title: 'Delta', step: 1, position: 1 });
    const bravo = await insertSolution({ title: 'Bravo', step: 1, position: 2 });
    const echo = await insertSolution({ title: 'Echo', step: 3 });
    await insertSolution({ title: 'Draft step', step: 2, status: 'draft' });
    await insertSolution({ title: 'Submitted step', step: 2, status: 'submitted' });
    await insertSolution({ title: 'Rejected step', step: 2, status: 'rejected' });
    await insertSolution({ title: 'No step' });
    const sh = await loadStartHere(env, wardId, founderId);
    expect(sh.rows.map((r) => r.solutionId)).toEqual([delta, bravo, charlie, echo]);
    expect(sh.rows.map((r) => r.step)).toEqual([1, 1, 1, 3]);
    expect(sh.total).toBe(4);
    expect(sh.rows[0]!.summary).toBe('About Delta');
  });

  it('maps statuses, counts Done, picks Next, names owners', async () => {
    await clearSteps();
    const { wardId, founderId, memberId } = await wardWithMember();
    const x = await insertSolution({ title: 'Step X', step: 1 });
    const y = await insertSolution({ title: 'Step Y', step: 2 });
    await insertSolution({ title: 'Step Z', step: 3 });
    await insertImpl({ wardId, solutionId: x, status: 'implemented', owner: founderId });
    await insertImpl({ wardId, solutionId: y, status: 'in_progress', owner: null });
    const sh = await loadStartHere(env, wardId, memberId);
    expect(sh.rows.map((r) => r.status)).toEqual(['implemented', 'in_progress', 'not_started']);
    expect(sh.rows.map((r) => r.ownerName)).toEqual(['Founder', null, null]);
    expect(sh.rows.map((r) => r.isNext)).toEqual([false, true, false]);
    expect(sh.done).toBe(1);
    expect(sh.total).toBe(3);
    expect(sh.next?.solutionId).toBe(y);

    const page = await getPage(memberId, `/w/${wardId}/start`);
    expect(page.status).toBe(200);
    expect(page.html).toContain('<h1>Start here</h1>');
    expect(page.html).toContain('Order is advice, not a lock: open any step.');
    expect(page.html).toContain('Step 1');
    expect(page.html).toContain(`href="/w/${wardId}/s/${x}"`);
    expect(page.html).toContain('About Step X');
    expect(page.html).toContain('>Done<');
    expect(page.html).toContain('>In progress<');
    expect(page.html).toContain('>Not started<');
    expect(page.html).toContain('Owner: Founder');
    expect(page.html).toMatch(/class="[^"]*\bnext\b[^"]*"[^]*?Step Y/);
    expect(page.html).toContain('>Next<');
    expect(page.html).toContain('WardForward is an independent tool');

    const home = await getPage(memberId, `/w/${wardId}`);
    expect(home.html).toContain('Start here: 1 of 3 done · Next: Step Y');
    expect(home.html).toContain(`href="/w/${wardId}/start"`);
  });

  it('a restricted entry the viewer cannot see: no status, no owner, not Done, not Next', async () => {
    await clearSteps();
    const { wardId, founderId, memberId } = await wardWithMember();
    const x = await insertSolution({ title: 'Secret step', step: 1 });
    const y = await insertSolution({ title: 'Open step', step: 2 });
    await insertImpl({ wardId, solutionId: x, status: 'implemented', owner: founderId, visibility: 'restricted' });

    const asMember = await loadStartHere(env, wardId, memberId);
    expect(asMember.rows[0]).toMatchObject({ solutionId: x, status: null, ownerName: null, isNext: false });
    expect(asMember.done).toBe(0);
    expect(asMember.next?.solutionId).toBe(y);
    const page = await getPage(memberId, `/w/${wardId}/start`);
    expect(page.html).toContain('Private');
    expect(page.html).not.toContain('Owner: Founder');
    const home = await getPage(memberId, `/w/${wardId}`);
    expect(home.html).toContain('Start here: 0 of 2 done · Next: Open step');

    // A restricted, not-done entry the viewer can't see is never Next either.
    await env.DB.prepare(`UPDATE implementations SET status = 'in_progress' WHERE solution_id = ?`).bind(x).run();
    expect((await loadStartHere(env, wardId, memberId)).next?.solutionId).toBe(y);

    // The superadmin (break-glass) sees it.
    await env.DB.prepare(`UPDATE implementations SET status = 'implemented' WHERE solution_id = ?`).bind(x).run();
    const asSuper = await loadStartHere(env, wardId, founderId);
    expect(asSuper.rows[0]).toMatchObject({ status: 'implemented', ownerName: 'Founder' });
    expect(asSuper.done).toBe(1);
  });

  it('a restricted entry its owner can see (not a superadmin)', async () => {
    await clearSteps();
    const { wardId, memberId } = await wardWithMember();
    const x = await insertSolution({ title: 'Mine', step: 1 });
    await insertImpl({ wardId, solutionId: x, status: 'in_progress', owner: memberId, visibility: 'restricted' });
    const sh = await loadStartHere(env, wardId, memberId);
    expect(sh.rows[0]).toMatchObject({ status: 'in_progress', ownerName: 'Plain Member', isNext: true });
  });

  it("only this ward's implementations count", async () => {
    await clearSteps();
    const a = await wardWithMember();
    const b = await makeWard(env);
    const x = await insertSolution({ title: 'Shared step', step: 1 });
    await insertImpl({ wardId: b.wardId, solutionId: x, status: 'implemented', owner: b.founderId });
    const sh = await loadStartHere(env, a.wardId, a.memberId);
    expect(sh.rows[0]!.status).toBe('not_started');
    expect(sh.done).toBe(0);
  });
});

describe('Start here home card, catalog link and route', () => {
  it('all done: the card is the small "Start here ✓" link', async () => {
    await clearSteps();
    const { wardId, founderId, memberId } = await wardWithMember();
    for (const [i, t] of ['One', 'Two'].entries()) {
      const id = await insertSolution({ title: t, step: i + 1 });
      await insertImpl({ wardId, solutionId: id, status: 'implemented', owner: founderId });
    }
    const home = await getPage(memberId, `/w/${wardId}`);
    expect(home.html).toContain('Start here ✓');
    expect(home.html).not.toContain('of 2 done');
    expect(home.html).toContain(`href="/w/${wardId}/start"`);
  });

  it('no step solutions: no card', async () => {
    await clearSteps();
    const { wardId, memberId } = await wardWithMember();
    const home = await getPage(memberId, `/w/${wardId}`);
    expect(home.status).toBe(200);
    expect(home.html).not.toContain('Start here');
    expect(home.html).not.toContain(`/w/${wardId}/start`);
  });

  it('the catalog links to Start here', async () => {
    const { wardId, memberId } = await wardWithMember();
    const cat = await getPage(memberId, `/w/${wardId}/catalog`);
    expect(cat.html).toContain(`href="/w/${wardId}/start"`);
    expect(cat.html).toContain("Start here: the Executive Secretary's setup steps");
  });

  it('403 for a non-member, 404 for an unknown ward', async () => {
    const { wardId } = await makeWard(env);
    const outsider = await ensureUser(env, uniqueEmail('outsider'), 'Outsider');
    expect((await getPage(outsider, `/w/${wardId}/start`)).status).toBe(403);
    expect((await getPage(outsider, `/w/no-such-ward/start`)).status).toBe(404);
  });

  it('statements on the ward home and Start here pages do not grow with the number of steps', async () => {
    await clearSteps();
    const { wardId, founderId, memberId } = await wardWithMember();
    const addSteps = async (from: number, n: number) => {
      for (let i = from; i < from + n; i++) {
        const id = await insertSolution({ title: `Counted ${i}`, step: i });
        await insertImpl({ wardId, solutionId: id, status: 'in_progress', owner: founderId });
      }
    };
    const count = async (path: string) => {
      const cookie = await asUser(memberId);
      return countQueries(async () => {
        await (await SELF.fetch(`http://localhost${path}`, { headers: { cookie } })).text();
      });
    };
    await addSteps(1, 2);
    const before = [await count(`/w/${wardId}`), await count(`/w/${wardId}/start`)];
    await addSteps(3, 10);
    expect([await count(`/w/${wardId}`), await count(`/w/${wardId}/start`)]).toEqual(before);
  });

  it('escapes titles and summaries (A2)', async () => {
    await clearSteps();
    const { wardId, memberId } = await wardWithMember();
    await insertSolution({ title: '<b>Bold</b> & co', step: 1 });
    const page = await getPage(memberId, `/w/${wardId}/start`);
    expect(page.html).toContain('&lt;b&gt;Bold&lt;/b&gt; &amp; co');
    expect(page.html).not.toContain('<b>Bold</b>');
    const home = await getPage(memberId, `/w/${wardId}`);
    expect(home.html).toContain('Next: &lt;b&gt;Bold&lt;/b&gt; &amp; co');
  });
});

// ---------------------------------------------------------------- Task A3: landing line, seed

// The spec's §3 titles, in step order.
const SPEC_TITLES = [
  "Create the ward's role account",
  'Set up WardForward: callings and spaces',
  'Put the role account on the right Google plan',
  'Create one calendar per leader',
  'Create the booking pages',
  'Install the interview router',
  'Get zippa.run access and make your links',
  "Publish the ward's public portal",
  'Turn on service opportunities and requests',
  'Print the foyer flyer',
  'Set up virtual interviews (Zoom)',
  'Bishopric meeting assignment rotation',
  'Ward Council assignment rotation',
  'Write the hand-off note',
];

// The generator writes one statement per line; header lines are comments.
async function applySeed(): Promise<void> {
  const stmts = seedSql.split(/\r?\n/).filter((l) => /^INSERT /.test(l));
  expect(stmts).toHaveLength(14);
  await env.DB.batch(stmts.map((s) => env.DB.prepare(s)));
}

describe('landing page', () => {
  it('tells a new Executive Secretary to sign in and request the ward first', () => {
    const html = renderLanding();
    expect(html).toContain('New Executive Secretary? Your first move is to sign in and request your ward.');
    expect(html).toContain('request your ward');
    expect(html).toContain('then your setup steps are waiting under Start here.');
  });
});

describe('db/seed-start-here.sql', () => {
  it('applied twice gives the 14 published steps in spec order, and re-running refreshes them', async () => {
    await clearSteps();
    await applySeed();
    await env.DB.prepare(`UPDATE solutions SET title = 'Edited', setup_step = 40, status = 'draft' WHERE id = 'sol_es_zoom'`).run();
    await applySeed();
    const rows = (
      await env.DB.prepare(
        `SELECT id, title, category, implementation_scope, status, setup_step, body FROM solutions
          WHERE setup_step IS NOT NULL ORDER BY setup_step`,
      ).all<{ id: string; title: string; category: string; implementation_scope: string; status: string; setup_step: number; body: string }>()
    ).results;
    expect(rows).toHaveLength(14);
    expect(rows.map((r) => r.title)).toEqual(SPEC_TITLES);
    expect(rows.map((r) => r.setup_step)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    for (const r of rows) {
      expect(r).toMatchObject({ category: 'exec_secretary', implementation_scope: 'ward_singleton', status: 'published' });
      expect(r.id).toMatch(/^sol_es_/);
      expect(r.body).toContain('## Done when');
      expect(r.body).toContain('\n- ');
    }
    expect(rows[0]!.id).toBe('sol_es_role_account');
    expect(rows[13]!.id).toBe('sol_es_handoff_note');

    const { wardId, memberId } = await wardWithMember();
    const sh = await loadStartHere(env, wardId, memberId);
    expect(sh.rows).toHaveLength(14);
    expect(sh.rows.map((r) => r.title)).toEqual(SPEC_TITLES);
    expect(sh.next?.solutionId).toBe('sol_es_role_account');
  });
});

// ---------------------------------------------------------------- Task B1: how-to bodies
// The content files reach the Workers runtime through the generated seed (npm run
// seed:start-here:check keeps it equal to content/start-here/*.md).

describe('Start here how-tos (steps 1-11 and 14)', () => {
  it('each full how-to is substantial, has a Done when list, and carries its fixed notes', async () => {
    await clearSteps();
    await applySeed();
    const rows = (
      await env.DB.prepare(`SELECT id, setup_step, body FROM solutions WHERE id LIKE 'sol_es_%' ORDER BY setup_step`).all<{
        id: string; setup_step: number; body: string;
      }>()
    ).results;
    const byStep = new Map(rows.map((r) => [r.setup_step, r]));
    for (const step of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14]) {
      const r = byStep.get(step)!;
      expect(r.body.length, `step ${step}`).toBeGreaterThan(600);
      expect(r.body, `step ${step}`).toContain('Done when');
      expect(r.body, `step ${step}`).not.toContain('Full how-to coming soon');
      expect(r.body, `step ${step}`).not.toMatch(/\\n/); // no encoding left in the stored text
    }
    expect(byStep.get(1)!.body).toContain('zippa.run');
    expect(byStep.get(2)!.body).toContain('38.8.21.2');
    expect(byStep.get(2)!.body).toContain('Ward Clerk');
    expect(byStep.get(7)!.body).toMatch(/prefix/);
    expect(byStep.get(8)!.body).toContain('Public');
    expect(byStep.get(8)!.body).toContain('Save share link');
    expect(byStep.get(9)!.body).toContain('Portal service sections');
    expect(byStep.get(11)!.body).toContain('38.8.32');
  });

  it('carries no M44 data', () => {
    for (const bad of [/@group\.calendar\.google\.com/, /Mapleton/i, /M44/i, /1830/]) {
      expect(seedSql, String(bad)).not.toMatch(bad);
    }
  });

  it('the old placeholder examples are gone from seed-solutions.sql except the DELETE that removes them', () => {
    const lines = solutionsSeedSql.split(/\r?\n/).filter((l) => /sol_ex_interviews|sol_ex_bulletin/.test(l));
    expect(lines).toEqual([`DELETE FROM solutions WHERE id IN ('sol_ex_interviews','sol_ex_bulletin');`]);
  });
});
