-- ═══════════════════════════════════════════════════════════════════════════════
-- 022: motm_history — every Member-of-the-Month / Leader-of-the-Month award.
--
-- The current set of MOTM is stored as JSON in site_content.members_of_month.
-- When HR (or admin) updates that set, they ALSO append a row here so we can
-- count lifetime awards per member, render leaderboards, and badge profiles.
--
-- One row per (member, year, month, role) — role distinguishes regular MOTM
-- recipients from leaders recognised in the same announcement.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS motm_history (
    history_id  SERIAL PRIMARY KEY,
    member_id   INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    year        INTEGER NOT NULL,
    month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    role        VARCHAR(20) NOT NULL DEFAULT 'member'
                CHECK (role IN ('member', 'leader')),
    awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    awarded_by  INTEGER REFERENCES users(member_id),
    note        TEXT,
    UNIQUE (member_id, year, month, role)
);

CREATE INDEX IF NOT EXISTS idx_motm_history_member ON motm_history (member_id);
CREATE INDEX IF NOT EXISTS idx_motm_history_period ON motm_history (year DESC, month DESC);

-- Convenience view: leaderboard with name + dept + count
CREATE OR REPLACE VIEW motm_leaderboard AS
  SELECT u.member_id,
         p.full_name,
         p.full_name_ar,
         p.avatar_url,
         d.slug AS department_slug,
         d.name AS department_name,
         d.name_ar AS department_name_ar,
         COUNT(*) FILTER (WHERE h.role = 'member') AS motm_member_count,
         COUNT(*) FILTER (WHERE h.role = 'leader') AS motm_leader_count,
         COUNT(*) AS motm_total_count,
         MAX(h.awarded_at) AS last_awarded_at
    FROM motm_history h
    JOIN users u ON u.member_id = h.member_id
    JOIN profiles p ON p.member_id = u.member_id
    LEFT JOIN departments d ON d.department_id = u.department_id
   WHERE u.is_active = TRUE
   GROUP BY u.member_id, p.full_name, p.full_name_ar, p.avatar_url, d.slug, d.name, d.name_ar;
