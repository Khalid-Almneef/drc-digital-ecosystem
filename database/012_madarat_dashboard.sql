CREATE TABLE IF NOT EXISTS madarat_sessions (
  session_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  interviewee_name VARCHAR(255) NOT NULL,
  interviewee_role VARCHAR(255),
  program_type VARCHAR(20) NOT NULL DEFAULT 'interview'
    CHECK (program_type IN ('interview', 'madaria')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER,
  location VARCHAR(255),
  meeting_url TEXT,
  max_registrants INTEGER,
  registration_open BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_madarat_sessions_updated ON madarat_sessions;
CREATE TRIGGER trg_madarat_sessions_updated
  BEFORE UPDATE ON madarat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_madarat_sessions_scheduled
  ON madarat_sessions (scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_madarat_sessions_created_by
  ON madarat_sessions (created_by, created_at DESC);

CREATE TABLE IF NOT EXISTS madarat_session_registrations (
  registration_id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES madarat_sessions(session_id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  university_id VARCHAR(50),
  phone VARCHAR(50),
  department VARCHAR(150),
  notes TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, email)
);

CREATE INDEX IF NOT EXISTS idx_madarat_session_regs_session
  ON madarat_session_registrations (session_id, registered_at ASC);

CREATE INDEX IF NOT EXISTS idx_madarat_session_regs_email
  ON madarat_session_registrations (email);
