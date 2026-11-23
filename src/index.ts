import type { Env } from './types';
import { appSite } from './app';
import { landing } from './landing';
import { runVolunteerCron } from './lib/volCron';
import { CRON_LIMIT, pumpInvitations } from './lib/invitations';

// One Worker, two surfaces, routed by Host header (works in prod and via
// `curl -H "Host: wardforward.com"` in local dev). localhost defaults to the app surface so the
// portal is browsable directly at http://localhost:8787/p/m44. Short links live on zippa.run,
// a separate project; this Worker never serves or creates them.
export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];

    if (host === 'wardforward.com' || host === 'www.wardforward.com') {
      return landing.fetch(req, env, ctx);
    }
    // app.wardforward.com + localhost (dev default)
    return appSite.fetch(req, env, ctx);
  },

  // wrangler.toml [triggers]: every minute, the bulk invitation pump; hourly, volunteer
  // reminders, 48h approval nudges, lapsing, fill warnings and request purges.
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): void {
    const now = new Date(controller.scheduledTime);
    if (controller.cron === '* * * * *') {
      ctx.waitUntil(pumpInvitations(env, now, { limit: CRON_LIMIT }).then(() => undefined));
      return;
    }
    ctx.waitUntil(runVolunteerCron(env, now));
  },
} satisfies ExportedHandler<Env>;
