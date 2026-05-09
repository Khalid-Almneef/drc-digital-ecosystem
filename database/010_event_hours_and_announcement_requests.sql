ALTER TABLE events
  ADD COLUMN IF NOT EXISTS credit_hours NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS announcement_requests (
  request_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  priority announcement_priority NOT NULL DEFAULT 'medium',
  request_type VARCHAR(30) NOT NULL DEFAULT 'general'
    CHECK (request_type IN ('general', 'monthly_newsletter')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'rejected')),
  requested_by INTEGER NOT NULL REFERENCES users(member_id) ON DELETE RESTRICT,
  handled_by INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  desired_publish_date DATE,
  published_announcement_id INTEGER REFERENCES announcements(announcement_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_announcement_requests_updated ON announcement_requests;
CREATE TRIGGER trg_announcement_requests_updated
  BEFORE UPDATE ON announcement_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_events_credit_hours
  ON events (credit_hours)
  WHERE credit_hours > 0;

CREATE INDEX IF NOT EXISTS idx_announcement_requests_status
  ON announcement_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_requests_requested_by
  ON announcement_requests (requested_by, created_at DESC);
