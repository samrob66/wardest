// The only code that sends email. Everything goes through Cloudflare Email Service's Workers
// binding (`env.EMAIL`, a `send_email` binding in wrangler.toml), one recipient per message.
//
// - Streams: each kind of mail has its own From (STREAM_FROM). The binding is restricted to
//   exactly these addresses (allowed_sender_addresses).
// - One recipient per message, always: a `to` holding several addresses is refused, never sent
//   as a shared list. There is no CC/BCC.
// - Headers: only List-Unsubscribe, List-Unsubscribe-Post and X-* are passed through; CR/LF in
//   a header name or value or in replyTo refuses the message (header injection). CR/LF in a
//   subject is collapsed to one space.
// - Never throws. A transient error (rate limit, service error, failed delivery) is retried
//   twice with a short backoff; anything else is logged with `[mail]` and the caller's tag and
//   reported in the result.
// - Log mode: with EMAIL_DELIVERY=log, or with no binding while APP_URL is local
//   (localhost / 127.0.0.1), each message is printed (recipient, subject, every link, and the
//   text) instead of sent, so a local tester can click the links. No binding anywhere else is a
//   misconfiguration: the message is refused (`no_binding`) and never printed, since it can
//   hold sign-in links.
// - Every message ends with the independence disclaimer (General Handbook 38.8.21.2) and, when
//   CONTACT_EMAIL is set, a contact line, in both the html and the text part.
import type { Env } from '../types';
import { esc } from './html';
import { DISCLAIMER, contactEmail } from '../views/footer';

export type MailStream = 'notify' | 'invitations';

export const STREAM_FROM: Record<MailStream, { email: string; name: string }> = {
  notify: { email: 'no-reply@send.wardforward.com', name: 'WardForward' },
  invitations: { email: 'invite@send.wardforward.com', name: 'WardForward invitations' },
};

export interface MailMessage {
  stream: MailStream;
  to: string; // exactly one address
  subject: string;
  html: string;
  text?: string; // derived from html when absent
  headers?: Record<string, string>; // allow-listed only
  replyTo?: string;
  tag?: string; // for logs, e.g. "ward=… ref=… kind=…"
}

export interface MailResult {
  to: string;
  ok: boolean;
  messageId?: string;
  error?: string;
  logged?: boolean;
}

// Backoff before retry n (n = 1, 2) is baseMs * 2^(n-1): 250 + 500 ms by default, well under
// two seconds in all. Every wait goes through `sleep`, so tests can skip it (or shrink baseMs).
export const mailRetry: { baseMs: number; retries: number; sleep: (ms: number) => Promise<void> } = {
  baseMs: 250,
  retries: 2,
  sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
};

const RETRYABLE = new Set(['E_RATE_LIMIT_EXCEEDED', 'E_INTERNAL_SERVER_ERROR', 'E_DELIVERY_FAILED']);
const ADDRESS = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const CRLF = /[\r\n]/;

// The address rule every message's recipient must pass (also used to parse pasted lists).
export function isValidAddress(s: string): boolean {
  return ADDRESS.test(s);
}

// APP_URL points at this machine (wrangler dev), so printing a message is safe.
function isLocalAppUrl(appUrl: string | undefined): boolean {
  try {
    const h = new URL(appUrl ?? '').hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
  } catch {
    return false;
  }
}

function allowedHeader(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'list-unsubscribe' || n === 'list-unsubscribe-post' || n.startsWith('x-');
}

export function htmlToText(html: string): string {
  return html
    .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_all, href: string, label: string) => {
      const l = label.replace(/<[^>]+>/g, '').trim();
      return l && l !== href ? `${l} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d|div|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^[ \t]+/gm, '') // template indentation from the HTML source
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// Appends the disclaimer (and contact line) to both parts of one message.
function withFooter(env: Env, html: string, text: string): { html: string; text: string } {
  const contact = contactEmail(env);
  const htmlFoot =
    `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 8px">` +
    `<p style="color:#888;font-size:12px;line-height:1.4">${esc(DISCLAIMER)}` +
    (contact ? `<br>Contact: <a href="mailto:${esc(contact)}">${esc(contact)}</a>` : '') +
    `</p>`;
  const textFoot = `\n\n--\n${DISCLAIMER}` + (contact ? `\nContact: ${contact}` : '');
  return { html: html + htmlFoot, text: text + textFoot };
}

function logMessage(m: MailMessage, to: string, text: string): void {
  const hrefs = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => (x[1] ?? '').replace(/&amp;/g, '&'));
  console.log(
    `[dev email] stream=${m.stream}${m.tag ? ' ' + m.tag : ''}\n  to: ${to}\n  subject: ${m.subject}\n` +
      hrefs.map((h) => `  link: ${h}`).join('\n') +
      `\n  ---\n  ${text.split('\n').join('\n  ')}\n  ---`,
  );
}

function refuse(m: MailMessage, to: string, error: string): MailResult {
  console.error(`[mail] refused ${error} stream=${m.stream} ${m.tag ?? ''}`.trim());
  return { to, ok: false, error };
}

// Checks one message; returns the refusal reason, or null when it may go.
function check(m: MailMessage, to: string): string | null {
  if (!to || !ADDRESS.test(to)) return 'invalid_recipient';
  if (m.replyTo !== undefined && CRLF.test(String(m.replyTo))) return 'invalid_header';
  for (const [k, v] of Object.entries(m.headers ?? {})) {
    if (CRLF.test(k) || CRLF.test(v)) return 'invalid_header';
    if (!allowedHeader(k)) return 'header_not_allowed';
  }
  if (!Object.hasOwn(STREAM_FROM, m.stream)) return 'invalid_stream';
  return null;
}

function errorCode(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code) return code;
  return (e as Error | null)?.message || String(e);
}

export async function sendMail(env: Env, m: MailMessage): Promise<MailResult> {
  let to = '';
  try {
    to = typeof m.to === 'string' ? m.to.trim().toLowerCase() : '';
    const refused = check(m, to);
    if (refused) return refuse(m, to, refused);
    const subject = String(m.subject ?? '').replace(/[\r\n]+/g, ' ');
    const body = withFooter(env, m.html, m.text ?? htmlToText(m.html));
    const text = body.text;

    const binding = env.EMAIL;
    if (env.EMAIL_DELIVERY === 'log' || (!binding && isLocalAppUrl(env.APP_URL))) {
      logMessage({ ...m, subject, html: body.html }, to, text);
      return { to, ok: true, logged: true };
    }
    if (!binding) {
      console.error(`[mail] EMAIL binding missing; not sent stream=${m.stream} ${m.tag ?? ''}`.trim());
      return { to, ok: false, error: 'no_binding' };
    }

    const payload: EmailMessageBuilder = {
      to,
      from: STREAM_FROM[m.stream],
      subject,
      html: body.html,
      text,
    };
    if (m.headers && Object.keys(m.headers).length) payload.headers = { ...m.headers };
    if (m.replyTo) payload.replyTo = m.replyTo.trim();

    for (let attempt = 0; ; attempt++) {
      try {
        const res = await binding.send(payload);
        return { to, ok: true, messageId: res?.messageId };
      } catch (e) {
        const code = errorCode(e);
        if (RETRYABLE.has(code) && attempt < mailRetry.retries) {
          await mailRetry.sleep(mailRetry.baseMs * 2 ** attempt);
          continue;
        }
        console.error(`[mail] send failed ${code} stream=${m.stream} ${m.tag ?? ''}`.trim());
        return { to, ok: false, error: code };
      }
    }
  } catch (e) {
    // Belt and braces: nothing above should throw, but a caller must never see an exception.
    console.error(`[mail] unexpected ${errorCode(e)} ${m.tag ?? ''}`.trim());
    return { to, ok: false, error: errorCode(e) };
  }
}

// Sends each message on its own (one recipient each), at most `concurrency` at a time. A
// failure never stops the others. Results come back in input order. Never throws.
export async function sendMailBatch(
  env: Env,
  ms: MailMessage[],
  opts: { concurrency?: number } = {},
): Promise<MailResult[]> {
  const c = opts.concurrency;
  const limit = typeof c === 'number' && Number.isFinite(c) ? Math.max(1, Math.floor(c)) : 5;
  const results: MailResult[] = new Array(ms.length);
  let next = 0;
  const worker = async () => {
    while (next < ms.length) {
      const i = next++;
      results[i] = await sendMail(env, ms[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, ms.length) }, worker));
  return results;
}
