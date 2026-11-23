import { env } from 'cloudflare:workers';
import type { Env } from '../types';
import { esc } from '../lib/html';

// General Handbook 38.8.21.2: an online resource made to help with callings must say it is not
// an official, Church-sponsored product, and should give contact information. Every page shell
// (landing, layout, portal, print, not-found) renders siteFooter(); every email gets the same
// text from src/lib/mail.ts.
export const DISCLAIMER =
  'WardForward is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.';

// CONTACT_EMAIL ([vars] in wrangler.toml); "" hides the contact line. Read from the Worker's
// env (the `cloudflare:workers` import is the same per-deployment env every handler gets), so
// page shells need no env threaded through every view.
export function contactEmail(e: Pick<Env, 'CONTACT_EMAIL'> = env as unknown as Env): string {
  return (e.CONTACT_EMAIL ?? '').trim();
}

export function siteFooter(o: { print?: boolean } = {}): string {
  const contact = contactEmail();
  const style = o.print
    ? 'margin:1.2em auto 0;max-width:60em;font-size:.55em;color:#6b7a8d;text-align:center;line-height:1.4'
    : 'max-width:44rem;margin:2.5rem auto 1.5rem;padding:0 1.25rem;font-size:.75rem;color:#6b7a8d;text-align:center;line-height:1.5';
  const line = contact
    ? `<p>Contact: <a href="mailto:${esc(contact)}">${esc(contact)}</a></p>`
    : '';
  return `<footer class="wf-footer" style="${style}"><p>${esc(DISCLAIMER)}</p>${line}</footer>`;
}
