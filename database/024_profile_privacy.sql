-- ═══════════════════════════════════════════════════════════════════════════════
-- 024: per-field privacy toggles on profiles.
--
-- Members already control whether they appear on the team page at all
-- (`is_public_on_team`). This migration adds finer-grained toggles so each
-- contact channel can be exposed or hidden independently.
--
-- Defaults: email FALSE (kept private unless the member opts in or holds a
-- leadership role); LinkedIn/phone/github default TRUE because they're already
-- being filled in for outreach. Members can flip any of them in /dashboard/profile.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_email_public    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_linkedin_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_phone_public    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_github_public   BOOLEAN NOT NULL DEFAULT TRUE;
