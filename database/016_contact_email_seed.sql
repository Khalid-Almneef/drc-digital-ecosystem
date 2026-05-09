INSERT INTO site_content (content_key, value_en, value_ar, description)
VALUES (
  'contact.email',
  'partnerships@drc.club',
  'partnerships@drc.club',
  'Public company and partner contact email shown on the homepage and footer'
)
ON CONFLICT (content_key) DO NOTHING;
