// Turns a pasted "send to" list into addresses (spec §7). Takes a string and returns plain
// addresses, so a ward roster could feed the same string[] later.
//  - Separators: commas, semicolons, spaces/tabs and new lines.
//  - `Name <email>` (and `"Smith, Ann" <email>`) stays together: only the address inside <> is
//    kept. The display name is the run of words just before the <…>; a word containing "@" is
//    never part of a display name (it is an address in its own right), and a comma, semicolon
//    or new line ends a display name. Words that don't belong to a <…> and aren't addresses are
//    reported as invalid, never silently dropped.
//  - Lowercased, checked with the same address rule as src/lib/mail.ts, deduplicated.
import { isValidAddress } from './mail';

// The "very high number" per paste (spec §7: no cap except one that never interrupts a ward).
export const MAX_RECIPIENTS = 10_000;

// Quoted strings, <…> groups, hard separators (, ; new line), and words (anything else up to
// whitespace). Other whitespace is skipped.
const TOKEN = /"[^"]*"|<[^<>]*>|[,;\n]|[^\s,;<>"]+/g;

export function parseRecipients(raw: string): { valid: string[]; invalid: string[]; duplicates: number } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  const seenBad = new Set<string>();
  let duplicates = 0;
  let pendingName: string[] = []; // words that may be the display name of a following <…>

  const bad = (t: string) => {
    if (!t || seenBad.has(t)) return;
    seenBad.add(t);
    invalid.push(t);
  };
  const flushName = () => {
    for (const w of pendingName) bad(w.replace(/^"+|"+$/g, ''));
    pendingName = [];
  };
  const address = (t: string) => {
    const e = t.trim().toLowerCase();
    if (e && e.length <= 254 && isValidAddress(e)) {
      if (seen.has(e)) duplicates++;
      else {
        seen.add(e);
        valid.push(e);
      }
    } else bad(t.trim() || '<>');
  };

  for (const m of String(raw ?? '').replace(/\r/g, '').matchAll(TOKEN)) {
    const tok = m[0];
    if (tok === ',' || tok === ';' || tok === '\n') {
      flushName();
    } else if (tok.startsWith('<')) {
      pendingName = []; // the display name belongs to this address
      address(tok.slice(1, -1));
    } else if (tok.includes('@')) {
      flushName(); // an address is never part of a display name
      address(tok.replace(/^"+|"+$/g, ''));
    } else {
      pendingName.push(tok);
    }
  }
  flushName();
  return { valid, invalid, duplicates };
}
