-- 019: Allow accounts created by HR with no password yet.
-- A NULL password_hash means "registered, awaiting first-login setup email."

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
