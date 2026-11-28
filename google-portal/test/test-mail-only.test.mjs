// 2.3.1: Settings test_mail_only sends every email only to the listed test addresses
// (decision 21). The switch sits in sendMailNow_, the one place that calls MailApp.sendEmail.
import { describe, it, expect } from 'vitest';
import { loadPortal, setSetting, seedPost } from './harness.mjs';
import { formSubmitEvent } from './fakes.mjs';
import { buildCode } from '../build.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const ME = 'brother.example.home@example.test';
const WIFE = 'sister.example.home@example.test';
const B = 'test.b@example.test';
const BC = 'test.b+c@example.test';
const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));

function ward(list) {
  const gp = loadPortal({ seed: true });
  if (list !== undefined) setSetting(gp, 'test_mail_only', list);
  seedPost(gp, {}, [
    { 'Slot id': 'm1', Date: '2026-12-03', Needed: 1 },
    { 'Slot id': 'm2', Date: '2026-12-04', Needed: 5 },
  ]);
  gp.fakes.mail.sent.length = 0;
  return gp;
}
const sent = (gp) => gp.fakes.mail.sent.map((m) => ({ to: m.to, subject: m.subject }));

describe('test_mail_only', () => {
  it('Set up adds the row, blank; a ward on 2.3 gets it from its next job', () => {
    const gp = loadPortal({ seed: true });
    expect(gp.settings_().test_mail_only).toBe('');
    const t = gp.table_(gp.fakes.spreadsheet.getSheetByName('Settings'));
    t.remove(t.find('Key', 'test_mail_only'));
    gp.fakes.props.set('SCHEMA_VERSION', 'phase-2.3');
    gp.gpBegin_();
    gp.gpTenMinute();
    expect(gp.fakes.spreadsheet.rowsOf('Settings').map((r) => r.Key)).toContain('test_mail_only');
  });

  it('blank: mail is unchanged', () => {
    const gp = ward();
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: 'Brother.New@example.test' });
    expect(sent(gp)).toEqual([{ to: 'brother.new@example.test', subject: 'Please confirm your email: Meals for the Sample family' }]);
  });

  it('set: listed addresses get mail unchanged; anyone else\'s goes to the first address with the prefix', () => {
    const gp = ward(` ${ME}, ${WIFE}, ${B}, ${BC} `);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Wife', email: ` ${WIFE.toUpperCase()} ` });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Test C', email: BC });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Test D', email: 'test.b+d@example.test' });
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Stranger', email: 'stranger@example.test' });
    expect(sent(gp)).toEqual([
      { to: WIFE, subject: 'Please confirm your email: Meals for the Sample family' },
      { to: BC, subject: 'Please confirm your email: Meals for the Sample family' },
      { to: ME, subject: '[TEST for test.b+d@example.test] Please confirm your email: Meals for the Sample family' },
      { to: ME, subject: '[TEST for stranger@example.test] Please confirm your email: Meals for the Sample family' },
    ]);
    // The Log names the original recipient and says it was redirected.
    const log = sys(gp).rowsOf('Log').filter((l) => l.What === 'mail sent').map((l) => l.Detail);
    expect(log.some((d) => d.startsWith('stranger@example.test | ') && d.includes('redirected to test address'))).toBe(true);
    expect(log.some((d) => d.startsWith(WIFE + ' | ') && !d.includes('redirected'))).toBe(true);
  });

  it('every path goes through the switch: confirmation, approval notice, request notice, admin alert, leader link, outbox retry, health email', () => {
    const gp = ward(ME);
    const others = (m) => m.to !== ME;
    // Sign-up confirmation, then the approval notice to the bishopric.
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Brother New', email: 'brother.new@example.test' });
    const confirm = gp.fakes.mail.sent.find((m) => m.subject.includes('[TEST for brother.new@example.test] Please confirm'));
    expect(confirm).toBeTruthy();
    expect(plain(gp.apiConfirm_({ t: tokenFrom(confirm.body, 'confirm') })).ok).toBe(true);
    expect(gp.fakes.mail.sent.some((m) => m.subject === '[TEST for bishop.example@example.test] Waiting for approval: Brother New')).toBe(true);
    // A request notice.
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpBegin_();
    gp.gpMenuSetUp();
    const f = sys(gp).rowsOf('Request files').find((x) => x['Category id'] === 'other');
    gp.gpOnRequestSubmit(formSubmitEvent(gp.fakes.forms.get(f['Form id']), { Name: 'Sister Private', 'Phone or email': 'p@example.test' }));
    expect(gp.fakes.mail.sent.some((m) => m.subject === '[TEST for bishop.example@example.test] New Other help request')).toBe(true);
    // An admin alert.
    gp.alertAdmins_(['Test problem']);
    expect(gp.fakes.mail.sent.some((m) => m.subject.startsWith('[TEST for brother.clerk@example.test] ') && m.subject.includes('needs attention'))).toBe(true);
    // A leader link.
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'sister.helper@example.test'), { 'Send leader link': true });
    gp.gpBegin_();
    gp.gpMenuSendLeaderLinks();
    expect(gp.fakes.mail.sent.some((m) => m.subject.startsWith('[TEST for sister.helper@example.test] Your leader link'))).toBe(true);
    // An outbox retry: queued while the quota was low, sent by the drain.
    gp.fakes.setQuota(10);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Late One', email: 'late.one@example.test' });
    // Queued already addressed to the tester; the subject and the Log name the original.
    const queuedRow = sys(gp).rowsOf('Outbox').find((m) => m.Subject.includes('late.one@example.test'));
    expect(queuedRow.To).toBe(ME);
    expect(queuedRow.Subject).toBe('[TEST for late.one@example.test] Please confirm your email: Meals for the Sample family');
    expect(sys(gp).rowsOf('Log').some((l) => l.What === 'mail queued' && l.Detail.startsWith('late.one@example.test | '))).toBe(true);
    gp.fakes.setQuota(100);
    gp.gpTenMinute();
    expect(gp.fakes.mail.sent.some((m) => m.subject === '[TEST for late.one@example.test] Please confirm your email: Meals for the Sample family')).toBe(true);
    // The daily health email (it has the Test mode line, so it always goes).
    gp.gpBegin_();
    gp.gpDaily();
    const health = gp.fakes.mail.sent.filter((m) => m.subject.includes('needs attention') && m.body.includes('Test mode'));
    expect(health.length).toBeGreaterThan(0);
    for (const m of health) expect(m.to).toBe(ME);
    // Nothing anywhere reached anyone but the catch-all.
    expect(gp.fakes.mail.sent.filter(others)).toEqual([]);
  });

  it('one message per original recipient, and the quota is used as before', () => {
    const gp = ward(ME);
    setSetting(gp, 'admin_alerts_to', 'bishop.example@example.test, brother.clerk@example.test'); // two administrators
    const before = gp.fakes.state.quota;
    gp.alertAdmins_(['Two admins']);
    const alerts = gp.fakes.mail.sent.filter((m) => m.subject.includes('needs attention'));
    expect(alerts.map((m) => m.subject.slice(0, m.subject.indexOf(']') + 1)).sort()).toEqual([
      '[TEST for bishop.example@example.test]',
      '[TEST for brother.clerk@example.test]',
    ]);
    expect(before - gp.fakes.state.quota).toBe(2);
  });

  it('a bad entry: every message, even to a listed address, goes to the first valid one with the prefix', () => {
    const gp = ward(`${ME}, not an address, ${WIFE}`);
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Sister Wife', email: WIFE });
    expect(sent(gp)).toEqual([{ to: ME, subject: `[TEST for ${WIFE}] Please confirm your email: Meals for the Sample family` }]);
    const lines = gp.gpMenuCheckHealth();
    expect(lines.some((l) => l.startsWith('PROBLEM ') && l.includes('not an address'))).toBe(true);
  });

  it('no valid address at all: nothing is sent or queued, and each message is logged', () => {
    const gp = ward('nobody, also nobody');
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm2', name: 'Stranger', email: 'stranger@example.test' });
    gp.alertAdmins_(['A problem']);
    expect(gp.fakes.mail.sent).toEqual([]);
    expect(sys(gp).rowsOf('Outbox')).toEqual([]);
    const notSent = sys(gp).rowsOf('Log').filter((l) => l.What === 'test mode: not sent (test_mail_only has no valid address)');
    expect(notSent.map((l) => l.Detail.split(' | ')[0]).sort()).toEqual(['brother.clerk@example.test', 'stranger@example.test']);
    expect(gp.gpMenuCheckHealth().some((l) => l.startsWith('PROBLEM ') && l.includes('no valid address'))).toBe(true);
  });

  it('no valid address: mail queued before test mode stays queued (not sent, not deleted), logged once per run', () => {
    const gp = ward();
    // Real mail waiting in the Outbox from before test mode was turned on.
    gp.systemTab_('Outbox').append({ Id: 'mq', 'Queued at': '2026-12-01 09:00', To: 'queued@example.test', Subject: 'Old', Html: '<p>x</p>', Text: 'x', Priority: 'normal', Status: 'Queued' });
    setSetting(gp, 'test_mail_only', 'nobody');
    gp.gpTenMinute();
    gp.gpBegin_();
    gp.gpTenMinute();
    expect(gp.fakes.mail.sent).toEqual([]);
    expect(sys(gp).rowsOf('Outbox').map((m) => [m.Id, m.Status])).toEqual([['mq', 'Queued']]);
    expect(sys(gp).rowsOf('Log').filter((l) => l.What === 'test mode: Outbox kept (test_mail_only has no valid address)')).toHaveLength(2);
    // Fixed list: it goes, to the tester.
    setSetting(gp, 'test_mail_only', ME);
    gp.gpTenMinute();
    expect(sent(gp)).toEqual([{ to: ME, subject: '[TEST for queued@example.test] Old' }]);
  });

  it('mail queued during test mode is addressed to the tester, so turning test mode off never sends it to the real person', () => {
    const gp = ward(ME);
    gp.fakes.setQuota(30); // at the reserve: a normal message waits in the Outbox
    expect(gp.sendOrQueue_({ to: 'bishop.example@example.test', subject: 'Waiting for approval: Brother New', html: '<p>x</p>', text: 'x', priority: 'normal' })).toBe('queued');
    const row = sys(gp).rowsOf('Outbox')[0];
    expect(row.To).toBe(ME);
    expect(row.Subject).toBe('[TEST for bishop.example@example.test] Waiting for approval: Brother New');
    expect(sys(gp).rowsOf('Log').some((l) => l.What === 'mail queued' && l.Detail.startsWith('bishop.example@example.test | ') && l.Detail.includes('redirected to test address'))).toBe(true);
    // Test mode turned off before the next drain.
    setSetting(gp, 'test_mail_only', '');
    gp.fakes.setQuota(100);
    gp.gpTenMinute();
    expect(sent(gp)).toEqual([{ to: ME, subject: '[TEST for bishop.example@example.test] Waiting for approval: Brother New' }]);
  });

  it('no valid address: a message is dropped at queue time too, never queued', () => {
    const gp = ward('nobody');
    gp.fakes.setQuota(30);
    expect(gp.sendOrQueue_({ to: 'bishop.example@example.test', subject: 'Waiting for approval: X', html: '<p>x</p>', text: 'x', priority: 'normal' })).toBe('dropped');
    expect(sys(gp).rowsOf('Outbox')).toEqual([]);
    expect(sys(gp).rowsOf('Log').some((l) => l.What === 'test mode: not sent (test_mail_only has no valid address)')).toBe(true);
  });

  it('Check health shows a PROBLEM line while it is on, and none when blank', () => {
    const on = ward(`${ME}, ${WIFE}`);
    expect(on.gpMenuCheckHealth().filter((l) => l.includes('Test mode'))).toEqual([
      `PROBLEM Test mode: email to anyone not in test_mail_only goes to ${ME}.`,
    ]);
    const off = ward();
    expect(off.gpMenuCheckHealth().filter((l) => /Test mode|test_mail_only/.test(l))).toEqual([]);
  });

  it('MailApp.sendEmail is called in exactly one place: sendMailNow_', () => {
    const code = buildCode();
    const calls = code.match(/MailApp\.sendEmail|GmailApp\.|MailApp\.send\b/g) || [];
    expect(calls).toEqual(['MailApp.sendEmail']);
    const at = code.indexOf('MailApp.sendEmail');
    const fn = code.lastIndexOf('\nfunction ', at);
    expect(code.slice(fn, fn + 40)).toContain('function sendMailNow_(');
  });
});
