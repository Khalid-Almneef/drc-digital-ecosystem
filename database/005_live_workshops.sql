-- ═══════════════════════════════════════════════════════════════════════════════
-- DRC Digital Ecosystem — Live / Upcoming Workshops
-- Run AFTER 004_additions.sql.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Live/upcoming workshop sessions (separate from recorded workshops)
CREATE TABLE IF NOT EXISTS live_workshops (
    live_workshop_id    SERIAL PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    title_ar            VARCHAR(255),
    description         TEXT,
    description_ar      TEXT,
    presenter           VARCHAR(255),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    duration_min        INTEGER,
    location            VARCHAR(255),           -- room name or platform (e.g. "Room 204", "Zoom")
    meeting_url         TEXT,                   -- shown only to dev leaders (not on public page)
    max_registrants     INTEGER,                -- NULL = unlimited
    registration_open   BOOLEAN NOT NULL DEFAULT FALSE,
    is_published        BOOLEAN NOT NULL DEFAULT FALSE,
    created_by          INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_live_workshops_updated
    BEFORE UPDATE ON live_workshops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_live_workshops_scheduled    ON live_workshops (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_workshops_published    ON live_workshops (is_published, scheduled_at) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_live_workshops_registration ON live_workshops (registration_open) WHERE registration_open = TRUE;

-- Registration submissions (public, no account required)
CREATE TABLE IF NOT EXISTS live_workshop_registrations (
    registration_id     SERIAL PRIMARY KEY,
    live_workshop_id    INTEGER NOT NULL REFERENCES live_workshops(live_workshop_id) ON DELETE CASCADE,
    full_name           VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    university_id       VARCHAR(100),
    phone               VARCHAR(50),
    department          VARCHAR(100),
    notes               TEXT,
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (live_workshop_id, email)            -- prevent duplicate registration per email
);

CREATE INDEX IF NOT EXISTS idx_live_workshop_regs_workshop ON live_workshop_registrations (live_workshop_id);
CREATE INDEX IF NOT EXISTS idx_live_workshop_regs_email    ON live_workshop_registrations (email);
