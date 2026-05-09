-- ═══════════════════════════════════════════════════════════════════════════════
-- DRC Digital Ecosystem — Production Database Schema
-- PostgreSQL 18+
--
-- This is a CLEAN schema. Run this on a fresh database.
-- For migrating from the old schema, see 002_migrate_from_old.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- For password hashing (gen_salt, crypt)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- For UUID generation

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Position = rank within a department (hierarchy)
CREATE TYPE user_position AS ENUM (
    'president',         -- Club president — full access to everything
    'vice_president',    -- Club VP — full access to everything
    'dept_leader',       -- Department leader — full access to own department
    'dept_vice_leader',  -- Department vice leader — full access to own department
    'sub_leader',        -- Sub-leader / team lead — manages a team within department
    'member'             -- Regular member — basic access
);

-- Department identity (which department the user belongs to)
CREATE TYPE department_type AS ENUM (
    'executive',     -- القيادة — President & VP
    'hr',            -- الموارد البشرية
    'development',   -- التطوير
    'innovation',    -- الابتكار والهندسة
    'media',         -- الإعلام
    'pr',            -- العلاقات العامة
    'finance',       -- المالية
    'logistics'      -- اللوجستية
);

CREATE TYPE application_status AS ENUM ('pending', 'interview', 'accepted', 'rejected');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE event_type AS ENUM ('workshop', 'competition', 'meetup', 'general');
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'testing', 'completed', 'archived');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE sponsor_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze');
CREATE TYPE sponsor_status AS ENUM ('active', 'pending', 'negotiating', 'expired', 'wanting_to_contact', 'contacted', 'in_process', 'valid', 'failed');
CREATE TYPE content_status AS ENUM ('draft', 'in_review', 'scheduled', 'published', 'archived');
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'retired');
CREATE TYPE announcement_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER: auto-update updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. DEPARTMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE departments (
    department_id   SERIAL PRIMARY KEY,
    slug            department_type NOT NULL UNIQUE,  -- machine-readable identifier
    name            VARCHAR(100) NOT NULL UNIQUE,
    name_ar         VARCHAR(100),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_departments_updated
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. USERS (authentication)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    member_id       SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,           -- bcrypt hash, NEVER plaintext
    position        user_position NOT NULL DEFAULT 'member',
    department_id   INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_position ON users (position);
CREATE INDEX idx_users_department ON users (department_id);
CREATE INDEX idx_users_active ON users (is_active) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. PROFILES (personal info, separate from auth)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE profiles (
    profile_id      SERIAL PRIMARY KEY,
    member_id       INTEGER NOT NULL UNIQUE REFERENCES users(member_id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    full_name_ar    VARCHAR(255),
    university_id   VARCHAR(50),
    phone_number    VARCHAR(20),
    major           VARCHAR(150),
    bio             TEXT,
    avatar_url      TEXT,
    linkedin_url    TEXT,
    github_url      TEXT,
    graduation_year INTEGER,
    status          VARCHAR(50) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'alumni', 'suspended')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_profiles_member ON profiles (member_id);
CREATE INDEX idx_profiles_status ON profiles (status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. MEMBERSHIP APPLICATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE membership_applications (
    application_id      SERIAL PRIMARY KEY,
    -- Applicant info (may not have a user account yet)
    applicant_name      VARCHAR(255) NOT NULL,
    applicant_email     VARCHAR(255) NOT NULL,
    university_id       VARCHAR(50),
    major               VARCHAR(150),
    phone_number        VARCHAR(20),
    preferred_department_id INTEGER REFERENCES departments(department_id),
    motivation          TEXT,
    skills              TEXT,
    -- Processing
    status              application_status NOT NULL DEFAULT 'pending',
    reviewed_by         INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    review_notes        TEXT,
    member_id           INTEGER REFERENCES users(member_id) ON DELETE SET NULL,  -- Set when accepted and account created
    applied_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    reviewed_date       DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_applications_updated
    BEFORE UPDATE ON membership_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_applications_status ON membership_applications (status);
CREATE INDEX idx_applications_email ON membership_applications (applicant_email);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. PROJECTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE projects (
    project_id      SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       TEXT,
    github_url      TEXT,
    category        VARCHAR(100),
    status          project_status NOT NULL DEFAULT 'planning',
    lead_member_id  INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    department_id   INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    tech_stack      TEXT[],           -- Array of technologies used
    start_date      DATE,
    target_end_date DATE,
    completed_date  DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_projects_updated
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_department ON projects (department_id);
CREATE INDEX idx_projects_lead ON projects (lead_member_id);

-- Junction table for M:N users <-> projects
CREATE TABLE project_members (
    project_id  INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    member_id   INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    role        VARCHAR(100) DEFAULT 'contributor',  -- e.g., lead, contributor, reviewer
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, member_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. TASKS (per-project task tracking)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE tasks (
    task_id         SERIAL PRIMARY KEY,
    project_id      INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          task_status NOT NULL DEFAULT 'todo',
    priority        task_priority NOT NULL DEFAULT 'medium',
    assigned_to     INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tasks_updated
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_assigned ON tasks (assigned_to);
CREATE INDEX idx_tasks_status ON tasks (status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. HACKATHONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE hackathons (
    hackathon_id    SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       TEXT,
    location        VARCHAR(255),
    event_date      DATE,
    end_date        DATE,
    category        VARCHAR(100),
    result          VARCHAR(255),    -- e.g., "1st Place", "Top 10"
    lead_member_id  INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_hackathons_updated
    BEFORE UPDATE ON hackathons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Junction: M:N users <-> hackathons
CREATE TABLE hackathon_participants (
    participant_id  SERIAL PRIMARY KEY,
    hackathon_id    INTEGER NOT NULL REFERENCES hackathons(hackathon_id) ON DELETE CASCADE,
    member_id       INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    external_name   VARCHAR(255),    -- For non-member participants
    role            VARCHAR(100),
    team_name       VARCHAR(255),
    UNIQUE (hackathon_id, member_id)
);

CREATE INDEX idx_hackathon_parts_hackathon ON hackathon_participants (hackathon_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. EVENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE events (
    event_id        SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       TEXT,
    type            event_type NOT NULL DEFAULT 'general',
    category        VARCHAR(100),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    location        VARCHAR(255),
    seats_available INTEGER,
    max_team_size   INTEGER DEFAULT 1,
    requirements    TEXT,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_events_updated
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_events_type ON events (type);
CREATE INDEX idx_events_start ON events (start_time);
CREATE INDEX idx_events_published ON events (is_published) WHERE is_published = TRUE;

-- Event registrations
CREATE TABLE event_registrations (
    registration_id     SERIAL PRIMARY KEY,
    event_id            INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    member_id           INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    registration_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attended            BOOLEAN DEFAULT FALSE,
    feedback            TEXT,
    team_name           VARCHAR(255),
    UNIQUE (event_id, member_id)
);

CREATE INDEX idx_event_regs_event ON event_registrations (event_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. VOLUNTEER HOURS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE volunteer_hours (
    volunthr_id         SERIAL PRIMARY KEY,
    member_id           INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    hours               NUMERIC(5,2) NOT NULL CHECK (hours > 0),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    participation_date  DATE NOT NULL,
    approved_by         INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    approval_status     approval_status NOT NULL DEFAULT 'pending',
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_volunteer_updated
    BEFORE UPDATE ON volunteer_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_volunteer_member ON volunteer_hours (member_id);
CREATE INDEX idx_volunteer_status ON volunteer_hours (approval_status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. SPONSORS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE sponsors (
    sponsor_id      SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    logo_url        TEXT,
    website_url     TEXT,
    tier            sponsor_tier NOT NULL DEFAULT 'bronze',
    amount          NUMERIC(12,2),
    currency        VARCHAR(3) NOT NULL DEFAULT 'SAR',
    status          sponsor_status NOT NULL DEFAULT 'wanting_to_contact',
    contact_name    VARCHAR(255),
    contact_email   VARCHAR(255),
    contract_start  DATE,
    contract_end    DATE,
    notes           TEXT,
    next_action     TEXT,
    last_contacted_at DATE,
    proposal_title  VARCHAR(255),
    proposal_body   TEXT,
    proposal_pdf_url TEXT,
    proposal_updated_at TIMESTAMPTZ,
    managed_by      INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sponsors_updated
    BEFORE UPDATE ON sponsors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_sponsors_status ON sponsors (status);
CREATE INDEX idx_sponsors_tier ON sponsors (tier);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. BUDGET / EXPENSES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE budget_categories (
    category_id     SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL UNIQUE,
    allocated       NUMERIC(12,2) NOT NULL DEFAULT 0,
    fiscal_year     INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
    expense_id      SERIAL PRIMARY KEY,
    category_id     INTEGER NOT NULL REFERENCES budget_categories(category_id) ON DELETE RESTRICT,
    description     VARCHAR(255) NOT NULL,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'SAR',
    receipt_url     TEXT,
    requested_by    INTEGER NOT NULL REFERENCES users(member_id) ON DELETE RESTRICT,
    approved_by     INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    approval_status approval_status NOT NULL DEFAULT 'pending',
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_expenses_updated
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_expenses_category ON expenses (category_id);
CREATE INDEX idx_expenses_status ON expenses (approval_status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. MEDIA & CONTENT
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE media_content (
    content_id      SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL CHECK (type IN ('post', 'story', 'reel', 'video', 'photo', 'article')),
    platform        VARCHAR(50) CHECK (platform IN ('instagram', 'twitter', 'linkedin', 'youtube', 'website', 'other')),
    description     TEXT,
    file_url        TEXT,
    scheduled_date  TIMESTAMPTZ,
    published_date  TIMESTAMPTZ,
    status          content_status NOT NULL DEFAULT 'draft',
    assigned_to     INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    views           INTEGER DEFAULT 0,
    likes           INTEGER DEFAULT 0,
    shares          INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_media_updated
    BEFORE UPDATE ON media_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_media_status ON media_content (status);
CREATE INDEX idx_media_platform ON media_content (platform);
CREATE INDEX idx_media_assigned ON media_content (assigned_to);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. ANNOUNCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE announcements (
    announcement_id SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    priority        announcement_priority NOT NULL DEFAULT 'medium',
    target_position user_position,       -- NULL = visible to all positions
    target_department_id INTEGER REFERENCES departments(department_id),
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ,
    created_by      INTEGER NOT NULL REFERENCES users(member_id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_announcements_updated
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_announcements_priority ON announcements (priority);
-- Note: cannot use NOW() in index predicate (must be IMMUTABLE). Index every
-- expires_at and let the query filter by NOW() at runtime.
CREATE INDEX idx_announcements_active ON announcements (expires_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. EQUIPMENT INVENTORY (lab / engineering)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE equipment (
    equipment_id    SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    status          equipment_status NOT NULL DEFAULT 'available',
    serial_number   VARCHAR(100),
    location        VARCHAR(150),
    current_user_id INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    last_maintained DATE,
    purchase_date   DATE,
    purchase_cost   NUMERIC(10,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_equipment_updated
    BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_equipment_status ON equipment (status);

-- Equipment checkout log
CREATE TABLE equipment_checkouts (
    checkout_id     SERIAL PRIMARY KEY,
    equipment_id    INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    member_id       INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    checked_out_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at     TIMESTAMPTZ,
    notes           TEXT
);

CREATE INDEX idx_checkouts_equipment ON equipment_checkouts (equipment_id);
CREATE INDEX idx_checkouts_active ON equipment_checkouts (returned_at) WHERE returned_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. AUDIT LOG (tracks sensitive operations)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
    log_id          BIGSERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,   -- e.g., 'login', 'role_change', 'member_approved'
    target_table    VARCHAR(100),
    target_id       INTEGER,
    details         JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log (user_id);
CREATE INDEX idx_audit_action ON audit_log (action);
CREATE INDEX idx_audit_created ON audit_log (created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 16. SESSIONS (for server-side session management)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE sessions (
    session_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,     -- SHA-256 hash of session token
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- Auto-clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 18. CORE DEPARTMENT SEED
-- ═══════════════════════════════════════════════════════════════════════════════
-- The 8 core departments every other migration / seed depends on. Idempotent.
-- The 9th department (madarat) is added by 004_additions.sql together with the
-- corresponding enum value.
INSERT INTO departments (slug, name, name_ar, description) VALUES
    ('innovation',  'Innovation & Engineering', 'لجنة الابتكار والهندسة', 'Hardware projects, prototypes, drones, and robotics'),
    ('development', 'Development',              'لجنة التطوير',            'Software, firmware, AI, and digital systems'),
    ('media',       'Media',                    'لجنة الإعلام',            'Content creation, photography, video, social media'),
    ('pr',          'Public Relations',         'لجنة العلاقات العامة',     'Sponsorships, outreach, partnerships'),
    ('hr',          'Human Resources',          'لجنة الموارد البشرية',     'Recruitment, onboarding, member development'),
    ('finance',     'Finance',                  'لجنة المالية',            'Budget management, procurement, financial planning'),
    ('logistics',   'Logistics',                'لجنة اللوجستية',           'Events, equipment, operations'),
    ('executive',   'Executive',                'القيادة',                 'Club president, VP, and strategic direction')
ON CONFLICT (slug) DO NOTHING;
