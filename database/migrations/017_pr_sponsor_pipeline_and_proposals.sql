-- Public Relations sponsor pipeline and proposal drafting.

-- v_dashboard_stats (created in 003) references sponsors.status, which blocks
-- the type swap below. Drop and recreate the view at the end of this file.
DROP VIEW IF EXISTS v_dashboard_stats;

ALTER TABLE sponsors ALTER COLUMN status DROP DEFAULT;
ALTER TABLE sponsors ALTER COLUMN status TYPE TEXT USING status::text;
DROP TYPE IF EXISTS sponsor_status;
CREATE TYPE sponsor_status AS ENUM (
  'active',
  'pending',
  'negotiating',
  'expired',
  'wanting_to_contact',
  'contacted',
  'in_process',
  'valid',
  'failed'
);

ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at DATE,
  ADD COLUMN IF NOT EXISTS proposal_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS proposal_body TEXT,
  ADD COLUMN IF NOT EXISTS proposal_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS proposal_updated_at TIMESTAMPTZ;

UPDATE sponsors
   SET status = CASE status::text
     WHEN 'pending' THEN 'wanting_to_contact'
     WHEN 'negotiating' THEN 'in_process'
     WHEN 'active' THEN 'valid'
     WHEN 'expired' THEN 'failed'
     ELSE status
   END
 WHERE status::text IN ('pending', 'negotiating', 'active', 'expired');

ALTER TABLE sponsors
  ALTER COLUMN status TYPE sponsor_status USING status::sponsor_status,
  ALTER COLUMN status SET DEFAULT 'wanting_to_contact';

CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_active_members,
    (SELECT COUNT(*) FROM projects WHERE status IN ('planning', 'in_progress', 'testing')) AS active_projects,
    (SELECT COUNT(*) FROM events WHERE start_time > NOW()) AS upcoming_events,
    (SELECT COUNT(*) FROM membership_applications WHERE status = 'pending') AS pending_applications,
    (SELECT COUNT(*) FROM tasks WHERE status IN ('todo', 'in_progress')) AS open_tasks,
    (SELECT COALESCE(SUM(amount), 0) FROM sponsors WHERE status::text IN ('active', 'valid')) AS total_sponsorship;
