-- Public contact email is now drcksu@gmail.com (was partnerships@drc.club placeholder).
UPDATE site_content
   SET value_en = 'drcksu@gmail.com',
       value_ar = 'drcksu@gmail.com',
       updated_at = NOW()
 WHERE content_key = 'contact.email';
