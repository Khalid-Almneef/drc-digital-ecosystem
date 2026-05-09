-- In-app notification inbox.
--
-- Notifications are pushed by API handlers when something interesting happens
-- to a member: their hours got approved, a task was assigned, a project
-- application was accepted, a service request changed state, etc.
--
-- The recipient sees them in the sidebar bell (NotificationPanel). Reads are
-- per-recipient via is_read + read_at. There is no broadcast/notification-fanout
-- table — every recipient has their own row.

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  recipient_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
  category VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link_url TEXT,
  source_type VARCHAR(40),
  source_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_recent
  ON notifications (recipient_id, created_at DESC);
