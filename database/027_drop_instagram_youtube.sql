-- ═══════════════════════════════════════════════════════════════════════════════
-- 027: Remove instagram + youtube_channel_id keys from social.handles.
--
-- Background: 025 seeded social.handles with instagram=null, youtube=null
-- entries that the dashboard editor and the public footer used to render
-- empty inputs/icons. We've removed those platforms from the UI; this
-- migration scrubs the keys out of the live JSON value so the shape on
-- disk matches the new SocialHandles type.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE site_content
SET value_json = (value_json - 'instagram' - 'youtube_channel_id')
WHERE content_key = 'social.handles';
