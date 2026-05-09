-- ═══════════════════════════════════════════════════════════════════════════════
-- DRC Digital Ecosystem — Dashboard Phase (006)
-- Applies after 001–005. Adds: task submissions, dept-scoped tasks, credit hours,
-- deliverables timeline, media asset library, volunteer_hours audit columns,
-- and site_content seeds for join toggle + social handles.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. TASKS: submissions + dept scope + credit hours ─────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS artifact_url   TEXT,
  ADD COLUMN IF NOT EXISTS artifact_notes TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS department_id  INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_hours   NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_dept ON tasks (department_id);

-- ── 2. PROJECTS: credit hours + budget ────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS credit_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost         NUMERIC(10,2);

-- ── 3. DELIVERABLES TIMELINE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliverables (
  deliverable_id SERIAL PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  due_date       DATE,
  completed      BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables (project_id, order_index);

-- ── 4. MEDIA ASSET LIBRARY ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  asset_id     SERIAL PRIMARY KEY,
  url          TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    VARCHAR(100),
  size_bytes   BIGINT,
  uploaded_by  INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  label        VARCHAR(255),
  tags         TEXT[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_created ON media_assets (created_at DESC);

-- ── 5. VOLUNTEER HOURS: source audit columns ─────────────────────────────
ALTER TABLE volunteer_hours
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'self_logged',
  ADD COLUMN IF NOT EXISTS source_id   INTEGER;
-- source_type: 'self_logged' | 'task_credit' | 'project_credit'
-- source_id:   task_id or project_id (nullable for self-logged)

CREATE UNIQUE INDEX IF NOT EXISTS uq_vh_source
  ON volunteer_hours (member_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

-- ── 6. SITE CONTENT SEEDS ─────────────────────────────────────────────────
INSERT INTO site_content (content_key, value_json, description) VALUES
  ('join.accepting', '{"accepting": true}'::jsonb, 'HR toggle — true = form visible, false = closed message shown')
ON CONFLICT (content_key) DO NOTHING;

INSERT INTO site_content (content_key, value_en, value_ar, description) VALUES
  ('join.closed.message',
   'Membership is closed for this semester. Follow our pages to know when we reopen.',
   'التسجيل مغلق لهذا الفصل. تابعنا على حساباتنا لمعرفة موعد إعادة الفتح.',
   'Shown on /join when accepting = false')
ON CONFLICT (content_key) DO NOTHING;

INSERT INTO site_content (content_key, value_json, description) VALUES
  ('social.handles', '{"instagram": "", "twitter": "", "youtube_channel_id": ""}'::jsonb, 'Social platform handles/IDs used by Media dashboard feeds')
ON CONFLICT (content_key) DO NOTHING;
