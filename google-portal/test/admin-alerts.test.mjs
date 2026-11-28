// 2.5.2 (decision 26): "needs attention" emails go to Settings admin_alerts_to, else the
// Executive Secretary, else the bishop; never to nobody. Approval and request notices unchanged.
import { describe, it, expect } from 'vitest';
import { loadPortal, setSetting, seedPost } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];
const alerts = (gp) => gp.fakes.mail.sent.filter((m) => m.subject.includes('needs attention')).map((m) => m.to).sort();
const EXEC = 'brother.clerk@example.test';
const ME = 'exec.home@example.test';

function ward() {
  const gp = loadPortal({ seed: true });
  gp.fakes.mail.sent.length = 0;
  return gp;
}

describe('admin alerts (decision 26)', () => {
  it('Set up adds the admin_alerts_to row, blank', () => {
    const gp = ward();
    const row = gp.fakes.spreadsheet.rowsOf('Settings').find((r) => r.Key === 'admin_alerts_to');
    expect(row).toBeTruthy();
    expect(row.Value).toBe('');
    expect(gp.GP_VERSION >= 'phase-2.5.2').toBe(true); // bumped again by later phases
  });

  it('blank: only the Executive Secretary, not the bishop', () => {
    const gp = ward();
    gp.alertAdmins_(['A problem']);
    expect(alerts(gp)).toEqual([EXEC]);
  });

  it('no Executive Secretary row: the bishop', () => {
    const gp = ward();
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', EXEC), { Calling: 'Ward Clerk' });
    gp.gpBegin_();
    gp.alertAdmins_(['A problem']);
    expect(alerts(gp)).toEqual(['bishop.example@example.test']);
  });

  it('admin_alerts_to with valid addresses is used exactly (normalized, once each), also for the daily health email', () => {
    const gp = ward();
    setSetting(gp, 'admin_alerts_to', `Exec.Home@Example.test, ${ME}; sister.example@example.test`);
    gp.alertAdmins_(['A problem']);
    expect(alerts(gp)).toEqual([ME, 'sister.example@example.test']);
    expect(gp.gpMenuCheckHealth().some((l) => l.includes('admin_alerts_to'))).toBe(false);
    gp.fakes.mail.sent.length = 0;
    gp.systemTab_('Outbox').append({ Id: 'mf', 'Queued at': '2026-11-30 10:00', To: 'x@example.test', Subject: 'S', Status: 'Failed', Priority: 'high', Error: 'boom' });
    gp.gpBegin_();
    gp.gpDaily();
    expect(alerts(gp)).toEqual([ME, 'sister.example@example.test']);
  });

  it('an invalid entry: alerts go to the Executive Secretary, and Check health names the row', () => {
    const gp = ward();
    setSetting(gp, 'admin_alerts_to', `${ME}, exec at home`);
    gp.alertAdmins_(['A problem']);
    expect(alerts(gp)).toEqual([EXEC]);
    const lines = gp.gpMenuCheckHealth().filter((l) => l.includes('admin_alerts_to'));
    expect(lines).toEqual([`PROBLEM Settings admin_alerts_to: "exec at home" is not an email address, so "needs attention" emails go to ${EXEC} instead. Fix or remove it.`]);
  });

  it('approval notices are unaffected (they follow Approvers, not admin_alerts_to)', () => {
    const gp = ward();
    setSetting(gp, 'admin_alerts_to', ME);
    seedPost(gp, {}, [{ 'Slot id': 'm1', Date: '2026-12-03', Needed: 3 }]);
    gp.fakes.mail.sent.length = 0;
    gp.apiSignup_({ publicId: 'pubmeals01', slotId: 'm1', name: 'Brother New', email: 'brother.new@example.test' });
    gp.apiConfirm_({ t: tokenFrom(gp.fakes.mail.sent[0].body, 'confirm') });
    const waiting = gp.fakes.mail.sent.filter((m) => m.subject.startsWith('Waiting for approval')).map((m) => m.to).sort();
    expect(waiting).toEqual(['bishop.example@example.test', 'brother.clerk@example.test', 'brother.counselor@example.test', 'sister.example@example.test']);
    expect(gp.fakes.mail.sent.some((m) => m.to === ME)).toBe(false);
  });
});
