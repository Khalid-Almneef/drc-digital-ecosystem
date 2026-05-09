ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NOT NULL DEFAULT 'prefer_not_to_say'
  CHECK (gender IN ('male', 'female', 'prefer_not_to_say'));

CREATE TABLE IF NOT EXISTS department_service_requests (
  request_id SERIAL PRIMARY KEY,
  request_type VARCHAR(20) NOT NULL
    CHECK (request_type IN ('design', 'workshop')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'rejected')),
  source_department_slug VARCHAR(30) NOT NULL
    CHECK (source_department_slug IN ('hr', 'development', 'innovation', 'media', 'pr', 'finance', 'logistics', 'madarat')),
  target_department_slug VARCHAR(30) NOT NULL
    CHECK (target_department_slug IN ('media', 'development')),
  requested_by INTEGER NOT NULL REFERENCES users(member_id) ON DELETE RESTRICT,
  assignee_id INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  assignee_note TEXT,
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_department_service_requests_updated ON department_service_requests;
CREATE TRIGGER trg_department_service_requests_updated
  BEFORE UPDATE ON department_service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_department_service_requests_target
  ON department_service_requests (target_department_slug, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_department_service_requests_source
  ON department_service_requests (source_department_slug, created_at DESC);

ALTER TABLE madarat_sessions
  ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255);

ALTER TABLE madarat_sessions
  DROP CONSTRAINT IF EXISTS madarat_sessions_program_type_check;

UPDATE madarat_sessions
   SET program_type = CASE
     WHEN program_type = 'interview' THEN 'madarat'
     WHEN program_type = 'madaria' THEN 'madariya_males'
     ELSE program_type
   END
 WHERE program_type IN ('interview', 'madaria');

ALTER TABLE madarat_sessions
  ADD CONSTRAINT madarat_sessions_program_type_check
  CHECK (program_type IN ('madarat', 'madariya_males', 'madariya_females'));
