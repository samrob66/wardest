import type { Env } from './types';
import { appSite } from './app';
import { landing } from './landing';
import { runVolunteerCron } from './lib/volCron';

// One Worker, two surfaces, routed by Host header (works in prod and via
// `curl -H "Host: wardest.com"` in local dev). localhost defaults to the app surface so the
// portal is browsable directly at http://localhost:8787/p/m44. Short links live on zippa.run,
// a separate project; this Worker never serves or creates them.
export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];

    if (host === 'wardest.com' || host === 'www.wardest.com') {
      return landing.fetch(req, env, ctx);
    }
    // app.wardest.com + localhost (dev default)
    return appSite.fetch(req, env, ctx);
  },

  // Hourly (wrangler.toml [triggers]): volunteer reminders, 48h approval nudges, lapsing.
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(runVolunteerCron(env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
