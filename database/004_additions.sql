-- ═══════════════════════════════════════════════════════════════════════════════
-- DRC Digital Ecosystem — Schema Additions
-- Run AFTER 001_schema.sql (and 002/003 if applicable).
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. WORKSHOPS (separate from events; administered by development leaders)
CREATE TABLE IF NOT EXISTS workshops (
    workshop_id     SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    title_ar        VARCHAR(255),
    description     TEXT,
    description_ar  TEXT,
    category        VARCHAR(100),
    presenter       VARCHAR(255),
    duration_min    INTEGER,
    video_url       TEXT,
    thumbnail_url   TEXT,
    recorded_date   DATE,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_workshops_updated
    BEFORE UPDATE ON workshops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_workshops_published ON workshops (is_published) WHERE is_published = TRUE;

-- 2. SITE CONTENT (editable by admin + innovation leaders)
-- Key-value store for mission, vision, about page text, homepage stats, etc.
CREATE TABLE IF NOT EXISTS site_content (
    content_key     VARCHAR(100) PRIMARY KEY,
    value_en        TEXT,
    value_ar        TEXT,
    value_json      JSONB,                        -- For structured content (stats, lists)
    description     VARCHAR(255),                 -- Admin hint
    updated_by      INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_site_content_updated
    BEFORE UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default content keys
INSERT INTO site_content (content_key, value_en, value_ar, description) VALUES
    ('about.mission',      'To empower students through digital innovation.', 'تمكين الطلاب من خلال الابتكار الرقمي.', 'Club mission statement'),
    ('about.vision',       'Be the leading university digital club in the region.', 'أن نكون النادي الرقمي الجامعي الرائد في المنطقة.', 'Club vision statement'),
    ('about.founded_date', '2020-08-01', '2020-08-01', 'Club founding date')
ON CONFLICT (content_key) DO NOTHING;

INSERT INTO site_content (content_key, value_json, description) VALUES
    ('home.stats', '{"members": 50, "departments": 8, "events": 200, "projects": 6}', 'Homepage hero stats (override; if null fallback to live counts)')
ON CONFLICT (content_key) DO NOTHING;

-- 3. PROJECT FEATURED FLAG (innovation leaders toggle which appear on homepage)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects (is_featured) WHERE is_featured = TRUE;

-- 4. TEAM PAGE VISIBILITY (leaders toggle per-member)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public_on_team BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. USER DEVICES (remember confirmed devices for MFA-lite)
CREATE TABLE IF NOT EXISTS user_devices (
    device_id       SERIAL PRIMARY KEY,
    member_id       INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    device_token    VARCHAR(128) NOT NULL UNIQUE,  -- opaque identifier stored in cookie
    user_agent      TEXT,
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_member ON user_devices (member_id);

-- 6. EMAIL TOKENS (device confirmation + password reset)
CREATE TYPE email_token_purpose AS ENUM ('device_confirm', 'password_reset');

CREATE TABLE IF NOT EXISTS email_tokens (
    token_id        SERIAL PRIMARY KEY,
    member_id       INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,  -- sha256 of plaintext token
    purpose         email_token_purpose NOT NULL,
    payload         JSONB,                         -- e.g., { deviceToken: "..." }
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_member ON email_tokens (member_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON email_tokens (expires_at) WHERE consumed_at IS NULL;

-- 7. APPLICATION → DEPARTMENT PREFERENCES (multi-select)
CREATE TABLE IF NOT EXISTS application_department_preferences (
    application_id  INTEGER NOT NULL REFERENCES membership_applications(application_id) ON DELETE CASCADE,
    department_id   INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    rank            INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (application_id, department_id)
);

-- 8. MADARAT department seed (2 leaders, no members)
-- Depends on department_type enum; add value if missing.
DO $$ BEGIN
    ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'madarat';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO departments (slug, name, name_ar, description) VALUES
    ('madarat', 'Madarat Initiative', 'مبادرة مدارات', 'Special initiative led by two leaders; no general members.')
ON CONFLICT (slug) DO NOTHING;
