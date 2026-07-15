export interface Env {
  DB: D1Database;
  GO4_LINKS: KVNamespace;
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
  url: string | null;
  short_slug: string | null;
}

export interface PortalData {
  wardName: string;
  prefix: string;
  portalTitle: string | null;
  cards: PortalCard[];
  portalSlug: string | null;
}
