-- Media department sub-lead role titles
--   - Danah Mohammed Alahmari (108) → Design Lead
--   - Sarah Khalid Alotaibi   (109) → Photography Lead
UPDATE profiles
   SET custom_role = 'Design Lead',
       custom_role_ar = 'قائدة التصميم'
 WHERE member_id = 108;

UPDATE profiles
   SET custom_role = 'Photography Lead',
       custom_role_ar = 'قائدة التصوير'
 WHERE member_id = 109;
