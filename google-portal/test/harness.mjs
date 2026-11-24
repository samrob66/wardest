// Loads the generated Code.gs (exactly what Sam pastes) into a fresh `vm` context with the
// in-memory Google fakes from fakes.mjs. Every top-level function and var is a property of the
// returned context; `ctx.fakes` holds the fake services and test controls.
import vm from 'node:vm';
import { buildCode } from '../build.mjs';
import { createFakes } from './fakes.mjs';

let script = null;
function compiled() {
  if (!script) script = new vm.Script(buildCode(), { filename: 'Code.gs' });
  return script;
}

export const WARD = {
  ward_name: 'Riverbend 1st Ward (example)',
  ward_prefix: 'rb1',
  time_zone: 'America/Denver',
  contact_email: 'help@riverbend.example',
  web_app_url: 'https://script.example.test/macros/s/EXAMPLE/exec',
};

/** Invented leaders of the invented Riverbend ward. */
export const LEADERS = [
  { Name: 'Bishop Example', Email: 'bishop.example@example.test', Calling: 'Bishop', Organization: 'Bishopric', Bishopric: true, 'Ward council': true },
  { Name: 'Brother Counselor', Email: 'brother.counselor@example.test', Calling: 'First Counselor', Organization: 'Bishopric', Bishopric: true, 'Ward council': true },
  { Name: 'Brother Clerk', Email: 'brother.clerk@example.test', Calling: 'Executive Secretary', Organization: 'Bishopric', Bishopric: true, 'Ward council': true },
  { Name: 'Sister Example', Email: 'sister.example@example.test', Calling: 'Relief Society President', Organization: 'Relief Society', 'Ward council': true, 'Org editor': true },
  { Name: 'Brother Sample', Email: 'brother.sample@example.test', Calling: 'Elders Quorum President', Organization: 'Elders Quorum', 'Ward council': true, 'Org editor': true },
  { Name: 'Sister Helper', Email: 'sister.helper@example.test', Calling: 'Primary Secretary', Organization: 'Primary', 'Org editor': true },
  { Name: 'Sister Coordinator', Email: 'sister.coordinator@example.test', Calling: 'Service Coordinator', Organization: 'Relief Society', Coordinator: true },
];

/** The rest of a full bishopric (1.1: Bishopric is ticked for all five callings). */
export const MORE_BISHOPRIC = [
  { Name: 'Brother Second', Email: 'Brother.Second@example.test ', Calling: 'Second Counselor', Organization: 'Bishopric', Bishopric: true, 'Ward council': true },
  { Name: 'Brother Recorder', Email: 'brother.recorder@example.test', Calling: 'Ward Clerk', Organization: 'Bishopric', Bishopric: true },
];

export function loadPortal(opts = {}) {
  const { globals, fakes } = createFakes(opts);
  const ctx = vm.createContext({ ...globals, console, __gpNowMs: () => fakes.nowMs() });
  // Make `new Date()` / Date.now() inside the script read the fake clock.
  vm.runInContext(
    `(function () {
      var RealDate = Date;
      function GPDate() {
        var a = Array.prototype.slice.call(arguments);
        if (!(this instanceof GPDate)) return new RealDate(__gpNowMs()).toString();
        if (a.length === 0) return new RealDate(__gpNowMs());
        return new (Function.prototype.bind.apply(RealDate, [null].concat(a)))();
      }
      GPDate.prototype = RealDate.prototype;
      GPDate.now = function () { return __gpNowMs(); };
      GPDate.UTC = RealDate.UTC;
      GPDate.parse = RealDate.parse;
      Date = GPDate;
    })();`,
    ctx
  );
  compiled().runInContext(ctx);
  ctx.fakes = fakes;
  if (opts.seed) seed(ctx, opts.seed === true ? {} : opts.seed);
  return ctx;
}

/** Sets one Settings value (row by Key) and clears the per-execution memo. */
export function setSetting(ctx, key, value) {
  const sh = ctx.fakes.spreadsheet.getSheetByName('Settings');
  const data = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  const i = data.findIndex((r) => r[0] === key);
  if (i < 0) throw new Error('no setting ' + key);
  sh.getRange(i + 1, 2).setValue(value);
  ctx.gpBegin_();
}

export function addLeader(ctx, leader) {
  ctx.serviceTab_('Leaders').append(leader);
  ctx.gpBegin_();
}

/**
 * Writes a post and its slots straight into the tabs. post: Posts columns (defaults filled in);
 * slots: Slots columns. Returns {post, slots}.
 */
export function seedPost(ctx, post = {}, slots = []) {
  const p = {
    'Post id': 'p1',
    'Public id': 'pubmeals01',
    Organization: 'Relief Society',
    Category: 'meals',
    Title: 'Meals for the Sample family',
    Audiences: 'Sisters, Brothers',
    'Public note': 'Dinner drop-off for a family with a new baby.',
    'Private details': '123 Example Lane',
    'Cancel cutoff hours': 24,
    Status: 'Open',
    'Created by': 'sister.example@example.test',
    'Created at': '2026-11-30 09:00',
    'Last changed by': 'Sister Example',
    'Last changed at': '2026-11-30 09:00',
    ...post,
  };
  ctx.serviceTab_('Posts').append(p);
  const ss = slots.map((s, i) => ({
    'Slot id': `${p['Post id']}-s${i + 1}`,
    'Post id': p['Post id'],
    Date: '2026-12-03',
    Start: '17:00',
    End: '18:00',
    Role: 'Bring a meal',
    Needed: 1,
    'Role note': '',
    'Bringing prompt': 'What are you bringing?',
    Filled: 0,
    Waiting: 0,
    ...s,
  }));
  ctx.serviceTab_('Slots').appendMany(ss);
  ctx.gpBegin_();
  return { post: p, slots: ss };
}

/**
 * Volunteers the phase 1 tests sign up with, already approved (phase 2 makes a new address wait
 * for its email click and a leader's approval). Phase 2 tests use other addresses.
 */
export const APPROVED_VOLUNTEERS = [
  'brother.volunteer@example.test',
  'sister.volunteer@example.test',
  'sister.other@example.test',
  'one@example.test',
  'two@example.test',
  'three@example.test',
  'first@example.test',
  'fresh@example.test',
  'a@example.test',
];

/** Adds Approved Volunteers rows (as if a leader had approved them). */
export function approveVolunteers(ctx, emails) {
  ctx.serviceTab_('Volunteers').appendMany(
    emails.map((e) => ({ Email: e, Name: 'Approved Volunteer', Status: 'Approved', 'Decided by': 'Bishop Example', 'Decided at': '2026-11-20 10:00', 'First post': 'p1', 'Email confirmed at': '2026-11-19 10:00' }))
  );
  ctx.gpBegin_();
}

function seed(ctx, { settings = {}, leaders = LEADERS, approved = APPROVED_VOLUNTEERS } = {}) {
  ctx.gpEnsureTabs_(ctx.fakes.spreadsheet);
  ctx.gpEnsureSystemTabs_(ctx.fakes.system);
  ctx.gpBegin_();
  for (const [k, v] of Object.entries({ ...WARD, ...settings })) setSetting(ctx, k, v);
  for (const l of leaders) addLeader(ctx, l);
  if (approved.length) approveVolunteers(ctx, approved);
  ctx.gpBegin_();
}
