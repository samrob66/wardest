import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env, sentEmails, mockEmail } from './helpers';
import { sendMail, sendMailBatch, htmlToText, mailRetry, STREAM_FROM, type MailMessage } from '../src/lib/mail';

function msg(over: Partial<MailMessage> = {}): MailMessage {
  return {
    stream: 'notify',
    to: 'a@x.com',
    subject: 'Hello',
    html: '<p>Hi there. <a href="http://localhost:8787/vol/access/abc?x=1&amp;y=2">Open</a></p>',
    tag: 'ward=w_1 ref=r_1 kind=test',
    ...over,
  };
}

function codeError(code: string): Error {
  return Object.assign(new Error(code.toLowerCase()), { code });
}

let savedBase = 0;
beforeEach(() => {
  savedBase = mailRetry.baseMs;
  mailRetry.baseMs = 1;
});
afterEach(() => {
  mailRetry.baseMs = savedBase;
  vi.restoreAllMocks();
});

describe('sendMail: log mode', () => {
  it('log mode prints and never calls the binding', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const r = await sendMail({ ...env, EMAIL_DELIVERY: 'log' }, msg());
    expect(r).toMatchObject({ ok: true, logged: true, to: 'a@x.com' });
    expect(sentEmails()).toHaveLength(0);
    const out = log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(out).toContain('[dev email]');
    expect(out).toContain('stream=notify');
    expect(out).toContain('to: a@x.com');
    expect(out).toContain('subject: Hello');
    expect(out).toContain('link: http://localhost:8787/vol/access/abc?x=1&y=2');
  });

  it('binding absent -> log mode', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const r = await sendMail({ ...env, EMAIL: undefined }, msg());
    expect(r).toMatchObject({ ok: true, logged: true });
    expect(sentEmails()).toHaveLength(0);
    expect(log.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('to: a@x.com');
  });
});

describe('sendMail: send mode', () => {
  it('notify stream sends one message from no-reply', async () => {
    const r = await sendMail(env, msg({ to: '  A@X.com ' }));
    expect(r.ok).toBe(true);
    expect(r.messageId).toBeTruthy();
    const sent = sentEmails();
    expect(sent).toHaveLength(1);
    const e = sent[0]!;
    expect(e.from).toEqual({ email: 'no-reply@send.wardforward.com', name: 'WardForward' });
    expect(STREAM_FROM.notify).toEqual(e.from);
    expect(e.to).toBe('a@x.com');
    expect(typeof e.to).toBe('string');
    expect(e.subject).toBe('Hello');
    expect(e.html).toContain('<a href=');
    expect(e.text).toBeTruthy();
    expect(e.text).toContain('http://localhost:8787/vol/access/abc?x=1&y=2');
    expect(e.headers).toBeUndefined();
  });

  it('invitations stream uses invite@ with List-Unsubscribe headers passed through', async () => {
    const headers = {
      'List-Unsubscribe': '<https://app.wardforward.com/u/abc>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-WardForward-Batch': 'b_1',
    };
    const r = await sendMail(env, msg({ stream: 'invitations', headers, replyTo: 'leader@y.org', text: 'plain' }));
    expect(r.ok).toBe(true);
    const e = sentEmails()[0]!;
    expect(e.from).toEqual({ email: 'invite@send.wardforward.com', name: 'WardForward invitations' });
    expect(e.headers).toEqual(headers);
    expect(e.replyTo).toBe('leader@y.org');
    expect(e.text).toBe('plain');
  });

  it('refuses a multi-address to', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const to of ['a@x.com, b@y.com', 'a@x.com;b@y.com', 'a@x.com b@y.com', 'not-an-address', '']) {
      const r = await sendMail(env, msg({ to }));
      expect(r.ok, to).toBe(false);
      expect(r.error, to).toBe('invalid_recipient');
    }
    expect(sentEmails()).toHaveLength(0);
    expect(err).toHaveBeenCalled();
  });

  it('refuses CRLF in subject or header value', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = await sendMail(env, msg({ subject: 'Hi\r\nBcc: evil@z.com' }));
    const b = await sendMail(env, msg({ headers: { 'X-Ref': 'ok\nBcc: evil@z.com' } }));
    const c = await sendMail(env, msg({ headers: { 'X-Ref\r\nBcc': 'v' } }));
    const d = await sendMail(env, msg({ replyTo: 'a@x.com\r\nBcc: evil@z.com' }));
    for (const r of [a, b, c, d]) expect(r).toMatchObject({ ok: false, error: 'invalid_header' });
    expect(sentEmails()).toHaveLength(0);
  });

  it('refuses a non-allow-listed header', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const name of ['Bcc', 'From', 'To', 'Subject', 'Reply-To', 'Message-ID']) {
      const r = await sendMail(env, msg({ headers: { [name]: 'x@y.com' } }));
      expect(r, name).toMatchObject({ ok: false, error: 'header_not_allowed' });
    }
    expect(sentEmails()).toHaveLength(0);
  });

  it('retries a rate-limited send then succeeds', async () => {
    let n = 0;
    mockEmail(() => {
      if (++n === 1) throw codeError('E_RATE_LIMIT_EXCEEDED');
    });
    const r = await sendMail(env, msg());
    expect(r.ok).toBe(true);
    expect(sentEmails()).toHaveLength(2);
  });

  it('gives up after two retries of a transient error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEmail(() => {
      throw codeError('E_INTERNAL_SERVER_ERROR');
    });
    const r = await sendMail(env, msg());
    expect(r).toMatchObject({ ok: false, error: 'E_INTERNAL_SERVER_ERROR' });
    expect(sentEmails()).toHaveLength(3);
    expect(err.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('[mail]');
  });

  it('does not retry a suppressed recipient', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEmail(() => {
      throw codeError('E_RECIPIENT_SUPPRESSED');
    });
    const r = await sendMail(env, msg());
    expect(r).toMatchObject({ ok: false, error: 'E_RECIPIENT_SUPPRESSED', to: 'a@x.com' });
    expect(sentEmails()).toHaveLength(1);
    const lines = err.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(lines).toContain('[mail]');
    expect(lines).toContain('ward=w_1 ref=r_1 kind=test');
  });

  it('an error without a code reports its message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEmail(() => {
      throw new TypeError('bad argument');
    });
    const r = await sendMail(env, msg());
    expect(r).toMatchObject({ ok: false, error: 'bad argument' });
  });
});

describe('sendMailBatch', () => {
  it('batch: one failure, the rest still go', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEmail((e) => {
      if (e.to === 'p3@x.com') throw codeError('E_RECIPIENT_SUPPRESSED');
    });
    const ms = [1, 2, 3, 4, 5].map((i) => msg({ stream: 'invitations', to: `p${i}@x.com` }));
    const rs = await sendMailBatch(env, ms, { concurrency: 2 });
    expect(rs.map((r) => r.to)).toEqual(['p1@x.com', 'p2@x.com', 'p3@x.com', 'p4@x.com', 'p5@x.com']);
    expect(rs.map((r) => r.ok)).toEqual([true, true, false, true, true]);
    expect(rs[2]!.error).toBe('E_RECIPIENT_SUPPRESSED');
    // every recipient got their own message; nobody saw anyone else's address
    const sent = sentEmails();
    expect(sent).toHaveLength(5);
    for (const e of sent) expect(typeof e.to).toBe('string');
  });

  it('a refused message in a batch does not stop the others', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const rs = await sendMailBatch(env, [msg({ to: 'a@x.com, b@y.com' }), msg({ to: 'c@z.com' })]);
    expect(rs.map((r) => r.ok)).toEqual([false, true]);
    expect(sentEmails().map((e) => e.to)).toEqual(['c@z.com']);
  });

  it('never runs more than `concurrency` sends at once', async () => {
    let live = 0;
    let peak = 0;
    mockEmail(async () => {
      live++;
      peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 5));
      live--;
    });
    const ms = Array.from({ length: 12 }, (_, i) => msg({ to: `q${i}@x.com` }));
    const rs = await sendMailBatch(env, ms);
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });
});

describe('htmlToText', () => {
  it('keeps link targets, decodes entities and breaks lines', () => {
    const t = htmlToText('<p>Hello &amp; welcome</p><p><a href="https://a.b/c?x=1&amp;y=2">Go</a><br>Bye &lt;3 &#39;x&#39;</p>');
    expect(t).toBe("Hello & welcome\nGo (https://a.b/c?x=1&y=2)\nBye <3 'x'");
  });
});
