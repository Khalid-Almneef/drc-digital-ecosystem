-- Update Rayan Alzahrani's profile bio per request.
-- Original seed (020) set bio = 'Ministry of Defense'; replaced with 'Confidential'.
UPDATE profiles
   SET bio = 'Confidential'
 WHERE member_id = (SELECT member_id FROM users WHERE email = 'ahmdd655@gmail.com');
