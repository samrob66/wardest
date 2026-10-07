-- Seed: Mapleton 44th Ward — the public portal and its links.
-- Idempotent via INSERT OR IGNORE (fixed IDs). To fully reset local state, delete
-- .wrangler/state and re-run db:init:local + db:seed:local.
--
-- Short links are M44's real zippa.run links (as on its live hub, m44ward.github.io/m44links),
-- pasted in as deliverables.short_url. The public space has no share_url: M44's master link
-- zippa.run/m44Links points at the ward's own GitHub hub, not at this portal.
--
-- NOTE (O2): unit_number is a placeholder 'TBD-M44' until the owner supplies the real number.

-- System user (owns seed rows; deliverables.created_by is NOT NULL). Real users arrive in Phase 1.
INSERT OR IGNORE INTO users (id, google_sub, email, name)
VALUES ('usr_system', 'system', 'system@wardest.com', 'Wardest System');

INSERT OR IGNORE INTO wards (id, name, unit_number, prefix, status, created_by_user_id)
VALUES ('wrd_m44', 'Mapleton 44th Ward', 'TBD-M44', 'm44', 'active', 'usr_system');

-- Default space set. Public portal is published; the rest await Phase 1+ membership.
INSERT OR IGNORE INTO spaces (id, ward_id, kind, name, slug, portal_title, portal_published, position) VALUES
  ('spc_m44_public',     'wrd_m44', 'public',       'Public',               'public',               'Mapleton 44th Ward Links', 1, 0),
  ('spc_m44_bishopric',  'wrd_m44', 'bishopric',    'Bishopric',            'bishopric',            NULL, 0, 1),
  ('spc_m44_council',    'wrd_m44', 'ward_council', 'Ward Council',         'ward-council',         NULL, 0, 2),
  ('spc_m44_eq',         'wrd_m44', 'org',          'Elders Quorum',        'elders-quorum',        NULL, 0, 3),
  ('spc_m44_rs',         'wrd_m44', 'org',          'Relief Society',       'relief-society',       NULL, 0, 4),
  ('spc_m44_yw',         'wrd_m44', 'org',          'Young Women',          'young-women',          NULL, 0, 5),
  ('spc_m44_ym',         'wrd_m44', 'org',          'Young Men',            'young-men',            NULL, 0, 6),
  ('spc_m44_primary',    'wrd_m44', 'org',          'Primary',              'primary',              NULL, 0, 7),
  ('spc_m44_ss',         'wrd_m44', 'org',          'Sunday School',        'sunday-school',        NULL, 0, 8),
  ('spc_m44_activities', 'wrd_m44', 'org',          'Activities Committee', 'activities-committee', NULL, 0, 9),
  ('spc_m44_mission',    'wrd_m44', 'org',          'Ward Mission',         'ward-mission',         NULL, 0, 10);

-- The 6 links as ad-hoc deliverables (implementation_id NULL — no catalog yet in Phase 0).
INSERT OR IGNORE INTO deliverables (id, ward_id, implementation_id, title, type, url, short_url, created_by_user_id) VALUES
  ('dlv_m44_bulletin',  'wrd_m44', NULL, 'Show the Ward Bulletin',    'url', 'https://wardbulletin.app/bulletin?unitid=44thward', 'https://zippa.run/m44Bulletin', 'usr_system'),
  ('dlv_m44_welcome',   'wrd_m44', NULL, 'Fill out New Member Form',  'url', 'https://docs.google.com/forms/d/e/1FAIpQLSdHe4dXJI3SWn9yktG3m286XD6C8asramneql6NZSr3GapPaA/viewform', 'https://zippa.run/m44Welcome', 'usr_system'),
  ('dlv_m44_discord',   'wrd_m44', NULL, 'Join Discord (Chat Rooms)', 'url', 'https://discord.gg/nGNYaqEzqk', 'https://zippa.run/m44Discord', 'usr_system'),
  ('dlv_m44_interview', 'wrd_m44', NULL, 'Schedule an Interview',     'url', 'https://calendar.google.com/calendar/u/0/appointments/AcZssZ1SGKJ4eWGFYtAFZMnXujVz1oatTw8bnrOlNEE=', 'https://zippa.run/m44BshpInt', 'usr_system'),
  ('dlv_m44_setapart',  'wrd_m44', NULL, 'Schedule a Setting Apart',  'url', 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2dBp-pSQLk7gV-8QehNLutSyakiVZWuAhZ0fx2W8PKlf2r6UWOYSqSIg_AOnvjAJTjKgRBgHtP', 'https://zippa.run/m44SetApart', 'usr_system'),
  ('dlv_m44_stake',     'wrd_m44', NULL, 'Visit the Stake Website',   'url', 'https://sites.google.com/view/mapletonutahmaplecanyonstake/general?authuser=0', 'https://zippa.run/MapleCanyonStake', 'usr_system');

-- Publish all 6 to the Public portal, in the original link-in-bio order.
INSERT OR IGNORE INTO deliverable_spaces (id, ward_id, deliverable_id, space_id, include_in_portal, position) VALUES
  ('dsp_m44_bulletin',  'wrd_m44', 'dlv_m44_bulletin',  'spc_m44_public', 1, 0),
  ('dsp_m44_welcome',   'wrd_m44', 'dlv_m44_welcome',   'spc_m44_public', 1, 1),
  ('dsp_m44_discord',   'wrd_m44', 'dlv_m44_discord',   'spc_m44_public', 1, 2),
  ('dsp_m44_interview', 'wrd_m44', 'dlv_m44_interview', 'spc_m44_public', 1, 3),
  ('dsp_m44_setapart',  'wrd_m44', 'dlv_m44_setapart',  'spc_m44_public', 1, 4),
  ('dsp_m44_stake',     'wrd_m44', 'dlv_m44_stake',     'spc_m44_public', 1, 5);
