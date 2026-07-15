import { esc } from '../lib/html';

// Branded 404 for both an unknown go4.cc slug and an unknown/unpublished portal prefix.
export function notFoundPage(what: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Not found — Wardest</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;color:#2c3a4a;min-height:100vh;
    background:linear-gradient(160deg,#eef2f8,#dbe3ef);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:3rem 1.25rem;line-height:1.6}
  h1{font-size:1.6rem;color:#1d3557}
  p{color:#4a5a6d;max-width:28rem;margin-top:.8rem}
  code{font-family:'Courier New',monospace;color:#8fa0b5}
  a{color:#4a6fa5}
  .divider{width:56px;height:3px;background:#c9b882;border-radius:2px;margin:1.4rem auto}
</style>
</head>
<body>
  <h1>This link doesn't exist</h1>
  <div class="divider"></div>
  <p>We couldn't find <code>${esc(what)}</code>. It may have been removed or mistyped.</p>
  <p><a href="https://wardest.com">Go to Wardest</a></p>
</body>
</html>`;
}
