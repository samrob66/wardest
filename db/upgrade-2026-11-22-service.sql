-- Upgrade an EXISTING local database (made from db/schema.sql before 2026-11-22) for service
-- opportunities, requests, bulk invitations and portal sections. New databases just use
-- db/schema.sql. Nothing is deployed, so this is for local (and test) databases only:
--   npx wrangler d1 execute wardforward-db --local --file=./db/upgrade-2026-11-22-service.sql
--
-- Idempotent where SQLite allows: CREATE ... IF NOT EXISTS is safe to re-run, but SQLite has no
-- "ADD COLUMN IF NOT EXISTS", so the ALTER TABLE lines fail on a second run ("duplicate column").
-- Run it once; or delete .wrangler/state and start from db/schema.sql.
--
-- Default categories are per ward, so this script can't insert them. The app adds them (and
-- backfills vol_posts.category_id) the first time it lists a ward's categories
-- (ensureServiceCategories in src/lib/serviceCategories.ts).

-- ---------------------------------------------------------------- new columns
ALTER TABLE wards ADD COLUMN serve_short_url TEXT;
ALTER TABLE wards ADD COLUMN help_short_url TEXT;
ALTER TABLE wards ADD COLUMN serve_section_on INTEGER NOT NULL DEFAULT 1;
ALTER TABLE wards ADD COLUMN help_section_on INTEGER NOT NULL DEFAULT 1;
ALTER TABLE wards ADD COLUMN invite_daily_cap INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE workspace_requests ADD COLUMN bishop_approved INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------- categories + portal sections
CREATE TABLE IF NOT EXISTS service_categories (
  id                      TEXT PRIMARY KEY,
  ward_id                 TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  kind                    TEXT NOT NULL CHECK (kind IN ('opportunity','request')),
  slug                    TEXT NOT NULL,
  name                    TEXT NOT NULL,
  icon                    TEXT NOT NULL DEFAULT 'other',
  default_audiences       TEXT NOT NULL DEFAULT '',
  council_may_create      INTEGER NOT NULL DEFAULT 0,
  confidential            INTEGER NOT NULL DEFAULT 0,
  opportunity_category_id TEXT REFERENCES service_categories(id) ON DELETE SET NULL,
  discord_webhook_url     TEXT,
  position                INTEGER NOT NULL DEFAULT 0,
  archived                INTEGER NOT NULL DEFAULT 0,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ward_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_service_categories_ward ON service_categories(ward_id);

CREATE TABLE IF NOT EXISTS service_category_spaces (
  id          TEXT PRIMARY KEY,
  ward_id     TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  space_id    TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  UNIQUE (category_id, space_id)
);
CREATE INDEX IF NOT EXISTS idx_service_category_spaces_ward ON service_category_spaces(ward_id);
CREATE INDEX IF NOT EXISTS idx_service_category_spaces_space ON service_category_spaces(space_id);

CREATE TABLE IF NOT EXISTS portal_sections (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id   TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_portal_sections_ward ON portal_sections(ward_id);
CREATE INDEX IF NOT EXISTS idx_portal_sections_space ON portal_sections(space_id);

ALTER TABLE deliverable_spaces ADD COLUMN section_id TEXT REFERENCES portal_sections(id) ON DELETE SET NULL;
-- Nullable here; the app backfills it (see above) and always sets it on new posts.
ALTER TABLE vol_posts ADD COLUMN category_id TEXT REFERENCES service_categories(id) ON DELETE RESTRICT;
ALTER TABLE vol_posts ADD COLUMN audiences TEXT NOT NULL DEFAULT 'brothers,sisters';
CREATE INDEX IF NOT EXISTS idx_vol_posts_category ON vol_posts(category_id);

-- ---------------------------------------------------------------- child sign-ups
ALTER TABLE vol_signups ADD COLUMN child_name TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS ux_vol_signups_active;
CREATE UNIQUE INDEX IF NOT EXISTS ux_vol_signups_active ON vol_signups(role_id, volunteer_id, child_name COLLATE NOCASE)
  WHERE status IN ('waiting','confirmed');

-- ============================================================ SERVICE (spec 2026-11-22)
-- Delegates, fill warnings, member requests for help, bulk invitations. All ward-scoped;
-- permission decisions live in src/lib/serviceAccess.ts (categories, delegates, requests).

-- Coordinators a category's managers name. Counts only while they are still a ward member.
CREATE TABLE IF NOT EXISTS service_delegates (
  id               TEXT PRIMARY KEY,
  ward_id          TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id      TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (category_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_service_delegates_ward ON service_delegates(ward_id);
CREATE INDEX IF NOT EXISTS idx_service_delegates_user ON service_delegates(user_id);

-- A manager's own fill-warning choice for a category: warn me (on/off), how many hours before
-- a date starts (1-336), and others to warn (service_warn_others).
CREATE TABLE IF NOT EXISTS service_warn_prefs (
  id          TEXT PRIMARY KEY,
  ward_id     TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warn_me     INTEGER NOT NULL DEFAULT 1,
  hours       INTEGER NOT NULL DEFAULT 48 CHECK (hours BETWEEN 1 AND 336),
  UNIQUE (category_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_service_warn_prefs_ward ON service_warn_prefs(ward_id);

CREATE TABLE IF NOT EXISTS service_warn_others (
  id      TEXT PRIMARY KEY,
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  pref_id TEXT NOT NULL REFERENCES service_warn_prefs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (pref_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_service_warn_others_ward ON service_warn_others(ward_id);

-- One fill warning per post date and recipient, ever (claimed with INSERT OR IGNORE).
CREATE TABLE IF NOT EXISTS vol_warn_sent (
  id      TEXT PRIMARY KEY,
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  date_id TEXT NOT NULL REFERENCES vol_dates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (date_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_vol_warn_sent_ward ON vol_warn_sent(ward_id);

-- A member's request for help (spec section 6). Minimal by design (Handbook 38.8.32): name,
-- email, optional phone and a one-line note; moving adds in/out + preferred date; Christmas
-- adds own/other family. Visible only per serviceAccess.canSeeRequest. Deleted 30 days after
-- it's closed (done/declined); unverified ones after 7 days (hourly cron).
CREATE TABLE IF NOT EXISTS service_requests (
  id               TEXT PRIMARY KEY,
  ward_id          TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id      TEXT NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,                -- lowercased
  phone            TEXT,
  note             TEXT CHECK (note IS NULL OR length(note) <= 200),
  moving_dir       TEXT CHECK (moving_dir IN ('in','out')),
  preferred_date   TEXT,                         -- YYYY-MM-DD, ward-local
  christmas_for    TEXT CHECK (christmas_for IN ('own','other')),
  status           TEXT NOT NULL DEFAULT 'unverified'
                     CHECK (status IN ('unverified','new','in_progress','done','declined')),
  assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  private_note     TEXT CHECK (private_note IS NULL OR length(private_note) <= 200),
  verified_at      TEXT,
  closed_at        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_service_requests_ward ON service_requests(ward_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_category ON service_requests(category_id);

-- Single-use, 48-hour email verification tokens for requests (SHA-256 hash only).
CREATE TABLE IF NOT EXISTS request_tokens (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_request_tokens_ward ON request_tokens(ward_id);
CREATE INDEX IF NOT EXISTS idx_request_tokens_request ON request_tokens(request_id);

-- One paste of invitation addresses for one post: the operator's record (who, when, post,
-- counts). Kept after it finishes; its recipient rows are deleted then. post_title keeps the
-- record readable if the post is deleted.
CREATE TABLE IF NOT EXISTS invite_batches (
  id                 TEXT PRIMARY KEY,
  ward_id            TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  post_id            TEXT REFERENCES vol_posts(id) ON DELETE SET NULL,
  post_title         TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  note               TEXT CHECK (note IS NULL OR length(note) <= 500),
  total              INTEGER NOT NULL DEFAULT 0,
  invalid_count      INTEGER NOT NULL DEFAULT 0,
  suppressed_count   INTEGER NOT NULL DEFAULT 0,
  sent               INTEGER NOT NULL DEFAULT 0,
  failed             INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'sending'
                       CHECK (status IN ('preparing','sending','waiting_cap','done','cancelled')),
  cap_notified_at    TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_invite_batches_ward ON invite_batches(ward_id);
CREATE INDEX IF NOT EXISTS idx_invite_batches_status ON invite_batches(status);

-- The pasted addresses waiting to be sent. claim_id/claimed_at: an atomic claim by one pump
-- run (a claim older than 10 minutes may be retaken). Deleted when the batch ends.
CREATE TABLE IF NOT EXISTS invite_recipients (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  batch_id   TEXT NOT NULL REFERENCES invite_batches(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  claim_id   TEXT,
  claimed_at TEXT,
  sent_at    TEXT,
  failed     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (batch_id, email)
);
CREATE INDEX IF NOT EXISTS idx_invite_recipients_ward ON invite_recipients(ward_id);
CREATE INDEX IF NOT EXISTS idx_invite_recipients_batch ON invite_recipients(batch_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_invite_recipients_claim ON invite_recipients(claim_id);

-- "Stop service invitations from <ward>": SHA-256 of the normalized address, never the
-- address. Never blocks notify mail (confirmations, reminders).
CREATE TABLE IF NOT EXISTS invite_suppressions (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ward_id, email_hash)
);

-- Invitations sent per ward-local day, against wards.invite_daily_cap.
CREATE TABLE IF NOT EXISTS invite_daily_counts (
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,                         -- YYYY-MM-DD, ward-local
  sent    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ward_id, day)
);

-- Category delegations an invite carries (a manager invited a coordinator by email);
-- materialized into service_delegates when the invite is accepted.
CREATE TABLE IF NOT EXISTS invite_category_delegations (
  id          TEXT PRIMARY KEY,
  invite_id   TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  UNIQUE (invite_id, category_id)
);
