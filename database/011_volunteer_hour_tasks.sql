CREATE TABLE IF NOT EXISTS volunteer_hour_tasks (
  opportunity_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  participation_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_volunteer_hour_tasks_updated ON volunteer_hour_tasks;
CREATE TRIGGER trg_volunteer_hour_tasks_updated
  BEFORE UPDATE ON volunteer_hour_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_volunteer_hour_tasks_active
  ON volunteer_hour_tasks (is_active, participation_date DESC);

CREATE INDEX IF NOT EXISTS idx_volunteer_hour_tasks_created_by
  ON volunteer_hour_tasks (created_by, created_at DESC);
