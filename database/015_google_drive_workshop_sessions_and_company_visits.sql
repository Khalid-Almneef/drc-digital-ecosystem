ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS google_drive_folder_url TEXT;

UPDATE workshops
   SET google_drive_folder_url = video_url
 WHERE google_drive_folder_url IS NULL
   AND video_url IS NOT NULL
   AND video_url ILIKE '%drive.google.com%';

CREATE TABLE IF NOT EXISTS workshop_sessions (
  session_id SERIAL PRIMARY KEY,
  workshop_id INTEGER NOT NULL REFERENCES workshops(workshop_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  title_ar VARCHAR(255),
  description TEXT,
  duration_min INTEGER,
  google_drive_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_workshop_sessions_updated ON workshop_sessions;
CREATE TRIGGER trg_workshop_sessions_updated
  BEFORE UPDATE ON workshop_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_workshop_sessions_workshop
  ON workshop_sessions (workshop_id, order_index ASC);

ALTER TABLE department_service_requests
  DROP CONSTRAINT IF EXISTS department_service_requests_request_type_check;

ALTER TABLE department_service_requests
  ADD CONSTRAINT department_service_requests_request_type_check
  CHECK (request_type IN ('design', 'workshop', 'project_media', 'company_visit'));

ALTER TABLE department_service_requests
  DROP CONSTRAINT IF EXISTS department_service_requests_target_department_slug_check;

ALTER TABLE department_service_requests
  ADD CONSTRAINT department_service_requests_target_department_slug_check
  CHECK (target_department_slug IN ('media', 'development', 'pr'));
