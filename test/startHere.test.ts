// Executive Secretary "Start here" track (spec 2026-11-23-execsec-start-here-design.md).
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import schemaSql from '../db/schema.sql?raw';
import upgradeSql from '../db/upgrade-2026-11-23-start-here.sql?raw';
import { asUser, ensureUser, env, schemaStatements, uniqueEmail } from './helpers';
import { parseSetupStep } from '../src/lib/solutions';
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
