import { esc } from '../lib/html';
import { siteFooter } from './footer';

// Small centred page for "not found" and "something went wrong". `heading` and `body` are
// trusted markup (our own constants); escape anything user-supplied before passing it in.
function messagePage(title: string, heading: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} — WardForward</title>
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
  <h1>${heading}</h1>
  <div class="divider"></div>
  ${body}
  <p><a href="https://wardforward.com">Go to WardForward</a></p>
  ${siteFooter()}
</body>
</html>`;
}

// Branded 404 for an unknown/unpublished portal prefix, file, space, or path.
export function notFoundPage(what: string): string {
  return messagePage(
    'Not found',
    "This link doesn't exist",
    `<p>We couldn't find <code>${esc(what)}</code>. It may have been removed or mistyped.</p>`,
  );
}

// Branded 500 for an uncaught error. Never includes the error itself.
export function errorPage(): string {
  return messagePage(
    'Something went wrong',
    'Something went wrong',
    '<p>Sorry, that didn’t work. Please try again in a moment.</p>',
  );
}
