import type { Env } from './types';
import { go } from './go';
import { appSite } from './app';
import { landing } from './landing';

// One Worker, three surfaces, routed by Host header (works in prod and via
// `curl -H "Host: go4.cc"` in local dev). localhost defaults to the app surface so the
// portal is browsable directly at http://localhost:8787/p/m44.
export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];

    if (host === 'go4.cc' || host === 'www.go4.cc') {
      return go.fetch(req, env, ctx);
    }
    if (host === 'wardest.com' || host === 'www.wardest.com') {
      return landing.fetch(req, env, ctx);
    }
    // app.wardest.com + localhost (dev default)
    return appSite.fetch(req, env, ctx);
  },
} satisfies ExportedHandler<Env>;
