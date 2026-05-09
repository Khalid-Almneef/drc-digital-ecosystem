-- ═══════════════════════════════════════════════════════════════════════════════
-- 025: site_content defaults — socials, contact email, join gate.
-- Idempotent: existing rows are preserved (so leadership edits made via the
-- dashboard survive a re-run). Only inserts when the key isn't already there.
--
-- Column names match the schema in 004_additions.sql:
--   content_key (primary key), value_en, value_ar, value_json
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO site_content (content_key, value_en, value_ar, value_json) VALUES
  ('join.accepting', NULL, NULL,
    '{"accepting": false}'::jsonb),
  ('join.closed.message',
    'Membership applications are currently closed. Follow our pages for the next intake window.',
    'التسجيل مغلق حالياً. تابعوا حساباتنا لمعرفة موعد الفتح القادم.',
    NULL),
  ('social.handles', NULL, NULL,
    '{"x": "https://x.com/drcksu", "linkedin": "https://www.linkedin.com/company/drones-and-robotics-club", "tiktok": "https://www.tiktok.com/@drc_ksu", "instagram": null, "youtube_channel_id": null}'::jsonb),
  ('contact.email', 'partnerships@drc.club', 'partnerships@drc.club', NULL)
ON CONFLICT (content_key) DO NOTHING;
