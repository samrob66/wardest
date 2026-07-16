// Escape untrusted text for safe interpolation into HTML.
export function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

// Inline markdown on ALREADY-ESCAPED text: links, bold, italic. Safe because the input was
// escaped first, so no raw HTML can be injected — we only add our own known-safe tags.
function inlineMd(escaped: string): string {
  let s = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s;
}

// Markdown-lite → safe HTML. Supports ## / ### headings, - / * bullet lists, **bold**, *italic*,
// [text](http…) links, and paragraphs. No raw HTML is ever emitted from user input (rule 7 is
// satisfied by construction — we escape first, then add only our own tags).
export function mdLite(src: string | null | undefined): string {
  if (!src) return '';
  const lines = esc(src).split('\n');
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const line of lines) {
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineMd(li[1] ?? '')}</li>`);
      continue;
    }
    closeList();
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const tag = (h[1]?.length ?? 2) <= 2 ? 'h3' : 'h4';
      out.push(`<${tag}>${inlineMd(h[2] ?? '')}</${tag}>`);
      continue;
    }
    if (line.trim() === '') continue;
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeList();
  return out.join('');
}

export const GO4_HOST = 'go4.cc';

// Full go4.cc short URL for a slug.
export function go4Url(slug: string): string {
  return `https://${GO4_HOST}/${slug}`;
}
