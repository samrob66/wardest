-- Example published solutions for the catalog (global; not ward-scoped). Idempotent.
-- Load locally: wrangler d1 execute wardforward-db --local --file=./db/seed-solutions.sql
-- The interview-scheduling and bulletin examples were replaced by the Executive Secretary
-- Start here steps (db/seed-start-here.sql, 2026-11-23); this removes them from older databases.
DELETE FROM solutions WHERE id IN ('sol_ex_interviews','sol_ex_bulletin');
INSERT OR IGNORE INTO solutions
  (id, category, title, slug, summary, body, video_url, template_type, template_value, implementation_scope, status, position)
VALUES
  ('sol_ex_welcome', 'ward_clerk', 'New Member Welcome Form',
   'new-member-welcome-form',
   'A Google Form that collects new-member details for the clerk.',
   'Make a copy of the template, adjust the questions for your ward, then publish it.
Paste the live form link here as a deliverable so it can go on the public portal.',
   NULL, 'google_copy', 'https://docs.google.com/forms/d/e/EXAMPLE/copy', 'ward_singleton', 'published', 0),

  ('sol_ex_presidency_drive', 'org_presidencies', 'Presidency Google Drive',
   'presidency-google-drive',
   'A shared Drive folder for each presidency''s working documents.',
   'Create a shared folder, add your presidency and secretary, then record the folder link.
Each organization tracks this separately.',
   NULL, 'link', 'https://drive.google.com/', 'per_space', 'published', 0);
