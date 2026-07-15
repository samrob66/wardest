export interface Env {
  DB: D1Database;
  GO4_LINKS: KVNamespace;
}

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
