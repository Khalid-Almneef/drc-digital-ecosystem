

-- ─── 2. Upsert current leadership roster ───────────────────────────────────
-- Existing accounts are updated by email; new accounts are created with
-- password_hash = NULL so they can use the account-setup flow.

WITH roster(email, position, department_slug) AS (
  VALUES
    ('danadosary1@gmail.com',             'sub_leader'::user_position,       'media'),
    ('meme.mansour17@gmail.com',          'dept_vice_leader'::user_position,'hr'),
    ('abdullahalmasoud20@gmail.com',      'sub_leader'::user_position,       'media'),
    ('osamah.alsheddi0@gmail.com',         'dept_leader'::user_position,      'innovation'),
    ('saad987hoor@gmail.com',              'dept_leader'::user_position,      'media'),
    ('saraalotaibiqw@gmail.com',           'dept_leader'::user_position,      'madarat'),
    ('s4366866@gmail.com',                 'sub_leader'::user_position,       'media'),
    ('joodprofacc@gmail.com',              'dept_vice_leader'::user_position,'project_management'),
    ('444101877@student.ksu.edu.sa',       'dept_leader'::user_position,      'pr'),
    ('eng.alzain.mrd@gmail.com',           'dept_vice_leader'::user_position,'pr'),
    ('albatool.nn@gmail.com',              'dept_vice_leader'::user_position,'media'),
    ('danasultana22@gmail.com',            'sub_leader'::user_position,       'innovation'),
    ('jumanaalabssi@gmail.com',            'president'::user_position,        'executive'),
    ('a7mad.musleh@gmail.com',             'sub_leader'::user_position,       'innovation'),
    ('alisultanrub@outlook.com',           'dept_leader'::user_position,      'madarat'),
    ('tr.almadani@gmail.com',              'dept_leader'::user_position,      'project_management'),
    ('abatool945@gmail.com',               'sub_leader'::user_position,       'media'),
    ('baderabaidas@gmail.com',             'vice_president'::user_position,   'executive'),
    ('ibrahim1alsuwaidan@gmail.com',       'sub_leader'::user_position,       'innovation'),
    ('enaslsaeed@gmail.com',               'dept_leader'::user_position,      'innovation'),
    ('usamhssan@gmail.com',                'dept_leader'::user_position,      'hr'),
    ('sebaajmi@gmail.com',                 'dept_leader'::user_position,      'finance')
)
INSERT INTO users (email, password_hash, position, department_id, is_active)
SELECT
  r.email,
  NULL,
  r.position,
  d.department_id,
  TRUE
FROM roster r
JOIN departments d ON d.slug::text = r.department_slug
ON CONFLICT (email) DO UPDATE SET
  position      = EXCLUDED.position,
  department_id = EXCLUDED.department_id,
  is_active     = TRUE;

-- ─── 3. Update current roster profiles ─────────────────────────────────────

WITH roster(email, full_name_ar, university_id, phone_number, major) AS (
  VALUES
    ('danadosary1@gmail.com', 'دانه مطحس الدوسري', '445202368', '0569254976', 'نظم المعلومات'),
    ('meme.mansour17@gmail.com', 'منتهى منصور الدوخي', '445204063', '0550402502', 'حقوق'),
    ('abdullahalmasoud20@gmail.com', 'عبدالله عبدالعزيز المسعود', '445101576', '0553934833', 'هندسة حاسب'),
    ('osamah.alsheddi0@gmail.com', 'أسامه عبدالمحسن الشدي', '443102410', '0502345566', 'هندسة حاسب'),
    ('saad987hoor@gmail.com', 'دانه محمد الأحمري', '444928548', '0503393751', 'تغذية سريرية'),
    ('saraalotaibiqw@gmail.com', 'ساره خالد العتيبي', '446202712', '0544030597', 'هندسة برمجيات'),
    ('s4366866@gmail.com', 'سديم تركي بن مفيريج', '445200227', '0508487313', 'هندسة طبية تطبيقية'),
    ('joodprofacc@gmail.com', 'جود طارق الزهراني', '446206980', '0534767136', 'رياضيات اكتوارية'),
    ('444101877@student.ksu.edu.sa', 'باسل بن محمد الدغيم', '444101877', '0557805448', 'هندسة حاسب'),
    ('eng.alzain.mrd@gmail.com', 'الزين بشير المرشد', '446203231', '0541743780', 'نظم معلومات'),
    ('albatool.nn@gmail.com', 'البتول نايف أباالخيل', '445204241', '0508255949', 'علوم حاسب'),
    ('danasultana22@gmail.com', 'دانا سلطان العتيبي', '445203123', '0532396021', 'تقنية معلومات'),
    ('jumanaalabssi@gmail.com', 'جمانه محمد العابسي', '445202164', '0504220477', 'علوم حاسب'),
    ('a7mad.musleh@gmail.com', 'أحمد سليم مصلح', '446109514', '0551692295', 'هندسة حاسب'),,
    ('alisultanrub@outlook.com', 'علي سلطان الربيعان', '445102764', '0556015254', 'هندسة الحاسب كلية الحاسب'),
    ('tr.almadani@gmail.com', 'طاهر عادل المدني', '445101184', '0545571071', 'هندسة الحاسب'),
    ('abatool945@gmail.com', 'بتول احمد الحر', 'S250066343', '0531441346', 'علوم حاسب'),
    ('baderabaidas@gmail.com', 'بدر عمار بيدس', '445107465', '0507844771', 'هندسة حاسب'),
    ('ibrahim1alsuwaidan@gmail.com', 'ابراهيم عبدالكريم السويدان', '445103216', '0508593871', 'هندسة حاسب'),
    ('enaslsaeed@gmail.com', 'إيناس عبدلله سعيد', '445200940', '0530961451', 'هندسة طبية تطبيقية'),
    ('usamhssan@gmail.com', 'اسامه محمد حسن', '444170526', '0552301016', 'نظم معلومات'),
    ('sebaajmi@gmail.com', 'صبا بنت عبد الرحمن العجمي', '446202765', '0550004267', 'تقنية معلومات')
)
INSERT INTO profiles (
  member_id,
  full_name,
  full_name_ar,
  university_id,
  phone_number,
  major,
  status,
  is_public_on_team
)
SELECT
  u.member_id,
  r.full_name_ar,
  r.full_name_ar,
  r.university_id,
  r.phone_number,
  r.major,
  'active',
  TRUE
FROM roster r
JOIN users u ON LOWER(u.email) = LOWER(r.email)
ON CONFLICT (member_id) DO UPDATE SET
  full_name_ar      = EXCLUDED.full_name_ar,
  university_id     = EXCLUDED.university_id,
  phone_number      = EXCLUDED.phone_number,
  major             = EXCLUDED.major,
  status            = 'active',
  is_public_on_team = TRUE;

-- ─── 4. Custom roles for sub-leaders ───────────────────────────────────────

-- Media: Marketing & Content
UPDATE profiles
SET custom_role = 'Marketing & Content Lead',
    custom_role_ar = 'قائدة التسويق وكتابة المحتوى'
WHERE member_id = (
  SELECT member_id FROM users
  WHERE LOWER(email) = 'danadosary1@gmail.com'
);

-- Media: Advisor
UPDATE profiles
SET custom_role = 'Media Advisor',
    custom_role_ar = 'مستشار إعلامي'
WHERE member_id = (
  SELECT member_id FROM users
  WHERE LOWER(email) = 'abdullahalmasoud20@gmail.com'
);

-- Media: Photography & Editing
UPDATE profiles
SET custom_role = 'Photography & Editing Lead',
    custom_role_ar = 'قائدة التصوير والمونتاج'
WHERE member_id = (
  SELECT member_id FROM users
  WHERE LOWER(email) = 's4366866@gmail.com'
);

-- Media: Design
UPDATE profiles
SET custom_role = 'Design Lead',
    custom_role_ar = 'قائدة التصميم'
WHERE member_id = (
  SELECT member_id FROM users
  WHERE LOWER(email) = 'abatool945@gmail.com'
);

-- Innovation: Quality & Execution
UPDATE profiles
SET custom_role = 'Quality & Assurance Lead',
    custom_role_ar = 'قائدة الجودة والتنفيذ'
WHERE member_id IN (
  SELECT member_id
  FROM users
  WHERE LOWER(email) IN (
    'danasultana22@gmail.com',
    'a7mad.musleh@gmail.com',
    'ibrahim1alsuwaidan@gmail.com'
  )
);

UPDATE profiles
SET custom_role_ar = 'قائد الجودة والتنفيذ'
WHERE member_id IN (
  SELECT member_id
  FROM users
  WHERE LOWER(email) IN (
    'a7mad.musleh@gmail.com',
    'ibrahim1alsuwaidan@gmail.com'
  )
);

-- ─── 5. Clear stale custom roles for main leaders ──────────────────────────

UPDATE profiles
SET custom_role = NULL,
    custom_role_ar = NULL
WHERE member_id IN (
  SELECT member_id
  FROM users
  WHERE LOWER(email) IN (
    'meme.mansour17@gmail.com',
    'osamah.alsheddi0@gmail.com',
    'saad987hoor@gmail.com',
    'saraalotaibiqw@gmail.com',
    'joodprofacc@gmail.com',
    '444101877@student.ksu.edu.sa',
    'eng.alzain.mrd@gmail.com',
    'albatool.nn@gmail.com',
    'jumanaalabssi@gmail.com',
    'alisultanrub@outlook.com',
    'tr.almadani@gmail.com',
    'baderabaidas@gmail.com',
    'enaslsaeed@gmail.com',
    'usamhssan@gmail.com',
    'sebaajmi@gmail.com'
  )
);



-- ─── 6. Refresh public team roster ─────────────────────────────────────────
-- Hide everyone from the public team page first.
-- Accounts and historical records remain untouched.

UPDATE profiles
SET is_public_on_team = FALSE;

-- Show only the current 22-person leadership roster.

UPDATE profiles
SET is_public_on_team = TRUE
WHERE member_id IN (
  SELECT member_id
  FROM users
  WHERE LOWER(email) IN (
    'danadosary1@gmail.com',
    'meme.mansour17@gmail.com',
    'abdullahalmasoud20@gmail.com',
    'osamah.alsheddi0@gmail.com',
    'saad987hoor@gmail.com',
    'saraalotaibiqw@gmail.com',
    's4366866@gmail.com',
    'joodprofacc@gmail.com',
    '444101877@student.ksu.edu.sa',
    'eng.alzain.mrd@gmail.com',
    'albatool.nn@gmail.com',
    'danasultana22@gmail.com',
    'jumanaalabssi@gmail.com',
    'a7mad.musleh@gmail.com',
    'alisultanrub@outlook.com',
    'tr.almadani@gmail.com',
    'abatool945@gmail.com',
    'baderabaidas@gmail.com',
    'ibrahim1alsuwaidan@gmail.com',
    'enaslsaeed@gmail.com',
    'usamhssan@gmail.com',
    'sebaajmi@gmail.com'
  )
);
