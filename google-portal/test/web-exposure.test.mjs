// Every top-level function whose name does not end in _ can be called by any visitor of a page
// the web app serves, through google.script.run, running as the shared account. These tests
// call them that way and check nothing happens and nothing comes back.
import { describe, it, expect } from 'vitest';
import { createFakes } from './fakes.mjs';
import { loadPortal, seedPost } from './harness.mjs';

/** Pure helpers: they only compute from their arguments and touch no data. */
const PURE = [
  'isDateStr', 'isTimeStr', 'normDate', 'normTime', 'normLocalDT', 'normMonth', 'addDays', 'weekday', 'localMinusHours', 'cmpLocal',
  'sanitizeCell', 'esc', 'isEmail', 'normEmail', 'clip', 'isTicked', 'splitList',
  'validatePost', 'countsBySlot', 'slotStart', 'postSummary', 'publicPost', 'checkSignup', 'cancelIsLate', 'remindersDue',
  'postsToMarkPast', 'leaderAccess', 'canSeePost', 'canEditPost', 'noticeRecipients', 'rateCheck',
  'volunteerState', 'signupStatusFor', 'overLimitOnConfirm', 'canApprove', 'approversFor', 'nudgesDue', 'lapsesDue', 'warningsDue',
  'needsHelpSoon',
  'requestReaders', 'requestNotifyList', 'bishopricEmails', 'adminEmails', 'stampClosed', 'rowsToPurge', 'rowsToCarry', 'needsRotation', 'sharingDiff',
];
/** The intended public entry points (checked below or in web.test.mjs). */
const ENTRY = ['doGet', 'doPost', 'gpApi'];
/** Must do nothing when a web visitor calls them. */
const GUARDED = [
  'gpOnRequestSubmit', 'onOpen', 'gpMenuSetUp', 'gpMenuSyncSharing', 'gpMenuInstallTriggers', 'gpMenuMakeHubFiles',
  'gpMenuSendLeaderLinks', 'gpMenuCheckHealth', 'gpTenMinute', 'gpHourly', 'gpDaily',
];

describe('functions a web visitor can call', () => {
  it('are exactly the reviewed list (a new one must be added here on purpose)', () => {
    // Every global function of the loaded script (however it was defined), minus the fake Google
    // services and the harness's own globals.
    const gp = loadPortal();
    const notOurs = new Set([...Object.keys(createFakes().globals), 'console', '__gpNowMs', 'Date', 'fakes']);
    const names = Object.getOwnPropertyNames(gp).filter((n) => typeof gp[n] === 'function' && !notOurs.has(n) && !n.endsWith('_'));
    expect(names.sort()).toEqual([...PURE, ...ENTRY, ...GUARDED].sort());
  });

  function primed() {
    const gp = loadPortal({ seed: true });
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpMenuSetUp();
    gp.gpMenuInstallTriggers();
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-02' }]);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother Volunteer', email: 'brother.volunteer@example.test' });
    gp.systemTab_('Outbox').append({ Id: 'mx', 'Queued at': '2026-11-01 10:00', To: 'leaky@example.test', Subject: 'Old', Status: 'Failed', Priority: 'normal' });
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'sister.helper@example.test'), { 'Send leader link': true });
    gp.fakes.setNow('2026-12-01 18:30'); // a reminder is due
    gp.fakes.mail.sent.length = 0;
    // From here on: an anonymous visitor in the web app.
    gp.fakes.state.webContext = true;
    gp.fakes.state.activeUser = '';
    return gp;
  }

  for (const name of GUARDED) {
    it(`${name} does nothing and returns nothing for a visitor`, () => {
      const gp = primed();
      const before = {
        triggers: gp.fakes.triggers.length,
        files: gp.fakes.drive.files.size,
        perms: JSON.stringify([...gp.fakes.drive.permissions.entries()].map(([k, v]) => [k, [...v.keys()]])),
        posts: JSON.stringify(gp.fakes.spreadsheet.getSheetByName('Sign-ups').raw()),
      };
      for (const arg of [undefined, {}, { triggerUid: 'guess' }, { source: {}, response: {} }]) {
        let out;
        try {
          out = gp[name](arg);
        } catch (e) {
          out = undefined;
        }
        expect(out).toBeUndefined();
      }
      expect(gp.fakes.mail.sent).toEqual([]);
      expect(gp.fakes.triggers.length).toBe(before.triggers);
      expect(gp.fakes.drive.files.size).toBe(before.files);
      expect(JSON.stringify([...gp.fakes.drive.permissions.entries()].map(([k, v]) => [k, [...v.keys()]]))).toBe(before.perms);
      expect(JSON.stringify(gp.fakes.spreadsheet.getSheetByName('Sign-ups').raw())).toBe(before.posts);
      const outbox = gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID')).rowsOf('Outbox');
      expect(outbox.filter((m) => m.Status === 'Queued')).toEqual([]);
    });
  }

  it('the real triggers and the owner in the editor still run the jobs', () => {
    const gp = primed();
    gp.fakes.state.webContext = false;
    const hourly = gp.fakes.triggers.find((t) => t.handler === 'gpHourly');
    gp.gpHourly({ triggerUid: hourly.getUniqueId() });
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['brother.volunteer@example.test']);
    gp.fakes.state.activeUser = 'ward.account@example.test';
    gp.gpTenMinute();
    expect(gp.fakes.mail.sent.map((m) => m.to)).toContain('sister.helper@example.test');
  });

  it('a flood of broken form events sends no alert email', () => {
    const gp = primed();
    gp.fakes.state.webContext = false;
    for (let i = 0; i < 60; i++) gp.gpOnRequestSubmit({ source: { getId: 'x' }, response: {} });
    expect(gp.fakes.mail.sent).toEqual([]);
  });
});
