-- ═══════════════════════════════════════════════════════════════════════════════
-- 021: change_requests — proposed mutations from non-leaders awaiting approval.
--
-- Members of a department can navigate the dashboard and perform low-risk
-- actions directly. Higher-impact actions (posting announcements, creating
-- projects, deciding cross-dept service requests, sponsor changes, etc.)
-- become a *change_request* row that the dept's leadership reviews.
--
-- A request stores enough info to *replay* the original mutation on approval:
-- - request_type identifies which handler runs the apply step.
-- - payload is the exact body that would have gone to the original endpoint.
-- - target_id (optional) is the entity the request is editing/deleting, when
--   the action is not a pure create.
-- - summary is human-readable text shown in the leader inbox.
--
-- Approval is one-click; rejection has no reason field — both notify the
-- requester via the existing notifications inbox.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS change_requests (
  request_id    SERIAL PRIMARY KEY,
  -- Which handler runs the apply step. Free-form so new types can be added
  -- without a migration. Convention: snake_case verb + entity (e.g. "post_announcement").
  request_type  VARCHAR(60) NOT NULL,
  -- Department whose leaders are responsible for the decision. Members of
  -- this department's leadership see the request in their inbox.
  department_id INTEGER NOT NULL REFERENCES departments(department_id),
  requester_id  INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
  -- Optional pointer to the entity the request operates on (e.g. project_id
  -- for an edit/delete). NULL for pure creates.
  target_id     INTEGER,
  -- Exact JSON body that would have been sent to the original endpoint.
  -- Replayed verbatim on approval.
  payload       JSONB NOT NULL,
  -- Human-readable summary, e.g. "Post announcement: 'Summer break dates'"
  summary       TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'apply_failed')),
  decided_by    INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  decided_at    TIMESTAMPTZ,
  -- Set when status transitions from 'approved' to 'applied' (or 'apply_failed'
  -- if the apply step itself errored). Lets us distinguish "the leader said
  -- yes" from "the action actually ran".
  applied_at    TIMESTAMPTZ,
  -- Free-form note from the apply step on failure (e.g. validation error).
  apply_error   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_dept_pending
  ON change_requests (department_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_change_requests_requester
  ON change_requests (requester_id, created_at DESC);

CREATE TRIGGER trg_change_requests_updated
  BEFORE UPDATE ON change_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
