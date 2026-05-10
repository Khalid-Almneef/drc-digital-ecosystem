-- Roster corrections after the 020 seed:
--   - Saba (126) and Firas (127) belong to Madarat leadership, not Logistics.
--   - Yazan (128) is the Projects Supervisor under Executive (sub_leader),
--     not a Logistics member.
UPDATE users SET department_id = (SELECT department_id FROM departments WHERE slug = 'madarat')
 WHERE member_id IN (126, 127);

UPDATE users
   SET department_id = (SELECT department_id FROM departments WHERE slug = 'executive'),
       position = 'sub_leader'
 WHERE member_id = 128;

UPDATE profiles
   SET custom_role = 'Projects Supervisor',
       custom_role_ar = 'مشرف المشاريع'
 WHERE member_id = 128;
