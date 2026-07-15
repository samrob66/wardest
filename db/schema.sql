-- Wardest.com — Cloudflare D1 (SQLite) schema
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
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_solutions_category_status ON solutions(category, status);

-- ============================================================ TENANT: WARDS

CREATE TABLE wards (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  unit_number       TEXT NOT NULL UNIQUE,       -- dedupe key
  prefix            TEXT NOT NULL UNIQUE,        -- lowercased go4.cc namespacing prefix, e.g. 'm44'
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','suspended')),
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
-- A portal's go4.cc link is a short_links row with target_type='portal' + target_space_id.
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
-- QR is DERIVED from url / short link at render time (not stored).
-- Its go4.cc link is a short_links row with target_type='deliverable' + target_deliverable_id.
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
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_deliverables_ward ON deliverables(ward_id);

-- Publishing layer: which spaces a deliverable appears in, and whether it shows on that
-- space's portal page + its order. A deliverable can be published to multiple spaces.
CREATE TABLE deliverable_spaces (
  id                TEXT PRIMARY KEY,
  ward_id           TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  deliverable_id    TEXT NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  space_id          TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  include_in_portal INTEGER NOT NULL DEFAULT 1,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (deliverable_id, space_id)
);
CREATE INDEX idx_deliverable_spaces_space ON deliverable_spaces(space_id);

-- ============================================================ SHORTENER (go4.cc)
-- D1 is source of truth; a KV mirror (slug -> destination) is populated for edge redirects.
-- target_* is the ONLY link between a short link and what it points at (no back-references
-- from deliverables/spaces — look up by query).
CREATE TABLE short_links (
  id                    TEXT PRIMARY KEY,
  ward_id               TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  slug                  TEXT NOT NULL UNIQUE,     -- full path, lowercased, prefix-namespaced
  destination_url       TEXT NOT NULL,
  target_type           TEXT NOT NULL DEFAULT 'manual'
                          CHECK (target_type IN ('manual','deliverable','portal')),
  target_deliverable_id TEXT REFERENCES deliverables(id) ON DELETE SET NULL,
  target_space_id       TEXT REFERENCES spaces(id) ON DELETE SET NULL,
  disabled              INTEGER NOT NULL DEFAULT 0,
  created_by_user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_short_links_ward ON short_links(ward_id);

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
