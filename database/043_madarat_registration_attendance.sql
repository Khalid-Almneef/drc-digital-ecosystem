-- Per-registration attendance flag for Madarat sessions.
-- Leaders mark a registrant as 'present' after the session runs; defaults to
-- 'not present' so the table acts as a check-in list.
ALTER TABLE madarat_session_registrations
  ADD COLUMN IF NOT EXISTS attended BOOLEAN NOT NULL DEFAULT FALSE;
