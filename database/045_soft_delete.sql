-- Soft-delete columns across content tables. Hard-delete is preserved as a
-- fallback (e.g. for genuine spam / data-cleanup), but the app's DELETE
-- endpoints now flip is_deleted instead and list endpoints filter by default.
--
-- We chose soft-delete to preserve audit history (volunteer hours, MOTM
-- leaderboards, project credit-hour ledgers, etc.) while still letting leaders
-- "remove" something from the UI.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tasks',
      'projects',
      'volunteer_hour_tasks',
      'workshops',
      'live_workshops',
      'madarat_sessions',
      'events',
      'announcements',
      'announcement_requests'
    ])
  LOOP
    EXECUTE format(
      'ALTER TABLE %I
         ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
         ADD COLUMN IF NOT EXISTS deleted_by INTEGER NULL REFERENCES users(member_id) ON DELETE SET NULL',
      tbl
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I(is_deleted) WHERE is_deleted = FALSE',
      tbl || '_active_idx',
      tbl
    );
  END LOOP;
END $$;
