export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  // Secrets (.dev.vars locally; `wrangler secret put` in prod)
  SESSION_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;
  // Non-secret config ([vars] in wrangler.toml)
  OPERATOR_EMAILS: string; // comma-separated
  APP_URL: string; // e.g. https://app.wardest.com (or http://localhost:8787 in dev)
  // Dev-only: when "1", enables /auth/dev-login. NEVER set in production.
  DEV_LOGIN?: string;
}

// The authenticated identity carried on the Hono context.
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { user: SessionUser | null };
};

export interface PortalCard {
  title: string;
  description: string | null;
  type: string;
  destination: string; // where the item lives: its URL, or the /f/<id> serving URL for a file
  short_url: string | null; // pasted short link (e.g. zippa.run/m44Bulletin), if any
}

export interface PortalData {
  wardName: string;
  prefix: string;
  portalTitle: string | null;
  cards: PortalCard[];
  portalUrl: string; // this portal's own address
  shareUrl: string | null; // pasted short link pointing at this portal, if any
}
