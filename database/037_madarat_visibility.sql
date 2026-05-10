-- Madarat session visibility:
--   'public'    → anyone with the link can register (anonymous form)
--   'club_only' → only logged-in club members can register
ALTER TABLE madarat_sessions
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'public';

ALTER TABLE madarat_sessions
  DROP CONSTRAINT IF EXISTS madarat_sessions_visibility_check;

ALTER TABLE madarat_sessions
  ADD CONSTRAINT madarat_sessions_visibility_check
  CHECK (visibility IN ('public', 'club_only'));
