-- Example published solutions for the catalog (global; not ward-scoped). Idempotent.
-- Load locally: wrangler d1 execute wardest-db --local --file=./db/seed-solutions.sql
INSERT OR IGNORE INTO solutions
  (id, category, title, slug, summary, body, video_url, template_type, template_value, implementation_scope, status, position)
VALUES
  ('sol_ex_interviews', 'exec_secretary', 'Bishopric Interview Scheduling',
   'bishopric-interview-scheduling',
   'Let members book interview slots via a Google Calendar appointment page.',
   'Open Google Calendar → Create → Appointment schedule.
Set your available interview windows and sharing to "anyone with the link".
Copy the booking page link and add it here as a deliverable.',
   NULL, 'link', 'https://calendar.google.com/', 'ward_singleton', 'published', 0),

  ('sol_ex_welcome', 'ward_clerk', 'New Member Welcome Form',
   'new-member-welcome-form',
   'A Google Form that collects new-member details for the clerk.',
   'Make a copy of the template, adjust the questions for your ward, then publish it.
Paste the live form link here as a deliverable so it can go on the public portal.',
   NULL, 'google_copy', 'https://docs.google.com/forms/d/e/EXAMPLE/copy', 'ward_singleton', 'published', 0),

  ('sol_ex_bulletin', 'bishopric', 'Weekly Ward Bulletin Link',
   'weekly-ward-bulletin-link',
   'A single, stable link members can use to view the weekly bulletin.',
   'Set up your bulletin in your tool of choice, then add the public bulletin link here.',
   NULL, NULL, NULL, 'ward_singleton', 'published', 0),

  ('sol_ex_presidency_drive', 'org_presidencies', 'Presidency Google Drive',
   'presidency-google-drive',
   'A shared Drive folder for each presidency''s working documents.',
   'Create a shared folder, add your presidency and secretary, then record the folder link.
Each organization tracks this separately.',
   NULL, 'link', 'https://drive.google.com/', 'per_space', 'published', 0);
