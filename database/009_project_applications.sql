ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS applications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS application_roles TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

CREATE TABLE IF NOT EXISTS project_applications (
  application_id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
  role VARCHAR(120) NOT NULL,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_applications_role_not_blank CHECK (btrim(role) <> ''),
  CONSTRAINT project_applications_unique_role UNIQUE (project_id, member_id, role)
);

DROP TRIGGER IF EXISTS trg_project_applications_updated ON project_applications;
CREATE TRIGGER trg_project_applications_updated
  BEFORE UPDATE ON project_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_applications_enabled
  ON projects (applications_enabled)
  WHERE applications_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_applications_project
  ON project_applications (project_id, status);

CREATE INDEX IF NOT EXISTS idx_project_applications_member
  ON project_applications (member_id, created_at DESC);
