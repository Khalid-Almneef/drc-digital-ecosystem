-- 042: Volunteer hour tasks — repetitive flag + department targeting
--
-- Feature 1 — `is_repetitive` lets HR mark a task as something members can log
-- against more than once (e.g. weekly meeting attendance). For non-repetitive
-- tasks the existing "one row per (member, hour_task)" guarantee still holds,
-- so we keep the uq_vh_source unique index but make it conditional on the
-- linked task being non-repetitive. That requires rewriting the partial index
-- as a regular unique index backed by a row check, which Postgres can't
-- express directly across tables — so instead we drop the global uniqueness
-- and enforce it in the register endpoint (it already does a pre-check).
--
-- Feature 2 — `assigned_department_id` lets HR scope a task to a single
-- department (otherwise it's club-wide). NULL = club-wide.

ALTER TABLE volunteer_hour_tasks
  ADD COLUMN IF NOT EXISTS is_repetitive BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assigned_department_id INTEGER
    REFERENCES departments(department_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_volunteer_hour_tasks_department
  ON volunteer_hour_tasks (assigned_department_id);

-- Relax the cross-row uniqueness on volunteer_hours so repetitive tasks can
-- accept multiple registrations from the same member. The register endpoint
-- continues to block duplicates for non-repetitive tasks at the application
-- layer.
DROP INDEX IF EXISTS uq_vh_source;
