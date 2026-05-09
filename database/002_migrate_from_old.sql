-- ═══════════════════════════════════════════════════════════════════════════════
-- DRC Migration: Old Schema → New Schema
-- Run AFTER 001_schema.sql on a FRESH database
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 1: Insert all departments
INSERT INTO departments (slug, name, name_ar, description) VALUES
    ('innovation',  'Innovation & Engineering', 'لجنة الابتكار والهندسة', 'Hardware projects, prototypes, drones, and robotics'),
    ('development', 'Development',             'لجنة التطوير',           'Software, firmware, AI, and digital systems'),
    ('media',       'Media',                   'لجنة الإعلام',           'Content creation, photography, video, social media'),
    ('pr',          'Public Relations',        'لجنة العلاقات العامة',     'Sponsorships, outreach, partnerships'),
    ('hr',          'Human Resources',         'لجنة الموارد البشرية',     'Recruitment, onboarding, member development'),
    ('finance',     'Finance',                 'لجنة المالية',           'Budget management, procurement, financial planning'),
    ('logistics',   'Logistics',               'لجنة اللوجستية',          'Events, equipment, operations'),
    ('executive',   'Executive',               'القيادة',               'Club president, VP, and strategic direction');

-- Step 2: Migrate 57 existing members with HASHED passwords
-- All were in Innovation (department_id = 1)
INSERT INTO users (member_id, email, password_hash, position, department_id, is_active, created_at)
SELECT
    v.member_id,
    v.email,
    crypt('drc2026', gen_salt('bf', 12)),
    'member'::user_position,
    1,  -- Innovation & Engineering
    TRUE,
    v.created_at
FROM (VALUES
    (1, 'member1@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (2, 'member2@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (3, 'member3@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (4, 'member4@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (5, 'member5@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (6, 'member6@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (7, 'member7@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (8, 'member8@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (9, 'member9@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (10, 'member10@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (11, 'member11@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (12, 'member12@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (13, 'member13@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (14, 'member14@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (15, 'member15@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (16, 'member16@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (17, 'member17@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (18, 'member18@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (19, 'member19@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (20, 'member20@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (21, 'member21@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (22, 'member22@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (23, 'member23@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (24, 'member24@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (25, 'member25@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (26, 'member26@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (27, 'member27@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (28, 'member28@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (29, 'member29@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (30, 'member30@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (31, 'member31@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (32, 'member32@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (33, 'member33@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (34, 'member34@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (35, 'member35@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (36, 'member36@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (37, 'member37@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (38, 'member38@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (39, 'member39@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (40, 'member40@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (41, 'member41@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (42, 'member42@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (43, 'member43@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (44, 'member44@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (45, 'member45@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (46, 'member46@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (47, 'member47@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (48, 'member48@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (49, 'member49@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (50, 'member50@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (51, 'member51@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (52, 'member52@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (53, 'member53@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (54, 'member54@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (55, 'member55@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (56, 'member56@drc.com', '2026-03-31 11:51:05.984052'::timestamptz),
    (57, 'member57@drc.com', '2026-03-31 11:51:05.984052'::timestamptz)
) AS v(member_id, email, created_at);

SELECT setval('users_member_id_seq', 57);

-- Step 3: Migrate profiles (Arabic names preserved)
INSERT INTO profiles (member_id, full_name, full_name_ar, bio) VALUES
    (1, 'Fahdah Al-Abdulkarim', 'فهدة العبدالكريم', 'لجنة الابتكار'),
    (2, 'Wahaj Al-Juaid', 'وهج الجعيد', 'لجنة الابتكار'),
    (3, 'Lama Al-Rushoud', 'لمى الرشود', 'لجنة الابتكار'),
    (4, 'Dana Al-Majli', 'دانه المجلي', 'لجنة الابتكار'),
    (5, 'Aleen Al-Dosari', 'آلين الدوسري', 'لجنة الابتكار'),
    (6, 'Tala Al Jami', 'تالا آل جميع', 'لجنة الابتكار'),
    (7, 'Raghad Al-Abrah', 'رغد العبره', 'لجنة الابتكار'),
    (8, 'Manar Al-Obaid', 'منار العبيد', 'لجنة الابتكار'),
    (9, 'Abdullah Al-Ghadeer', 'عبدالله الغدير', 'لجنة الابتكار'),
    (10, 'Hussam Al Sumaih', 'حسام آل سميح', 'لجنة الابتكار'),
    (11, 'Ahmed Matar', 'أحمد مطر', 'لجنة الابتكار'),
    (12, 'Faisal Ahmed', 'فيصل أحمد', 'لجنة الابتكار'),
    (13, 'Haneen Al-Mutairi', 'حنين المطيري', 'لجنة الابتكار'),
    (14, 'Enas Saeed', 'إيناس سعيد', 'لجنة الابتكار'),
    (15, 'Dana Al-Otaibi', 'دانا العتيبي', 'لجنة الابتكار'),
    (16, 'Lateefah Al-Jabali', 'لطيفه الجبالي', 'لجنة الابتكار'),
    (17, 'Rahaf Al-Faleh', 'رهـاف الفالح', 'لجنة الابتكار'),
    (18, 'Falwah Al-Dosari', 'فلوة الدوسري', 'لجنة الابتكار'),
    (19, 'Abdulrahman Al-Duraibi', 'عبدالرحمن الدريبي', 'لجنة الابتكار'),
    (20, 'Abdullah Al-Sulaimani', 'عبدالله السليماني', 'لجنة الابتكار'),
    (21, 'Abdulaziz Al-Juwair', 'عبدالعزيز الجوير', 'لجنة الابتكار'),
    (22, 'Rakan Al-Jadeed', 'راكان الجديد', 'لجنة الابتكار'),
    (23, 'Sultan Al-Anazi', 'سلطان العنزي', 'لجنة الابتكار'),
    (24, 'Bader Bidas', 'بدر بيدس', 'لجنة الابتكار'),
    (25, 'Aqeel Al-Muqbil', 'عقيل المقبل', 'لجنة الابتكار'),
    (26, 'Rakan Al-Dosari', 'راكان الدوسري', 'لجنة الابتكار'),
    (27, 'Ahmed Mosleh', 'أحمد مصلح', 'لجنة الابتكار'),
    (28, 'Sulaiman Al-Dughairi', 'سليمان الدغيري', 'لجنة الابتكار'),
    (29, 'Ahmed Al-Askar', 'أحمد العسكر', 'لجنة الابتكار'),
    (30, 'Zuhd Ibrahim', 'زهد إبراهيم', 'لجنة الابتكار'),
    (31, 'Leen Siwar', 'لين سوار', 'لجنة الابتكار'),
    (32, 'Al-Ghaid Jamaan', 'الغيد جمعان', 'لجنة الابتكار'),
    (33, 'Fatimah Al-Hashim', 'فاطمة الهاشم', 'لجنة الابتكار'),
    (34, 'Ahmed Salem', 'أحمد سالم', 'لجنة الابتكار'),
    (35, 'Khalid Al-Muneef', 'خالد المنيف', 'لجنة الابتكار'),
    (36, 'Fayez Al-Shahri', 'فايز الشهري', 'لجنة الابتكار'),
    (37, 'Meshal Al-Qahtani', 'مشعل القحطاني', 'لجنة الابتكار'),
    (38, 'Khalid Al-Mutairi', 'خالد المطيري', 'لجنة الابتكار'),
    (39, 'Osama Al-Shadi', 'أسامة الشدي', 'لجنة الابتكار'),
    (40, 'Hassan Wafaullah', 'حسان وفاءالله', 'لجنة الابتكار'),
    (41, 'Sarah Al-Bukhaitan', 'ساره البخيتان', 'لجنة الابتكار'),
    (42, 'Shaikha Al-Nami', 'شيخه النامي', 'لجنة الابتكار'),
    (43, 'Janan Al-Shatwi', 'جنان الشتوي', 'لجنة الابتكار'),
    (44, 'Rand Al Madwah', 'رند آل مضواح', 'لجنة الابتكار'),
    (45, 'Lana Al-Husaini', 'لانا الحسيني', 'لجنة الابتكار'),
    (46, 'Wasen Asiri', 'وسن عسيري', 'لجنة الابتكار'),
    (47, 'Joud Al-Mazroua', 'جود المزروع', 'لجنة الابتكار'),
    (48, 'Leen Al-Harabi', 'لين الحرابي', 'لجنة الابتكار'),
    (49, 'Shahd Al-Zahrani', 'شهد الزهراني', 'لجنة الابتكار'),
    (50, 'Mashael Al-Mohsen', 'مشاعل المحسن', 'لجنة الابتكار'),
    (51, 'Fatimah Muqallad', 'فاطمة مقلد', 'لجنة الابتكار'),
    (52, 'Duaa Al-Ghamdi', 'دعاء الغامدي', 'لجنة الابتكار'),
    (53, 'Saud Al-Hazmi', 'سعود الحازمي', 'لجنة الابتكار'),
    (54, 'Ibrahim Al-Suwaidan', 'إبراهيم السويدان', 'لجنة الابتكار'),
    (55, 'Mohammed Al-Mutairi', 'محمد المطيري', 'لجنة الابتكار'),
    (56, 'Saud Al Zaid', 'سعود آل زيد', 'لجنة الابتكار'),
    (57, 'Ibrahim Al-Hamoud', 'إبراهيم الحمود', 'لجنة الابتكار');

SELECT setval('profiles_profile_id_seq', 57);

-- Step 4: Create leadership accounts (one per department position)
-- Executive
INSERT INTO users (email, password_hash, position, department_id, is_active) VALUES
    ('president@drc.club', crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'president', 8, TRUE),
    ('vp@drc.club',        crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'vice_president', 8, TRUE);

-- Department leaders + vice leaders
INSERT INTO users (email, password_hash, position, department_id, is_active) VALUES
    -- Innovation (dept 1)
    ('innovation.lead@drc.club',  crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_leader', 1, TRUE),
    ('innovation.vice@drc.club',  crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_vice_leader', 1, TRUE),
    -- Development (dept 2)
    ('dev.lead@drc.club',         crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_leader', 2, TRUE),
    ('dev.vice@drc.club',         crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_vice_leader', 2, TRUE),
    -- Media (dept 3)
    ('media.lead@drc.club',       crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_leader', 3, TRUE),
    ('media.vice@drc.club',       crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_vice_leader', 3, TRUE),
    -- PR (dept 4)
    ('pr.lead@drc.club',          crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_leader', 4, TRUE),
    ('pr.vice@drc.club',          crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_vice_leader', 4, TRUE),
    -- HR (dept 5)
    ('hr.lead@drc.club',          crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_leader', 5, TRUE),
    ('hr.vice@drc.club',          crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_vice_leader', 5, TRUE),
    -- Finance (dept 6)
    ('finance.lead@drc.club',     crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_leader', 6, TRUE),
    ('finance.vice@drc.club',     crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_vice_leader', 6, TRUE),
    -- Logistics (dept 7)
    ('logistics.lead@drc.club',   crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_leader', 7, TRUE),
    ('logistics.vice@drc.club',   crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'dept_vice_leader', 7, TRUE);

-- Example sub-leaders (2 per major department)
INSERT INTO users (email, password_hash, position, department_id, is_active) VALUES
    ('innovation.sub1@drc.club', crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'sub_leader', 1, TRUE),
    ('innovation.sub2@drc.club', crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'sub_leader', 1, TRUE),
    ('dev.sub1@drc.club',        crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'sub_leader', 2, TRUE),
    ('dev.sub2@drc.club',        crypt('ChangeMeNow!2026', gen_salt('bf', 12)), 'sub_leader', 2, TRUE);

-- Create profiles for all leaders
INSERT INTO profiles (member_id, full_name, full_name_ar) VALUES
    (58, 'Club President', 'رئيس النادي'),
    (59, 'Club Vice President', 'نائب رئيس النادي'),
    (60, 'Innovation Leader', 'رئيس لجنة الابتكار'),
    (61, 'Innovation Vice Leader', 'نائب رئيس لجنة الابتكار'),
    (62, 'Development Leader', 'رئيس لجنة التطوير'),
    (63, 'Development Vice Leader', 'نائب رئيس لجنة التطوير'),
    (64, 'Media Leader', 'رئيس لجنة الإعلام'),
    (65, 'Media Vice Leader', 'نائب رئيس لجنة الإعلام'),
    (66, 'PR Leader', 'رئيس لجنة العلاقات العامة'),
    (67, 'PR Vice Leader', 'نائب رئيس لجنة العلاقات العامة'),
    (68, 'HR Leader', 'رئيس لجنة الموارد البشرية'),
    (69, 'HR Vice Leader', 'نائب رئيس لجنة الموارد البشرية'),
    (70, 'Finance Leader', 'رئيس لجنة المالية'),
    (71, 'Finance Vice Leader', 'نائب رئيس لجنة المالية'),
    (72, 'Logistics Leader', 'رئيس لجنة اللوجستية'),
    (73, 'Logistics Vice Leader', 'نائب رئيس لجنة اللوجستية'),
    (74, 'Innovation Sub-Leader 1', 'مسؤول فريق ابتكار ١'),
    (75, 'Innovation Sub-Leader 2', 'مسؤول فريق ابتكار ٢'),
    (76, 'Dev Sub-Leader 1', 'مسؤول فريق تطوير ١'),
    (77, 'Dev Sub-Leader 2', 'مسؤول فريق تطوير ٢');

-- Step 5: Seed budget categories
INSERT INTO budget_categories (name, allocated, fiscal_year) VALUES
    ('Equipment & Parts', 35000, 2026),
    ('Competition Travel', 25000, 2026),
    ('Workshop Materials', 10000, 2026),
    ('Marketing & Media', 8000, 2026),
    ('Events & Logistics', 12000, 2026),
    ('Miscellaneous', 5000, 2026);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUMMARY:
--   57 original members migrated (hashed passwords)
--   2 club-level leaders (president + VP)
--   14 department leaders (7 leaders + 7 vice leaders)
--   4 sub-leaders (example, add more as needed)
--   = 77 total users
--
-- IMPORTANT: Replace placeholder leader names with real names!
-- IMPORTANT: Force password change on first real deployment!
-- ═══════════════════════════════════════════════════════════════════════════════
