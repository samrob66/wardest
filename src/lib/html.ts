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

export const GO4_HOST = 'go4.cc';

// Full go4.cc short URL for a slug.
export function go4Url(slug: string): string {
  return `https://${GO4_HOST}/${slug}`;
}
