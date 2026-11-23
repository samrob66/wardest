-- WardForward — Cloudflare D1 (SQLite) schema
-- See SCHEMA.md for rationale, ERD, and the audit trail of resolved design questions.
--
-- Conventions:
--   * IDs are app-generated TEXT (ULID/UUID). No AUTOINCREMENT.
--   * Timestamps are TEXT ISO-8601 (UTC) via datetime('now').
--   * Booleans are INTEGER 0/1.
--   * Enums are TEXT with CHECK constraints.
--   * Every ward-scoped table carries ward_id (row-level tenancy). Global tables
--     (users, solutions) do not.
--   * D1 ENFORCES foreign keys by default (equivalent to PRAGMA foreign_keys = on;
--     cannot be disabled, only deferred per-transaction via PRAGMA defer_foreign_keys).
--     Tables below are declared in dependency order.

-- ============================================================ GLOBAL (not tenant-scoped)

-- People, identified by Google. A user may belong to multiple wards.
-- App note: on each login, refresh email/name from Google claims keyed on google_sub
-- (emails can change; google_sub is the stable identity).
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  google_sub    TEXT NOT NULL UNIQUE,          -- stable Google account id
  email         TEXT NOT NULL UNIQUE,          -- lowercased
  name          TEXT,
  avatar_url    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- The curated catalog + the submission pipeline (same table, differentiated by status).
CREATE TABLE solutions (
  id                    TEXT PRIMARY KEY,
  category              TEXT NOT NULL CHECK (category IN
                          ('exec_secretary','ward_clerk','bishopric','org_presidencies',
                           'activities_committee','ward_mission')),
  title                 TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  summary               TEXT,
  body                  TEXT,                   -- markdown how-to
  video_url             TEXT,
  template_type         TEXT CHECK (template_type IN
                          ('google_copy','file','ai_prompt','link','other')),
  template_value        TEXT,                   -- e.g. a Google /copy URL, or R2 key
  -- 'ward_singleton' = one implementation per ward (implementations.space_id NULL);
  -- 'per_space' = each org space implements its own (implementations.space_id set).
  -- App-enforced; see partial unique indexes on implementations.
  implementation_scope  TEXT NOT NULL DEFAULT 'ward_singleton'
                          CHECK (implementation_scope IN ('ward_singleton','per_space')),
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN
                          ('draft','submitted','published','rejected')),
  submitted_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_by_ward_id  TEXT,                   -- soft ref (ward may be gone); see SCHEMA.md
  position              INTEGER NOT NULL DEFAULT 0,
  -- Executive Secretary "Start here" order (1-99); NULL = not in the track. App-validated.
  setup_step            INTEGER,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_solutions_category_status ON solutions(category, status);

-- ============================================================ TENANT: WARDS

CREATE TABLE wards (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  unit_number       TEXT NOT NULL UNIQUE,       -- dedupe key
  prefix            TEXT NOT NULL UNIQUE,        -- lowercased; public portal path /p/<prefix> + the ward's zippa.run prefix, e.g. 'm44'
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','suspended')),
  timezone          TEXT NOT NULL DEFAULT 'America/Denver',  -- IANA zone; volunteer cutoffs/reminders
  -- Portal service sections (superadmin settings): pasted short links for the public serve and
  -- help pages (http(s) only; QR codes use them when set) and whether each section shows.
  serve_short_url   TEXT,
  help_short_url    TEXT,
  serve_section_on  INTEGER NOT NULL DEFAULT 1,
  help_section_on   INTEGER NOT NULL DEFAULT 1,
  -- Safety ceiling on bulk invitation emails per ward-local day (operator adjusts).
  invite_daily_cap  INTEGER NOT NULL DEFAULT 5000,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Requests to create a NEW ward workspace (kind='create', reviewed by the operator) or to
-- JOIN an existing one after unit-number dedupe (kind='join', reviewed by that ward's
-- superadmins). ward_name is required for 'create' (app-enforced); target_ward_id for 'join'.
CREATE TABLE workspace_requests (
  id                 TEXT PRIMARY KEY,
  kind               TEXT NOT NULL DEFAULT 'create' CHECK (kind IN ('create','join')),
  ward_name          TEXT,
  unit_number        TEXT NOT NULL,
  target_ward_id     TEXT REFERENCES wards(id) ON DELETE CASCADE,   -- kind='join'
  requester_email    TEXT NOT NULL,
  requester_name     TEXT,
  requester_calling  TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','denied')),
  reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at        TEXT,
  created_ward_id    TEXT REFERENCES wards(id) ON DELETE SET NULL,  -- kind='create', on approval
  note               TEXT,
  bishop_approved    INTEGER NOT NULL DEFAULT 0,   -- "Our bishop has approved using WardForward" (Handbook 38.8.21.2)
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User <-> ward, with ward-level role. Multiple superadmins allowed.
CREATE TABLE ward_memberships (
  id            TEXT PRIMARY KEY,
  ward_id       TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('superadmin','member')),
  calling_title TEXT,                            -- free text from the callings chart
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ward_id, user_id)
);
CREATE INDEX idx_ward_memberships_user ON ward_memberships(user_id);

-- ============================================================ SPACES & PORTALS
-- A space is an audience (Public, Bishopric, Ward Council, per-org). It is the visibility
-- primitive for the whole app and the unit a portal renders (1 space : 1 portal).
-- kind='public' identifies the ward's public portal (no login, noindex).
-- share_url: an optional short link (e.g. zippa.run/m44Links) that a leader made on zippa.run,
-- pointing at this portal, and pasted in. It's what the portal's master QR encodes; when it's
-- unset, the QR encodes the portal's own address. WardForward never creates short links itself.
CREATE TABLE spaces (
  id                    TEXT PRIMARY KEY,
  ward_id               TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL CHECK (kind IN
                          ('public','bishopric','ward_council','org')),
  name                  TEXT NOT NULL,           -- e.g. "Elders Quorum"
  slug                  TEXT NOT NULL,           -- unique within ward
  archived              INTEGER NOT NULL DEFAULT 0,  -- "hide" a default space a ward doesn't use
  portal_title          TEXT,
  portal_published      INTEGER NOT NULL DEFAULT 0,
  share_url             TEXT,                    -- pasted short link to this portal (http/https)
  position              INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ward_id, slug)
);
CREATE INDEX idx_spaces_ward ON spaces(ward_id);

-- User <-> space, with space-level role. Multiple owners allowed. ward_id denormalized
-- for straightforward tenancy filtering.
CREATE TABLE space_memberships (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id   TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (space_id, user_id)
);
CREATE INDEX idx_space_memberships_user ON space_memberships(user_id);
CREATE INDEX idx_space_memberships_space ON space_memberships(space_id);

-- Whole-space sharing: members of shared_with_space_id get READ-ONLY access to space_id's
-- portal and its contents (blocks, tasks, published deliverables, and implementations whose
-- implementing space is space_id). E.g. Activities Committee shares its space with Ward
-- Council and/or Bishopric. Managed by the space's owners. NOT transitive (a share of a
-- share grants nothing). Deleting a row only narrows visibility, so CASCADE is safe.
CREATE TABLE space_shares (
  id                   TEXT PRIMARY KEY,
  ward_id              TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id             TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  shared_with_space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (space_id, shared_with_space_id),
  CHECK (space_id <> shared_with_space_id)
);
CREATE INDEX idx_space_shares_viewer ON space_shares(shared_with_space_id);

-- Rich-text blocks on a portal (notices, evergreen notes). Task list renders separately.
CREATE TABLE portal_blocks (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id   TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'richtext' CHECK (kind IN ('richtext')),
  title      TEXT,
  body       TEXT,                                -- sanitized HTML / markdown
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_portal_blocks_space ON portal_blocks(space_id);

-- Lightweight task list per space (spaces:portals are 1:1, so this is the portal task list).
-- Self-archives (archived=1) but stays queryable. Assignee optional.
CREATE TABLE tasks (
  id               TEXT PRIMARY KEY,
  ward_id          TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id         TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  text             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  archived         INTEGER NOT NULL DEFAULT 0,
  assignee_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  position         INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  completed_at     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_space_archived ON tasks(space_id, archived);

-- ============================================================ CATALOG TRACKING & DELIVERABLES

-- A ward's record of working a solution. Ward-scoped; space_id is NULL for ward-level
-- ('ward_singleton') solutions and set to the implementing org space for 'per_space' ones.
--
-- Visibility: 'ward' = every ward member sees this tracker entry. 'restricted' (fail-closed
-- default) = visible to the entry's owner, the implementing space's members (incl. read-only
-- viewers via space_shares), and members of any space granted in implementation_visibility.
-- Grants are multi-valued: e.g. an Activities Committee entry can be granted to both Ward
-- Council and Bishopric.
-- App defaults: per_space -> 'restricted' (implementing space sees it implicitly);
-- ward_singleton -> 'ward'; owner can change either.
CREATE TABLE implementations (
  id                  TEXT PRIMARY KEY,
  ward_id             TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id            TEXT REFERENCES spaces(id) ON DELETE CASCADE,
  solution_id         TEXT NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  visibility          TEXT NOT NULL DEFAULT 'restricted'
                        CHECK (visibility IN ('ward','restricted')),
  status              TEXT NOT NULL DEFAULT 'not_started'
                        CHECK (status IN ('not_started','in_progress','implemented')),
  owner_user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes               TEXT,
  implemented_at      TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_implementations_ward ON implementations(ward_id);
-- One ward-level implementation per (ward, solution); one org-level per (solution, space).
CREATE UNIQUE INDEX ux_impl_ward  ON implementations(ward_id, solution_id) WHERE space_id IS NULL;
CREATE UNIQUE INDEX ux_impl_space ON implementations(solution_id, space_id) WHERE space_id IS NOT NULL;

-- Additional audiences for a 'restricted' implementation (multi-valued grants). Grants apply
-- to the granted space's DIRECT members only (space_shares do not chain through grants).
-- Deleting a grant only narrows visibility, so CASCADE is safe.
CREATE TABLE implementation_visibility (
  id                TEXT PRIMARY KEY,
  ward_id           TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  implementation_id TEXT NOT NULL REFERENCES implementations(id) ON DELETE CASCADE,
  space_id          TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (implementation_id, space_id)
);
CREATE INDEX idx_impl_visibility_space ON implementation_visibility(space_id);

-- The output artifact. Tied to an implementation, OR standalone ("Add link/URL/QR").
-- One implementation may produce several deliverables (e.g. URL + printable PDF).
-- QR is DERIVED at render time (not stored): it encodes short_url when set, else the
-- destination (url, or the /f/<id> serving URL for a file/image).
-- short_url is a pasted short link (e.g. zippa.run/m44Bulletin); WardForward never creates them.
-- created_by is the ownership boundary (only the creator edits/deletes; app-enforced).
CREATE TABLE deliverables (
  id                 TEXT PRIMARY KEY,
  ward_id            TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  implementation_id  TEXT REFERENCES implementations(id) ON DELETE SET NULL,  -- NULL = ad-hoc
  title              TEXT NOT NULL,
  description        TEXT,
  type               TEXT NOT NULL CHECK (type IN ('url','file','image')),
  url                TEXT,                        -- for type='url'
  file_key           TEXT,                        -- R2 object key for file/image
  short_url          TEXT,                        -- optional pasted short link (http/https)
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_deliverables_ward ON deliverables(ward_id);

-- Named sections on a space's portal (e.g. "Ward Links", "Interviews" on the public portal).
-- Published deliverables with no section fall under the portal's default "Links" section.
CREATE TABLE portal_sections (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id   TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_portal_sections_ward ON portal_sections(ward_id);
CREATE INDEX idx_portal_sections_space ON portal_sections(space_id);

-- Publishing layer: which spaces a deliverable appears in, and whether it shows on that
-- space's portal page + its order. A deliverable can be published to multiple spaces.
-- section_id: the portal section it shows under (NULL = the default section).
CREATE TABLE deliverable_spaces (
  id                TEXT PRIMARY KEY,
  ward_id           TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  deliverable_id    TEXT NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  space_id          TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  include_in_portal INTEGER NOT NULL DEFAULT 1,
  position          INTEGER NOT NULL DEFAULT 0,
  section_id        TEXT REFERENCES portal_sections(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (deliverable_id, space_id)
);
CREATE INDEX idx_deliverable_spaces_space ON deliverable_spaces(space_id);

-- ============================================================ INVITES (callings chart)
-- Superadmin enters people by email; on Google login the invite materializes into
-- ward_memberships + space_memberships.
-- App note: UNIQUE(ward_id, email) means re-inviting after revoke/expiry must UPDATE the
-- existing row (reset status/token/expiry), not INSERT.
CREATE TABLE invites (
  id               TEXT PRIMARY KEY,
  ward_id          TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,                 -- lowercased
  ward_role        TEXT NOT NULL DEFAULT 'member' CHECK (ward_role IN ('superadmin','member')),
  calling_title    TEXT,
  token            TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ward_id, email)
);

-- Space assignments carried by an invite (materialized into space_memberships on accept).
CREATE TABLE invite_space_roles (
  id        TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  space_id  TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  UNIQUE (invite_id, space_id)
);

-- ============================================================ AUTH
-- Decision: stateless sessions (signed cookie, short TTL) — no sessions table.
-- Authorization is re-checked against D1 on every request, so a stale cookie only
-- affects identity, never role escalation. Revisit only if "log out everywhere" is needed.

-- ============================================================ VOLUNTEER SIGN-UPS
-- Organization presidents post needs (dates x helper roles); ward members sign up from an
-- unguessable public link with any email. See SCHEMA.md "Volunteer sign-ups" and
-- docs/superpowers/specs/2026-11-21-volunteer-signups-design.md. Every table carries ward_id
-- and every query filters on it. Permission decisions live in src/lib/volAccess.ts.
-- Dates (YYYY-MM-DD) and times (HH:MM) are ward-local wall time (wards.timezone).

-- Service categories (spec 2026-11-22, section 3): what a volunteer post (kind 'opportunity')
-- or a member's request for help (kind 'request') is about. New wards get the defaults
-- (src/lib/serviceCategories.ts). default_audiences: comma list over brothers, sisters, youth,
-- children. confidential (requests): only the owning spaces' owners and superadmins see them.
-- opportunity_category_id (requests): where "Turn into a service opportunity" starts.
-- discord_webhook_url is a secret: never shown in full after saving, never logged.
CREATE TABLE service_categories (
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
CREATE INDEX idx_service_categories_ward ON service_categories(ward_id);

-- A category's owning spaces (kind org, bishopric or ward_council only; app-enforced).
CREATE TABLE service_category_spaces (
  id          TEXT PRIMARY KEY,
  ward_id     TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  space_id    TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  UNIQUE (category_id, space_id)
);
CREATE INDEX idx_service_category_spaces_ward ON service_category_spaces(ward_id);
CREATE INDEX idx_service_category_spaces_space ON service_category_spaces(space_id);

-- A volunteer post. Belongs to one space (org, ward_council or bishopric: one of its
-- category's owning spaces) and one category. public_id is a random, unguessable token used in
-- the public link /v/<public_id> (never a sequential id or readable slug).
CREATE TABLE vol_posts (
  id                  TEXT PRIMARY KEY,
  ward_id             TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id            TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  -- Always set by the app (createPost); nullable only so an upgraded database can be
  -- backfilled (backfillPostCategories in src/lib/serviceCategories.ts).
  category_id         TEXT REFERENCES service_categories(id) ON DELETE RESTRICT,
  audiences           TEXT NOT NULL DEFAULT 'brothers,sisters',  -- who it's for (serve page sections)
  public_id           TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  public_note         TEXT,                     -- shown to anyone with the link (mdLite)
  private_details     TEXT,                     -- address/door code/allergies: approved volunteers on this post + leaders only
  cancel_cutoff_hours INTEGER NOT NULL DEFAULT 24 CHECK (cancel_cutoff_hours >= 0 AND cancel_cutoff_hours <= 336),
  full_notified_at    TEXT,                     -- "fully filled" email sent; reset when it drops below full
  created_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_vol_posts_ward ON vol_posts(ward_id);
CREATE INDEX idx_vol_posts_space ON vol_posts(space_id);
CREATE INDEX idx_vol_posts_category ON vol_posts(category_id);

CREATE TABLE vol_dates (
  id                 TEXT PRIMARY KEY,
  ward_id            TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  post_id            TEXT NOT NULL REFERENCES vol_posts(id) ON DELETE CASCADE,
  date               TEXT NOT NULL,             -- YYYY-MM-DD, ward-local
  start_time         TEXT,                      -- HH:MM, ward-local (optional)
  approval_nudged_at TEXT,                      -- 48h "still waiting for approval" nudge sent
  position           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_vol_dates_ward ON vol_dates(ward_id);
CREATE INDEX idx_vol_dates_post ON vol_dates(post_id);

CREATE TABLE vol_roles (
  id           TEXT PRIMARY KEY,
  ward_id      TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  post_id      TEXT NOT NULL REFERENCES vol_posts(id) ON DELETE CASCADE,
  date_id      TEXT NOT NULL REFERENCES vol_dates(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  needed       INTEGER NOT NULL CHECK (needed BETWEEN 1 AND 500),
  start_time   TEXT,                            -- HH:MM; falls back to the date's start_time
  end_time     TEXT,
  note         TEXT,
  bring_prompt TEXT,                            -- "what are you bringing?" (answers are public, names are not)
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_vol_roles_ward ON vol_roles(ward_id);
CREATE INDEX idx_vol_roles_post ON vol_roles(post_id);
CREATE INDEX idx_vol_roles_date ON vol_roles(date_id);

-- A person who signs up by email (no Google account). Email is their key, per ward.
-- approval: 'none' = address not verified yet; 'pending' = verified, waiting for a leader;
-- 'approved' = approved once for the whole ward; 'declined' = can't sign up again here.
CREATE TABLE volunteers (
  id                 TEXT PRIMARY KEY,
  ward_id            TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  email              TEXT NOT NULL,             -- lowercased
  name               TEXT NOT NULL,
  approval           TEXT NOT NULL DEFAULT 'none'
                       CHECK (approval IN ('none','pending','approved','declined')),
  email_verified_at  TEXT,
  decided_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at         TEXT,
  discord_user_id    TEXT,                      -- set via Discord OAuth ("Connect Discord")
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ward_id, email)
);
CREATE INDEX idx_volunteers_ward ON volunteers(ward_id);

-- status: 'waiting' (address unconfirmed or not yet approved; never counts) | 'confirmed' |
-- 'cancelled' (by the volunteer) | 'withdrawn' (over-limit offer withdrawn) | 'removed' (by a
-- leader, or approval revoked) | 'declined' | 'lapsed' (still waiting when the date was over).
-- over_limit = 1 when it counted after the role was already full.
CREATE TABLE vol_signups (
  id           TEXT PRIMARY KEY,
  ward_id      TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  post_id      TEXT NOT NULL REFERENCES vol_posts(id) ON DELETE CASCADE,
  role_id      TEXT NOT NULL REFERENCES vol_roles(id) ON DELETE CASCADE,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  child_name   TEXT NOT NULL DEFAULT '',        -- '' = the volunteer themself; else a child's first name (a parent signs up their child)
  bringing     TEXT,
  status       TEXT NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting','confirmed','cancelled','withdrawn','removed','declined','lapsed')),
  over_limit   INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT,
  confirm_seq  INTEGER,                         -- order of confirmation on the role (set atomically); decides who is over the limit
  ended_at     TEXT,
  reminded_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_vol_signups_ward ON vol_signups(ward_id);
CREATE INDEX idx_vol_signups_post ON vol_signups(post_id);
CREATE INDEX idx_vol_signups_role ON vol_signups(role_id);
CREATE INDEX idx_vol_signups_volunteer ON vol_signups(volunteer_id);
-- One active sign-up per volunteer, role and child name (double clicks collapse to one; a
-- parent may sign up themself and each child once). Child names compare case-insensitively.
CREATE UNIQUE INDEX ux_vol_signups_active ON vol_signups(role_id, volunteer_id, child_name COLLATE NOCASE)
  WHERE status IN ('waiting','confirmed');

-- "Who can manage volunteer posts" for an org space, beyond its owners (who are always on it).
CREATE TABLE vol_editors (
  id               TEXT PRIMARY KEY,
  ward_id          TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  space_id         TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (space_id, user_id)
);
CREATE INDEX idx_vol_editors_ward ON vol_editors(ward_id);
CREATE INDEX idx_vol_editors_user ON vol_editors(user_id);

-- Single-use, short-lived email-confirmation tokens. Only a SHA-256 hash is stored.
CREATE TABLE vol_tokens (
  id           TEXT PRIMARY KEY,
  ward_id      TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  purpose      TEXT NOT NULL CHECK (purpose IN ('verify')),
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TEXT NOT NULL,
  used_at      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_vol_tokens_ward ON vol_tokens(ward_id);
CREATE INDEX idx_vol_tokens_volunteer ON vol_tokens(volunteer_id);

-- Rate-limit events for the public forms (per address, per post, per IP). Pruned by the cron.
CREATE TABLE vol_rate_events (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  bucket     TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_vol_rate_events_bucket ON vol_rate_events(bucket, created_at);
CREATE INDEX idx_vol_rate_events_ward ON vol_rate_events(ward_id);

-- ============================================================ SERVICE (spec 2026-11-22)
-- Delegates, fill warnings, member requests for help, bulk invitations. All ward-scoped;
-- permission decisions live in src/lib/serviceAccess.ts (categories, delegates, requests).

-- Coordinators a category's managers name. Counts only while they are still a ward member.
CREATE TABLE service_delegates (
  id               TEXT PRIMARY KEY,
  ward_id          TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id      TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (category_id, user_id)
);
CREATE INDEX idx_service_delegates_ward ON service_delegates(ward_id);
CREATE INDEX idx_service_delegates_user ON service_delegates(user_id);

-- A manager's own fill-warning choice for a category: warn me (on/off), how many hours before
-- a date starts (1-336), and others to warn (service_warn_others).
CREATE TABLE service_warn_prefs (
  id          TEXT PRIMARY KEY,
  ward_id     TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warn_me     INTEGER NOT NULL DEFAULT 1,
  hours       INTEGER NOT NULL DEFAULT 48 CHECK (hours BETWEEN 1 AND 336),
  UNIQUE (category_id, user_id)
);
CREATE INDEX idx_service_warn_prefs_ward ON service_warn_prefs(ward_id);

CREATE TABLE service_warn_others (
  id      TEXT PRIMARY KEY,
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  pref_id TEXT NOT NULL REFERENCES service_warn_prefs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (pref_id, user_id)
);
CREATE INDEX idx_service_warn_others_ward ON service_warn_others(ward_id);

-- One fill warning per post date and recipient, ever (claimed with INSERT OR IGNORE).
CREATE TABLE vol_warn_sent (
  id      TEXT PRIMARY KEY,
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  date_id TEXT NOT NULL REFERENCES vol_dates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (date_id, user_id)
);
CREATE INDEX idx_vol_warn_sent_ward ON vol_warn_sent(ward_id);

-- A member's request for help (spec section 6). Minimal by design (Handbook 38.8.32): name,
-- email, optional phone and a one-line note; moving adds in/out + preferred date; Christmas
-- adds own/other family. Visible only per serviceAccess.canSeeRequest. Deleted 30 days after
-- it's closed (done/declined); unverified ones after 7 days (hourly cron).
CREATE TABLE service_requests (
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
CREATE INDEX idx_service_requests_ward ON service_requests(ward_id);
CREATE INDEX idx_service_requests_category ON service_requests(category_id);

-- Single-use, 48-hour email verification tokens for requests (SHA-256 hash only).
CREATE TABLE request_tokens (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_request_tokens_ward ON request_tokens(ward_id);
CREATE INDEX idx_request_tokens_request ON request_tokens(request_id);

-- One paste of invitation addresses for one post: the operator's record (who, when, post,
-- counts). Kept after it finishes; its recipient rows are deleted then. post_title keeps the
-- record readable if the post is deleted.
CREATE TABLE invite_batches (
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
CREATE INDEX idx_invite_batches_ward ON invite_batches(ward_id);
CREATE INDEX idx_invite_batches_status ON invite_batches(status);

-- The pasted addresses waiting to be sent. claim_id/claimed_at: an atomic claim by one pump
-- run (a claim older than 10 minutes may be retaken). Deleted when the batch ends.
CREATE TABLE invite_recipients (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  batch_id   TEXT NOT NULL REFERENCES invite_batches(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  claim_id   TEXT,
  claimed_at TEXT,
  sent_at    TEXT,
  failed     INTEGER NOT NULL DEFAULT 0,          -- 1 = failed, 2 = skipped (unsubscribed since the paste)
  attempts   INTEGER NOT NULL DEFAULT 0,          -- pump runs that tried it (a retryable error retries, up to 3)
  UNIQUE (batch_id, email)
);
CREATE INDEX idx_invite_recipients_ward ON invite_recipients(ward_id);
CREATE INDEX idx_invite_recipients_batch ON invite_recipients(batch_id, sent_at);
CREATE INDEX idx_invite_recipients_claim ON invite_recipients(claim_id);

-- "Stop service invitations from <ward>": SHA-256 of the normalized address, never the
-- address. Never blocks notify mail (confirmations, reminders).
CREATE TABLE invite_suppressions (
  id         TEXT PRIMARY KEY,
  ward_id    TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ward_id, email_hash)
);

-- Invitations sent per ward-local day, against wards.invite_daily_cap.
CREATE TABLE invite_daily_counts (
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,                         -- YYYY-MM-DD, ward-local
  sent    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ward_id, day)
);

-- Category delegations an invite carries (a manager invited a coordinator by email);
-- materialized into service_delegates when the invite is accepted.
CREATE TABLE invite_category_delegations (
  id          TEXT PRIMARY KEY,
  invite_id   TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  UNIQUE (invite_id, category_id)
);
