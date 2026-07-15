import { esc } from '../lib/html';

// Shared shell for authenticated / app pages.
export function layout(o: { title: string; body: string; userEmail?: string | null }): string {
  const nav = o.userEmail
    ? `<span class="who">${esc(o.userEmail)}</span> · <a href="/auth/logout">Sign out</a>`
    : `<a href="/auth/login">Sign in</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(o.title)} — Wardest</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;color:#2c3a4a;background:linear-gradient(160deg,#eef2f8,#dbe3ef);
    min-height:100vh;line-height:1.55}
  .nav{display:flex;justify-content:space-between;align-items:center;padding:.9rem 1.25rem;
    background:#1d3557;color:#fff}
  .nav a{color:#c9b882;text-decoration:none}.nav .brand{color:#fff;font-weight:700;letter-spacing:.02em}
  .nav .who{color:#9fb0c6}
  main{max-width:44rem;margin:0 auto;padding:2rem 1.25rem}
  h1{color:#1d3557;font-size:1.5rem;margin-bottom:.4rem}
  h2{color:#1d3557;font-size:1.1rem;margin:1.6rem 0 .6rem}
  p{margin:.5rem 0}
  a{color:#4a6fa5}
  .card{background:#fff;border:1px solid #dde3ed;border-radius:12px;padding:1rem 1.15rem;
    margin:.7rem 0;box-shadow:0 2px 10px rgba(29,53,87,.06)}
  .row{display:flex;justify-content:space-between;align-items:center;gap:1rem}
  .badge{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;background:#eaf0fb;
    color:#4a6fa5;border-radius:20px;padding:.15rem .6rem}
  .badge.super{background:#1d3557;color:#c9b882}
  label{display:block;font-size:.85rem;color:#516074;margin:.8rem 0 .25rem}
  input,select,textarea{width:100%;padding:.55rem .7rem;border:1px solid #c2cfe0;border-radius:8px;
    font-family:inherit;font-size:.95rem;background:#fff}
  input[readonly]{background:#f4f7fc;color:#6b7a8d}
  .btn{display:inline-block;margin-top:1rem;padding:.6rem 1.3rem;border:none;border-radius:22px;
    background:#1d3557;color:#fff;font-family:inherit;font-size:.9rem;cursor:pointer;text-decoration:none}
  .btn.ghost{background:none;border:1.5px solid #c2cfe0;color:#4a6fa5}
  .btn.danger{background:none;border:1.5px solid #d9a2a2;color:#b45454}
  .btn.sm{margin-top:0;padding:.4rem .9rem;font-size:.82rem}
  .muted{color:#8695a8;font-size:.85rem}
  .err{background:#fbeaea;border:1px solid #e6bcbc;color:#a33;border-radius:8px;padding:.6rem .8rem;margin:.8rem 0}
  .ok{background:#e9f5ec;border:1px solid #b8dcc2;color:#2b6b43;border-radius:8px;padding:.6rem .8rem;margin:.8rem 0}
  form.inline{display:flex;gap:.5rem;align-items:flex-end;flex-wrap:wrap}
  form.inline label{margin:0}
  code{font-family:'Courier New',monospace;color:#4a6fa5}
</style>
</head>
<body>
  <div class="nav"><a class="brand" href="/">Wardest</a><span>${nav}</span></div>
  <main>${o.body}</main>
</body>
</html>`;
}
