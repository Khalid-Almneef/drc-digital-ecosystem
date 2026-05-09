-- ═══════════════════════════════════════════════════════════════════════════════
-- 023: project publish flag — projects are drafts until media publishes them.
--
-- Existing rows default to FALSE so legacy projects are *not* leaked publicly
-- after migration. Media leadership flips them per project.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_projects_published ON projects (is_published)
  WHERE is_published = TRUE;
