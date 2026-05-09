-- ═══════════════════════════════════════════════════════════════════════════════
-- 028: Force social.handles to the canonical X/LinkedIn/TikTok URLs.
--
-- Earlier migrations + ad-hoc dashboard edits left this row in a bad state
-- (e.g. {"twitter": ""}). This is a one-shot reset; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE site_content
SET value_json = jsonb_build_object(
    'x',        'https://x.com/drcksu',
    'linkedin', 'https://www.linkedin.com/company/drones-and-robotics-club',
    'tiktok',   'https://www.tiktok.com/@drc_ksu'
  )
WHERE content_key = 'social.handles';
