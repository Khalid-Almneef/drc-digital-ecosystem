-- ═══════════════════════════════════════════════════════════════════════════════
-- 029: Custom role labels + correct QA / Media sub-leader hierarchy.
--
-- Two things were wrong in production:
--
-- 1. profiles.custom_role didn't exist as a column, so the team page could
--    never display labels like "Quality & Assurance Lead" for sub-leaders.
--
-- 2. Six members were stored with the wrong position in users.position:
--      - Innovation Quality & Assurance leads (Fahda, Haneen, Bader) were
--        seeded as dept_leader instead of sub_leader.
--      - Media sub-leaders (Abdullah, Abeer, Danah, Sara) were seeded as
--        dept_leader / member instead of sub_leader.
--    This made the public team page render them in the head row alongside
--    the actual dept leader and vice.
--
-- Idempotent: re-runnable.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add the columns ─────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role     VARCHAR(120);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_ar  VARCHAR(120);

-- ─── 2. Innovation — Quality & Assurance leads ──────────────────────────────
UPDATE users SET position = 'sub_leader'
  WHERE email IN ('fahdahkarim@gmail.com', 'haneen.al.mutairi7@gmail.com', 'baderabaidas@gmail.com');

UPDATE profiles
  SET custom_role    = 'Quality & Assurance Lead',
      custom_role_ar = 'قائد الجودة والتنفيذ'
  WHERE member_id IN (
    SELECT member_id FROM users
     WHERE email IN ('fahdahkarim@gmail.com', 'haneen.al.mutairi7@gmail.com', 'baderabaidas@gmail.com')
  );

-- ─── 3. Media — sub-leaders ────────────────────────────────────────────────
UPDATE users SET position = 'sub_leader'
  WHERE email IN (
    'abdullahalmasoud20@gmail.com',
    'abeer0alsahli@gmail.com',
    'saad987hoor@gmail.com',
    'saraalotaibiqw@gmail.com'
  );

-- Per-person custom roles
UPDATE profiles SET custom_role = 'Media Advisor', custom_role_ar = 'مستشار إعلامي'
  WHERE member_id = (SELECT member_id FROM users WHERE email = 'abdullahalmasoud20@gmail.com');

UPDATE profiles SET custom_role = 'Marketing & Content Lead', custom_role_ar = 'قائدة التسويق والمحتوى'
  WHERE member_id = (SELECT member_id FROM users WHERE email = 'abeer0alsahli@gmail.com');

UPDATE profiles SET custom_role = 'Quality & Assurance Lead', custom_role_ar = 'قائدة الجودة والتنفيذ'
  WHERE member_id IN (
    SELECT member_id FROM users
     WHERE email IN ('saad987hoor@gmail.com', 'saraalotaibiqw@gmail.com')
  );
