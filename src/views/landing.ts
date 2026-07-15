// wardest.com static landing. Donate link is a placeholder pending owner choice (O6).
export function renderLanding(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wardest — tools for ward leaders</title>
<meta name="description" content="Self-hosted tools for LDS ward leaders: curated solutions and shareable, printable portal pages.">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;color:#2c3a4a;min-height:100vh;
    background:linear-gradient(160deg,#eef2f8,#dbe3ef);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:3rem 1.25rem;line-height:1.6}
  h1{font-size:2.4rem;color:#1d3557;letter-spacing:.01em}
  .tag{font-size:1.05rem;color:#4a5a6d;max-width:36rem;margin:1rem auto 0}
  .divider{width:64px;height:3px;background:#c9b882;border-radius:2px;margin:1.6rem auto}
  .cta{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin-top:.5rem}
  .btn{display:inline-block;padding:.7rem 1.5rem;border-radius:24px;text-decoration:none;font-size:.95rem}
  .btn-primary{background:#1d3557;color:#fff}
  .btn-ghost{border:1.5px solid #c2cfe0;color:#4a6fa5}
  .muted{font-size:.72rem;color:#8695a8;margin-top:2.2rem}
</style>
</head>
<body>
  <h1>Wardest</h1>
  <p class="tag">Self-hosted tools for ward leaders — curated solutions, tracked and assembled
     into shareable, printable portal pages.</p>
  <div class="divider"></div>
  <div class="cta">
    <span class="btn btn-primary" aria-disabled="true">Sign in (coming soon)</span>
    <a class="btn btn-ghost" href="#">Donate</a>
  </div>
  <p class="muted">Not an official website of The Church of Jesus Christ of Latter-day Saints.</p>
</body>
</html>`;
}
