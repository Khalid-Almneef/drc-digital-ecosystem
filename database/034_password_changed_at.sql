-- 034_password_changed_at.sql
--
-- H-03 follow-up: track the last time a user's password changed, so we can
-- invalidate every existing JWT session by comparing the token's `iat` to this
-- timestamp on verify. Without this column, changing the password leaves every
-- previously-issued session cookie valid until expiry (7 days by default).
--
-- DEFAULT NOW() so existing rows get a sane baseline; freshly-issued JWTs are
-- always >= NOW() at the moment of this migration, so nobody is forcibly
-- signed out by running it.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
