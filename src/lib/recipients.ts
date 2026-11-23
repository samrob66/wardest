// Turns a pasted "send to" list into addresses (spec §7). Takes a string and returns plain
// addresses, so a ward roster could feed the same string[] later.
//  - Separators: commas, semicolons, spaces/tabs and new lines.
//  - `Name <email>` (and `"Smith, Ann" <email>`) stays together: only the address inside <> is kept.
//  - Lowercased, checked with the same address rule as src/lib/mail.ts, deduplicated.
import { isValidAddress } from './mail';

// The "very high number" per paste (spec §7: no cap except one that never interrupts a ward).
export const MAX_RECIPIENTS = 10_000;

export function parseRecipients(raw: string): { valid: string[]; invalid: string[]; duplicates: number } {
  const text = String(raw ?? '')
    // "Display Name" <addr> / Display Name <addr>  ->  addr
    .replace(/(?:"[^"]*"|[^"<>,;\r\n])*<([^<>\r\n]*)>/g, (_m, inner: string) => ` ${inner.trim() || '<>'} `);
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  const seenBad = new Set<string>();
  let duplicates = 0;
  for (const token of text.split(/[,;\s]+/)) {
    const t = token.trim().replace(/^"+|"+$/g, '');
    if (!t) continue;
    const e = t.toLowerCase();
    if (e.length <= 254 && isValidAddress(e)) {
      if (seen.has(e)) duplicates++;
      else {
        seen.add(e);
        valid.push(e);
      }
    } else if (!seenBad.has(t)) {
      seenBad.add(t);
      invalid.push(t);
    }
  }
  return { valid, invalid, duplicates };
}
