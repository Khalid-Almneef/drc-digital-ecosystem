-- Adds a clickable URL for the session venue (Google Maps pin, room booking,
-- meet-here link). Separate from meeting_url so a session can be in-person
-- with a map AND have a backup video call link.
ALTER TABLE madarat_sessions
  ADD COLUMN IF NOT EXISTS location_url TEXT;
