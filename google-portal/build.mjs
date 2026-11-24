// Builds the paste-ready Apps Script files for the Google-only portal.
//
//   node google-portal/build.mjs          write dist/Code.gs and dist/appsscript.json
//   node google-portal/build.mjs --check  exit 1 (naming the stale file) when dist/ is out of date
//
// Code.gs = every apps-script/NN-*.js file in numeric order, then each page in pages/ with
// gp.css and gp.js inlined, as `var GP_PAGES = {...}` (JSON strings), then the hub sections
// snippet as `var GP_HUB_SECTIONS = "..."`. Everything is normalized to LF line endings.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GP_DIR = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(GP_DIR, 'apps-script');
const PAGES_DIR = join(GP_DIR, 'pages');
const DIST_DIR = join(GP_DIR, 'dist');

export const SOURCE_ORDER = readdirSync(SRC_DIR)
  .filter((f) => /^\d\d-[a-z0-9-]+\.js$/.test(f))
  .sort();

export const PAGE_NAMES = ['serve', 'post', 'help', 'confirm', 'leader'];

const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const HEADER = `// GENERATED FILE: do not edit. Built by google-portal/build.mjs from google-portal/apps-script/
// and google-portal/pages/ in the WardForward repository.
// To update: change those source files, run \`npm run gp:build\`, then in the Apps Script editor
// select everything in Code.gs, paste this whole file over it, Save, and make a new version of the
// web app deployment (Deploy > Manage deployments > pencil > Version: New version > Deploy).
`;

/** One page with gp.css and gp.js inlined. */
export function buildPage(name) {
  const css = read(join(PAGES_DIR, 'gp.css'));
  const js = read(join(PAGES_DIR, 'gp.js'));
  if (/<\/script/i.test(js)) throw new Error('gp.js must not contain a closing script tag');
  return read(join(PAGES_DIR, `${name}.html`))
    .replace('<!-- GP:CSS -->', () => `<style>\n${css}</style>`)
    .replace('<!-- GP:JS -->', () => `<script>\n${js}</script>`);
}

export function buildCode() {
  const parts = [HEADER];
  for (const file of SOURCE_ORDER) {
    parts.push(`\n// ===== ${file} =====\n\n${read(join(SRC_DIR, file))}`);
  }
  const pages = {};
  for (const name of PAGE_NAMES) pages[name] = buildPage(name);
  parts.push('\n// ===== pages (generated from google-portal/pages/) =====\n\n');
  parts.push(`var GP_PAGES = ${JSON.stringify(pages, null, 1)};\n`);
  parts.push(`\nvar GP_HUB_SECTIONS = ${JSON.stringify(read(join(PAGES_DIR, 'hub-sections.html')))};\n`);
  return parts.join('');
}

export function buildManifest() {
  return read(join(SRC_DIR, 'appsscript.json'));
}

function main() {
  const check = process.argv.includes('--check');
  const outputs = { 'Code.gs': buildCode(), 'appsscript.json': buildManifest() };
  if (check) {
    let stale = false;
    for (const [file, text] of Object.entries(outputs)) {
      let onDisk = null;
      try {
        onDisk = read(join(DIST_DIR, file));
      } catch {
        onDisk = null;
      }
      if (onDisk !== text) {
        console.error(`google-portal/dist/${file} is out of date. Run: npm run gp:build`);
        stale = true;
      }
    }
    if (stale) process.exit(1);
    console.log('google-portal/dist is up to date.');
    return;
  }
  mkdirSync(DIST_DIR, { recursive: true });
  for (const [file, text] of Object.entries(outputs)) writeFileSync(join(DIST_DIR, file), text);
  console.log(`Wrote google-portal/dist/Code.gs (${outputs['Code.gs'].length} chars) and appsscript.json.`);
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) main();
