-- ═══════════════════════════════════════════════════════════════════════════════
-- DRC Security Policies
-- Row Level Security (RLS) + helper functions
-- Run AFTER 001_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Helper: Get current user info from session variable ─────────────────────
-- The app sets this via: SET LOCAL app.current_user_id = '58';

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::INTEGER;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_user_position()
RETURNS user_position AS $$
BEGIN
    RETURN (SELECT position FROM users WHERE member_id = current_app_user_id());
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_user_department()
RETURNS department_type AS $$
BEGIN
    RETURN (SELECT d.slug FROM users u JOIN departments d ON d.department_id = u.department_id WHERE u.member_id = current_app_user_id());
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user is club-level leadership (president or VP)
CREATE OR REPLACE FUNCTION is_club_leader()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_app_user_position() IN ('president', 'vice_president');
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user is any kind of leader (club or department level)
CREATE OR REPLACE FUNCTION is_any_leader()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_app_user_position() IN ('president', 'vice_president', 'dept_leader', 'dept_vice_leader', 'sub_leader');
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user has leadership access to a specific department
CREATE OR REPLACE FUNCTION has_dept_access(target_dept department_type)
RETURNS BOOLEAN AS $$
DECLARE
    pos user_position;
    dept department_type;
BEGIN
    pos := current_app_user_position();
    dept := current_app_user_department();
    -- President/VP can access all departments
    IF pos IN ('president', 'vice_president') THEN RETURN TRUE; END IF;
    -- Dept leaders can access their own department
    IF pos IN ('dept_leader', 'dept_vice_leader', 'sub_leader') AND dept = target_dept THEN RETURN TRUE; END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── Password verification function ─────────────────────────────────────────

-- "position" is a reserved-ish identifier in PG (it's a string function);
-- quoting it keeps the column name without confusing the parser inside
-- RETURNS TABLE().
CREATE OR REPLACE FUNCTION verify_password(p_email VARCHAR, p_password VARCHAR)
RETURNS TABLE(
    member_id INTEGER,
    "position" user_position,
    department_slug department_type,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.member_id, u.position, d.slug, u.is_active
    FROM users u
    LEFT JOIN departments d ON d.department_id = u.department_id
    WHERE u.email = p_email
      AND u.password_hash = crypt(p_password, u.password_hash)
      AND u.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Password change function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION change_password(
    p_member_id INTEGER,
    p_old_password VARCHAR,
    p_new_password VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    valid BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM users
        WHERE member_id = p_member_id
          AND password_hash = crypt(p_old_password, password_hash)
    ) INTO valid;

    IF NOT valid THEN RETURN FALSE; END IF;

    IF length(p_new_password) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters';
    END IF;

    UPDATE users
    SET password_hash = crypt(p_new_password, gen_salt('bf', 12))
    WHERE member_id = p_member_id;

    INSERT INTO audit_log (user_id, action, target_table, target_id)
    VALUES (p_member_id, 'password_change', 'users', p_member_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Admin password reset ────────────────────────────────────────────────────
-- Only president, VP, or HR dept_leader can reset passwords

CREATE OR REPLACE FUNCTION admin_reset_password(
    p_admin_id INTEGER,
    p_target_member_id INTEGER,
    p_new_password VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    admin_pos user_position;
    admin_dept department_type;
BEGIN
    SELECT u.position, d.slug INTO admin_pos, admin_dept
    FROM users u LEFT JOIN departments d ON d.department_id = u.department_id
    WHERE u.member_id = p_admin_id;

    -- Only president, VP, or HR leaders can reset
    IF admin_pos NOT IN ('president', 'vice_president') AND
       NOT (admin_pos IN ('dept_leader', 'dept_vice_leader') AND admin_dept = 'hr') THEN
        RAISE EXCEPTION 'Insufficient permissions to reset passwords';
    END IF;

    IF length(p_new_password) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters';
    END IF;

    UPDATE users
    SET password_hash = crypt(p_new_password, gen_salt('bf', 12))
    WHERE member_id = p_target_member_id;

    INSERT INTO audit_log (user_id, action, target_table, target_id, details)
    VALUES (p_admin_id, 'admin_password_reset', 'users', p_target_member_id,
            jsonb_build_object('reset_by', p_admin_id));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Position change with audit logging ──────────────────────────────────────
-- Only president can change positions

CREATE OR REPLACE FUNCTION change_user_position(
    p_admin_id INTEGER,
    p_target_member_id INTEGER,
    p_new_position user_position,
    p_new_department_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    admin_pos user_position;
    old_pos user_position;
    old_dept INTEGER;
BEGIN
    SELECT position INTO admin_pos FROM users WHERE member_id = p_admin_id;
    IF admin_pos NOT IN ('president', 'vice_president') THEN
        RAISE EXCEPTION 'Only president/VP can change positions';
    END IF;

    SELECT position, department_id INTO old_pos, old_dept
    FROM users WHERE member_id = p_target_member_id;

    UPDATE users
    SET position = p_new_position,
        department_id = COALESCE(p_new_department_id, department_id)
    WHERE member_id = p_target_member_id;

    INSERT INTO audit_log (user_id, action, target_table, target_id, details)
    VALUES (p_admin_id, 'position_change', 'users', p_target_member_id,
            jsonb_build_object(
                'old_position', old_pos::text,
                'new_position', p_new_position::text,
                'old_department_id', old_dept,
                'new_department_id', COALESCE(p_new_department_id, old_dept)
            ));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Login logging ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_login(p_member_id INTEGER, p_ip INET DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    UPDATE users SET last_login = NOW() WHERE member_id = p_member_id;
    INSERT INTO audit_log (user_id, action, ip_address)
    VALUES (p_member_id, 'login', p_ip);
END;
$$ LANGUAGE plpgsql;

-- ─── Approve volunteer hours ─────────────────────────────────────────────────
-- Club leaders or HR leaders can approve

CREATE OR REPLACE FUNCTION approve_volunteer_hours(
    p_approver_id INTEGER,
    p_volunthr_id INTEGER,
    p_status approval_status
) RETURNS BOOLEAN AS $$
DECLARE
    approver_pos user_position;
    approver_dept department_type;
BEGIN
    SELECT u.position, d.slug INTO approver_pos, approver_dept
    FROM users u LEFT JOIN departments d ON d.department_id = u.department_id
    WHERE u.member_id = p_approver_id;

    IF approver_pos NOT IN ('president', 'vice_president') AND
       NOT (approver_pos IN ('dept_leader', 'dept_vice_leader') AND approver_dept = 'hr') THEN
        RAISE EXCEPTION 'Only club leaders or HR leaders can approve volunteer hours';
    END IF;

    UPDATE volunteer_hours
    SET approval_status = p_status,
        approved_by = p_approver_id,
        approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END
    WHERE volunthr_id = p_volunthr_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ─── Process application ────────────────────────────────────────────────────
-- Club leaders or HR leaders can process

CREATE OR REPLACE FUNCTION process_application(
    p_reviewer_id INTEGER,
    p_application_id INTEGER,
    p_status application_status,
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    reviewer_pos user_position;
    reviewer_dept department_type;
    app_record RECORD;
    new_member_id INTEGER;
BEGIN
    SELECT u.position, d.slug INTO reviewer_pos, reviewer_dept
    FROM users u LEFT JOIN departments d ON d.department_id = u.department_id
    WHERE u.member_id = p_reviewer_id;

    IF reviewer_pos NOT IN ('president', 'vice_president') AND
       NOT (reviewer_pos IN ('dept_leader', 'dept_vice_leader') AND reviewer_dept = 'hr') THEN
        RAISE EXCEPTION 'Only club leaders or HR leaders can process applications';
    END IF;

    SELECT * INTO app_record FROM membership_applications WHERE application_id = p_application_id;

    UPDATE membership_applications
    SET status = p_status,
        reviewed_by = p_reviewer_id,
        review_notes = p_notes,
        reviewed_date = CURRENT_DATE
    WHERE application_id = p_application_id;

    IF p_status = 'accepted' THEN
        INSERT INTO users (email, password_hash, position, department_id, is_active)
        VALUES (
            app_record.applicant_email,
            crypt('Welcome2DRC!', gen_salt('bf', 12)),
            'member',
            app_record.preferred_department_id,
            TRUE
        )
        RETURNING member_id INTO new_member_id;

        INSERT INTO profiles (member_id, full_name, university_id, major, phone_number)
        VALUES (new_member_id, app_record.applicant_name, app_record.university_id,
                app_record.major, app_record.phone_number);

        UPDATE membership_applications SET member_id = new_member_id
        WHERE application_id = p_application_id;

        INSERT INTO audit_log (user_id, action, target_table, target_id, details)
        VALUES (p_reviewer_id, 'member_approved', 'membership_applications', p_application_id,
                jsonb_build_object('new_member_id', new_member_id));

        RETURN new_member_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Members directory (never exposes password_hash)
CREATE OR REPLACE VIEW v_members AS
SELECT
    u.member_id,
    u.email,
    u.position,
    u.is_active,
    u.last_login,
    u.created_at,
    p.full_name,
    p.full_name_ar,
    p.university_id,
    p.phone_number,
    p.major,
    p.bio,
    p.avatar_url,
    p.status AS profile_status,
    d.name AS department_name,
    d.name_ar AS department_name_ar,
    d.slug AS department_slug
FROM users u
LEFT JOIN profiles p ON p.member_id = u.member_id
LEFT JOIN departments d ON d.department_id = u.department_id;

-- Dashboard stats
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_active_members,
    (SELECT COUNT(*) FROM projects WHERE status IN ('planning', 'in_progress', 'testing')) AS active_projects,
    (SELECT COUNT(*) FROM events WHERE start_time > NOW()) AS upcoming_events,
    (SELECT COUNT(*) FROM membership_applications WHERE status = 'pending') AS pending_applications,
    (SELECT COUNT(*) FROM tasks WHERE status IN ('todo', 'in_progress')) AS open_tasks,
    (SELECT COALESCE(SUM(amount), 0) FROM sponsors WHERE status IN ('active', 'valid')) AS total_sponsorship;

-- Department overview with leadership breakdown
CREATE OR REPLACE VIEW v_department_overview AS
SELECT
    d.department_id,
    d.slug,
    d.name,
    d.name_ar,
    (SELECT p.full_name FROM users u2 JOIN profiles p ON p.member_id = u2.member_id
     WHERE u2.department_id = d.department_id AND u2.position = 'dept_leader' LIMIT 1) AS leader_name,
    (SELECT p.full_name FROM users u2 JOIN profiles p ON p.member_id = u2.member_id
     WHERE u2.department_id = d.department_id AND u2.position = 'dept_vice_leader' LIMIT 1) AS vice_leader_name,
    (SELECT COUNT(*) FROM users u3 WHERE u3.department_id = d.department_id AND u3.position = 'sub_leader' AND u3.is_active = TRUE) AS sub_leader_count,
    (SELECT COUNT(*) FROM users u3 WHERE u3.department_id = d.department_id AND u3.is_active = TRUE) AS member_count,
    (SELECT COUNT(*) FROM projects pr WHERE pr.department_id = d.department_id AND pr.status IN ('planning', 'in_progress', 'testing')) AS active_projects
FROM departments d;

-- Department hierarchy — who leads what
CREATE OR REPLACE VIEW v_leadership AS
SELECT
    u.member_id,
    p.full_name,
    p.full_name_ar,
    u.position,
    d.name AS department_name,
    d.name_ar AS department_name_ar,
    d.slug AS department_slug,
    u.email
FROM users u
JOIN profiles p ON p.member_id = u.member_id
JOIN departments d ON d.department_id = u.department_id
WHERE u.position IN ('president', 'vice_president', 'dept_leader', 'dept_vice_leader', 'sub_leader')
  AND u.is_active = TRUE
ORDER BY
    CASE u.position
        WHEN 'president' THEN 1
        WHEN 'vice_president' THEN 2
        WHEN 'dept_leader' THEN 3
        WHEN 'dept_vice_leader' THEN 4
        WHEN 'sub_leader' THEN 5
    END,
    d.name;
