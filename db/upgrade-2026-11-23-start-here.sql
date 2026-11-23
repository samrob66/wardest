-- Upgrade an EXISTING local database (made from db/schema.sql before 2026-11-23) for the
-- Executive Secretary "Start here" track: solutions.setup_step (NULL = not in the track).
-- New databases just use db/schema.sql. Nothing is deployed, so this is for local databases:
--   npx wrangler d1 execute wardforward-db --local --file=./db/upgrade-2026-11-23-start-here.sql
--
-- SQLite has no "ADD COLUMN IF NOT EXISTS", so a second run fails ("duplicate column"). Run it
-- once; or delete .wrangler/state and start from db/schema.sql.
ALTER TABLE solutions ADD COLUMN setup_step INTEGER;
