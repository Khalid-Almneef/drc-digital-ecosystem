-- Madarat sessions can now carry a cover image (shown in the public events feed
-- + leader-side cards) and a recorded attendance count (for past sessions
-- imported manually).
ALTER TABLE madarat_sessions
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS attendance_count INTEGER;
