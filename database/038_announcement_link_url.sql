-- Optional outbound link for announcements (e.g. "View event", "Register here").
-- image_url already exists. Add link_url so authors can attach a destination.
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS link_url TEXT;
