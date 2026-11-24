import { describe, it, expect } from 'vitest';
import { loadPortal } from './harness.mjs';

const FOOTER = 'This email comes from an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.';
const msg = (over = {}) => ({ to: 'sister.example@example.test', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi', priority: 'normal', ...over });
const outbox = (gp) => gp.fakes.system.rowsOf('Outbox');

describe('sendOrQueue_', () => {
  it('keeps the reserve for high-priority mail', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.setQuota(31);
    expect(gp.sendOrQueue_(msg())).toBe('queued');
    expect(gp.sendOrQueue_(msg({ priority: 'high' }))).toBe('sent');
    expect(gp.fakes.mail.sent).toHaveLength(1);
    expect(outbox(gp)).toHaveLength(1);
    expect(outbox(gp)[0]).toMatchObject({ To: 'sister.example@example.test', Status: 'Queued', Priority: 'normal' });
  });

  it('queues everything at quota 0', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.setQuota(0);
    expect(gp.sendOrQueue_(msg())).toBe('queued');
    expect(gp.sendOrQueue_(msg({ priority: 'high' }))).toBe('queued');
    expect(gp.fakes.mail.sent).toHaveLength(0);
  });

  it('refuses anything but one valid recipient', () => {
    const gp = loadPortal({ seed: true });
    expect(gp.sendOrQueue_(msg({ to: 'a@example.test, b@example.test' }))).toBe('refused');
    expect(gp.sendOrQueue_(msg({ to: 'nobody' }))).toBe('refused');
    expect(gp.fakes.mail.sent).toHaveLength(0);
    expect(gp.fakes.system.rowsOf('Log').some((r) => r.What === 'bad recipient')).toBe(true);
  });

  it('adds the footer and contact, the ward name and reply-to', () => {
    const gp = loadPortal({ seed: true });
    gp.sendOrQueue_(msg());
    const sent = gp.fakes.mail.sent[0];
    expect(sent.htmlBody).toContain(FOOTER);
    expect(sent.htmlBody).toContain('Contact: <a href="mailto:help@riverbend.example">help@riverbend.example</a>');
    expect(sent.body).toContain(FOOTER);
    expect(sent.body).toContain('Contact: help@riverbend.example');
    expect(sent.name).toBe('Riverbend 1st Ward (example) Service');
    expect(sent.replyTo).toBe('help@riverbend.example');
  });

  it('queues when sending throws', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.state.sendFails = 1;
    expect(gp.sendOrQueue_(msg())).toBe('queued');
    expect(outbox(gp)[0].Error).toMatch(/too many/);
  });
});

describe('drainOutbox_', () => {
  it('sends high first, then normal in queue order, and empties the Outbox', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.setQuota(0);
    gp.fakes.setNow('2026-12-01 10:00');
    gp.sendOrQueue_(msg({ subject: 'n1' }));
    gp.fakes.setNow('2026-12-01 10:01');
    gp.sendOrQueue_(msg({ subject: 'h1', priority: 'high' }));
    gp.fakes.setNow('2026-12-01 10:02');
    gp.sendOrQueue_(msg({ subject: 'n2' }));
    gp.fakes.setQuota(100);
    const r = gp.drainOutbox_();
    expect({ ...r }).toEqual({ sent: 3, left: 0 });
    expect(gp.fakes.mail.sent.map((m) => m.subject)).toEqual(['h1', 'n1', 'n2']);
    expect(outbox(gp)).toHaveLength(0);
    // The footer is added once, not again when the queue drains.
    expect(gp.fakes.mail.sent[0].body.split(FOOTER)).toHaveLength(2);
    expect(gp.fakes.system.rowsOf('Log').filter((x) => x.What === 'mail sent')).toHaveLength(3);
  });

  it('stops normal mail at the reserve and marks a failing send Failed', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.setQuota(0);
    gp.sendOrQueue_(msg({ subject: 'n1' }));
    gp.sendOrQueue_(msg({ subject: 'h1', priority: 'high' }));
    gp.fakes.setQuota(31);
    expect({ ...gp.drainOutbox_() }).toEqual({ sent: 1, left: 1 });
    expect(outbox(gp).map((m) => m.Subject)).toEqual(['n1']);
    gp.fakes.setQuota(100);
    gp.fakes.state.sendFails = 1;
    expect({ ...gp.drainOutbox_() }).toEqual({ sent: 0, left: 0 });
    expect(outbox(gp)[0]).toMatchObject({ Subject: 'n1', Status: 'Failed' });
  });
});

describe('templates', () => {
  const gp = loadPortal({ seed: true });
  const s = gp.settings_();
  const post = { 'Post id': 'p1', Title: '<script>alert(1)</script>', 'Private details': '123 Example Lane', 'Public note': 'Bring a dish' };
  const slot = { 'Slot id': 'sl1', Date: '2026-12-03', Start: '18:30', End: '', Role: 'Bring a meal' };
  const signup = { Name: 'Brother Volunteer', Email: 'brother.volunteer@example.test', Bringing: 'Soup' };

  it('escapes values in html', () => {
    const t = gp.tplSignupConfirmed_(s, post, slot, signup, 'https://x.example.test/confirm.html#t=abc');
    expect(t.html).not.toContain('<script>');
    expect(t.html).toContain('&lt;script&gt;');
    expect(t.text).toContain('https://x.example.test/confirm.html#t=abc');
  });

  it('keeps private details out of the confirmation and puts them in the reminder', () => {
    const c = gp.tplSignupConfirmed_(s, post, slot, signup, 'u');
    expect(c.html + c.text + c.subject).not.toContain('123 Example Lane');
    expect(c.text).toMatch(/reminder the day before/);
    const r = gp.tplReminder_(s, post, slot, signup, 'u');
    expect(r.html).toContain('123 Example Lane');
    expect(r.text).toContain('123 Example Lane');
    expect(gp.tplDetails_(s, post, slot).text).toContain('123 Example Lane');
  });

  it('names cancellations and shortfalls', () => {
    expect(gp.tplCancelNotice_(s, post, slot, signup, false, false).subject).toBe('Cancellation: <script>alert(1)</script>');
    expect(gp.tplCancelNotice_(s, post, slot, signup, true, false).subject).toBe("You're now short: <script>alert(1)</script>");
    expect(gp.tplCancelNotice_(s, post, slot, signup, true, true).subject).toMatch(/^Cancellation:/);
  });

  it('the request notice says nothing about the request', () => {
    const t = gp.tplRequestNotice_(s, 'Moving help', 'https://drive.example.test/drive/folders/f1');
    expect(t.text).toBe('A new Moving help request came in. Open your Requests folder: https://drive.example.test/drive/folders/f1');
    expect(t.subject).toBe('New Moving help request');
  });

  it('leader link, removed and admin alert templates', () => {
    expect(gp.tplLeaderLink_(s, { Name: 'Sister Example' }, 'https://l.example.test/leader.html#k=1').text).toContain('https://l.example.test/leader.html#k=1');
    expect(gp.tplRemoved_(s, post, slot).text).toContain('help@riverbend.example');
    expect(gp.tplAdminAlert_(s, ['one', 'two']).text).toContain('one\ntwo');
  });
});
