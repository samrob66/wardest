#!/usr/bin/env node
// Builds db/seed-start-here.sql from content/start-here/NN-<slug>.md (the Executive Secretary's
// Start here steps; spec docs/superpowers/specs/2026-11-23-execsec-start-here-design.md).
//
//   npm run seed:start-here         rewrite db/seed-start-here.sql
//   npm run seed:start-here:check   exit 1 if db/seed-start-here.sql is out of date
//
// Each file is frontmatter (id, step, title, summary, category, template_type, template_value,
// optional video_url) between `---` lines, then the Markdown how-to body. The solution's slug is
// the filename's <slug> part. The output has one INSERT ... ON CONFLICT(id) DO UPDATE per file,
// each on a single line, so re-running the seed refreshes every content column and setup_step.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(root, 'content', 'start-here');
const OUT = join(root, 'db', 'seed-start-here.sql');
const OUT_REL = 'db/seed-start-here.sql';

const CATEGORIES = ['exec_secretary', 'ward_clerk', 'bishopric', 'org_presidencies', 'activities_committee', 'ward_mission'];
const TEMPLATE_TYPES = ['google_copy', 'file', 'ai_prompt', 'link', 'other'];
const KEYS = ['id', 'step', 'title', 'summary', 'category', 'template_type', 'template_value', 'video_url'];
const FILE_RE = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const ID_RE = /^sol_[a-z0-9_]+$/;

class ContentError extends Error {}

function fail(file, msg) {
  throw new ContentError(`${file}: ${msg}`);
}

function parseFile(file, text) {
  const m = FILE_RE.exec(file);
  if (!m) fail(file, 'file name must be NN-<slug>.md (lowercase letters, digits and hyphens)');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0] !== '---') fail(file, 'must start with a --- frontmatter line');
  const end = lines.indexOf('---', 1);
  if (end < 0) fail(file, 'frontmatter has no closing --- line');
  const fm = {};
  for (const line of lines.slice(1, end)) {
    if (line.trim() === '') continue;
    const i = line.indexOf(':');
    if (i < 0) fail(file, `bad frontmatter line: ${line}`);
    const key = line.slice(0, i).trim();
    if (!KEYS.includes(key)) fail(file, `unknown frontmatter key "${key}"`);
    if (key in fm) fail(file, `duplicate frontmatter key "${key}"`);
    fm[key] = line.slice(i + 1).trim();
  }
  const body = lines.slice(end + 1).join('\n').trim();

  for (const k of ['id', 'step', 'title', 'summary', 'category']) if (!fm[k]) fail(file, `"${k}" is required`);
  if (!ID_RE.test(fm.id)) fail(file, `id "${fm.id}" must look like sol_<letters_digits>`);
  if (!/^[0-9]{1,2}$/.test(fm.step) || Number(fm.step) < 1 || Number(fm.step) > 99) fail(file, 'step must be a whole number from 1 to 99');
  const step = Number(fm.step);
  if (Number(m[1]) !== step) fail(file, `file number ${m[1]} does not match step ${step}`);
  if (!CATEGORIES.includes(fm.category)) fail(file, `unknown category "${fm.category}"`);
  if (fm.template_type && !TEMPLATE_TYPES.includes(fm.template_type)) fail(file, `unknown template_type "${fm.template_type}"`);
  if (fm.template_value && !fm.template_type) fail(file, 'template_value needs a template_type');
  if (!body) fail(file, 'the how-to body is empty');

  return {
    id: fm.id,
    step,
    slug: m[2],
    title: fm.title,
    summary: fm.summary,
    category: fm.category,
    body,
    video_url: fm.video_url || null,
    template_type: fm.template_type || null,
    template_value: fm.template_value || null,
  };
}

// A SQL string literal on one line: quotes doubled, each newline as char(10).
function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return v
    .split('\n')
    .map((part) => `'${part.replace(/'/g, "''")}'`)
    .join(' || char(10) || ');
}

const COLS = ['id', 'category', 'title', 'slug', 'summary', 'body', 'video_url', 'template_type', 'template_value', 'implementation_scope', 'status', 'setup_step'];

function statement(s) {
  const vals = [s.id, s.category, s.title, s.slug, s.summary, s.body, s.video_url, s.template_type, s.template_value, 'ward_singleton', 'published', s.step];
  const updates = COLS.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`);
  return (
    `INSERT INTO solutions (${COLS.join(', ')}) VALUES (${vals.map(lit).join(', ')}) ` +
    `ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}, updated_at = datetime('now');`
  );
}

function build(dir = CONTENT_DIR) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  if (!files.length) throw new ContentError(`no .md files in ${dir}`);
  const steps = files.map((f) => parseFile(f, readFileSync(join(dir, f), 'utf8')));
  const seen = { id: new Map(), step: new Map(), slug: new Map() };
  steps.forEach((s, i) => {
    for (const k of ['id', 'step', 'slug']) {
      if (seen[k].has(s[k])) throw new ContentError(`${files[i]}: ${k} ${s[k]} is also used by ${seen[k].get(s[k])}`);
      seen[k].set(s[k], files[i]);
    }
  });
  steps.sort((a, b) => a.step - b.step);
  return [
    '-- GENERATED by scripts/build-start-here-seed.mjs from content/start-here/*.md. Do not edit by hand:',
    '-- edit the Markdown, then run `npm run seed:start-here` (`npm run seed:start-here:check` verifies).',
    "-- The Executive Secretary's Start here steps (global catalog solutions with setup_step).",
    '-- Idempotent: re-running refreshes every content column and setup_step.',
    '-- Load locally: npm run db:seed:start-here:local',
    ...steps.map(statement),
    '',
  ].join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  let sql;
  try {
    sql = build();
  } catch (e) {
    if (e instanceof ContentError) {
      console.error(e.message);
      process.exit(2);
    }
    throw e;
  }
  if (check) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current !== sql) {
      console.error(`${OUT_REL} is out of date; run npm run seed:start-here`);
      process.exit(1);
    }
    console.log(`${OUT_REL} is up to date`);
    return;
  }
  writeFileSync(OUT, sql);
  console.log(`wrote ${OUT_REL}`);
}

main();
