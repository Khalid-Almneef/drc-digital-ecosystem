-- Finance workflow: department budgets + purchase requests in dedicated tables

CREATE TABLE IF NOT EXISTS finance_department_budgets (
    budget_id        SERIAL PRIMARY KEY,
    department_id    INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    fiscal_year      INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    allocated        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (allocated >= 0),
    note             TEXT,
    distributed_at   TIMESTAMPTZ,
    distributed_by   INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (department_id, fiscal_year)
);

CREATE TABLE IF NOT EXISTS finance_department_budget_history (
    history_id        SERIAL PRIMARY KEY,
    budget_id         INTEGER NOT NULL REFERENCES finance_department_budgets(budget_id) ON DELETE CASCADE,
    department_id     INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    fiscal_year       INTEGER NOT NULL,
    previous_allocated NUMERIC(12,2),
    new_allocated     NUMERIC(12,2) NOT NULL CHECK (new_allocated >= 0),
    note              TEXT,
    changed_by        INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_purchase_requests (
    request_id         SERIAL PRIMARY KEY,
    department_id      INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    title              VARCHAR(255) NOT NULL,
    description        TEXT,
    amount_requested   NUMERIC(12,2) NOT NULL CHECK (amount_requested > 0),
    approved_amount    NUMERIC(12,2) CHECK (approved_amount >= 0),
    currency           VARCHAR(3) NOT NULL DEFAULT 'SAR',
    category           VARCHAR(120) NOT NULL,
    priority           VARCHAR(16) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    status             VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'purchasing', 'fulfilled', 'rejected')),
    requested_by       INTEGER NOT NULL REFERENCES users(member_id) ON DELETE RESTRICT,
    requested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    needed_by          DATE,
    assigned_to_name   VARCHAR(255),
    assigned_at        TIMESTAMPTZ,
    finance_note       TEXT,
    fulfilled_at       TIMESTAMPTZ,
    decided_by         INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    decided_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_purchase_request_history (
    history_id                 SERIAL PRIMARY KEY,
    request_id                 INTEGER NOT NULL REFERENCES finance_purchase_requests(request_id) ON DELETE CASCADE,
    from_status                VARCHAR(16),
    to_status                  VARCHAR(16) NOT NULL,
    previous_approved_amount   NUMERIC(12,2),
    new_approved_amount        NUMERIC(12,2),
    previous_assigned_to_name  VARCHAR(255),
    new_assigned_to_name       VARCHAR(255),
    finance_note               TEXT,
    changed_by                 INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    changed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_finance_department_budgets_updated') THEN
        CREATE TRIGGER trg_finance_department_budgets_updated
            BEFORE UPDATE ON finance_department_budgets
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_finance_purchase_requests_updated') THEN
        CREATE TRIGGER trg_finance_purchase_requests_updated
            BEFORE UPDATE ON finance_purchase_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_finance_department_budgets_year ON finance_department_budgets (fiscal_year, department_id);
CREATE INDEX IF NOT EXISTS idx_finance_purchase_requests_department ON finance_purchase_requests (department_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_purchase_requests_requested_by ON finance_purchase_requests (requested_by, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_purchase_request_history_request ON finance_purchase_request_history (request_id, changed_at DESC);

WITH default_allocations(slug, allocated) AS (
    VALUES
        ('hr', 8000::numeric),
        ('development', 18000::numeric),
        ('innovation', 32000::numeric),
        ('media', 12000::numeric),
        ('pr', 14000::numeric),
        ('finance', 6000::numeric),
        ('logistics', 15000::numeric),
        ('madarat', 9000::numeric)
),
json_allocations AS (
    SELECT
        NULLIF(item->>'departmentSlug', '') AS slug,
        COALESCE(NULLIF(item->>'allocated', '')::numeric, 0) AS allocated,
        NULLIF(item->>'note', '') AS note,
        NULLIF(item->>'distributedAt', '')::timestamptz AS distributed_at
    FROM site_content sc
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sc.value_json, '[]'::jsonb)) AS item
    WHERE sc.content_key = 'finance.departmentBudgets'
),
source_allocations AS (
    SELECT
        d.department_id,
        EXTRACT(YEAR FROM CURRENT_DATE)::int AS fiscal_year,
        COALESCE(j.allocated, defaults.allocated, 0) AS allocated,
        j.note,
        j.distributed_at
    FROM departments d
    LEFT JOIN default_allocations defaults ON defaults.slug = d.slug::text
    LEFT JOIN json_allocations j ON j.slug = d.slug::text
    WHERE d.slug::text <> 'executive'
)
INSERT INTO finance_department_budgets (department_id, fiscal_year, allocated, note, distributed_at)
SELECT department_id, fiscal_year, allocated, note, distributed_at
FROM source_allocations
ON CONFLICT (department_id, fiscal_year) DO NOTHING;

WITH raw_requests AS (
    SELECT item
    FROM site_content sc
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sc.value_json, '[]'::jsonb)) AS item
    WHERE sc.content_key = 'finance.purchaseRequests'
),
fallback_decider AS (
    SELECT member_id
    FROM users
    WHERE position IN ('president', 'vice_president')
    ORDER BY member_id
    LIMIT 1
),
resolved_requests AS (
    SELECT
        d.department_id,
        COALESCE(NULLIF(item->>'title', ''), 'Untitled request') AS title,
        NULLIF(item->>'description', '') AS description,
        GREATEST(COALESCE(NULLIF(item->>'amountRequested', '')::numeric, 0.01), 0.01) AS amount_requested,
        CASE
            WHEN NULLIF(item->>'approvedAmount', '') IS NULL THEN NULL
            ELSE GREATEST((item->>'approvedAmount')::numeric, 0)
        END AS approved_amount,
        COALESCE(NULLIF(item->>'currency', ''), 'SAR') AS currency,
        COALESCE(NULLIF(item->>'category', ''), 'Operations') AS category,
        CASE
            WHEN item->>'priority' IN ('low', 'medium', 'high') THEN item->>'priority'
            ELSE 'medium'
        END AS priority,
        CASE
            WHEN item->>'status' IN ('pending', 'approved', 'purchasing', 'fulfilled', 'rejected') THEN item->>'status'
            ELSE 'pending'
        END AS status,
        COALESCE(requester.member_id, fallback_decider.member_id) AS requested_by,
        COALESCE(NULLIF(item->>'requestedAt', '')::timestamptz, NOW()) AS requested_at,
        NULLIF(item->>'neededBy', '')::date AS needed_by,
        NULLIF(item->>'assignedToName', '') AS assigned_to_name,
        NULLIF(item->>'assignedAt', '')::timestamptz AS assigned_at,
        NULLIF(item->>'financeNote', '') AS finance_note,
        NULLIF(item->>'fulfilledAt', '')::timestamptz AS fulfilled_at,
        CASE
            WHEN item->>'status' IN ('approved', 'purchasing', 'fulfilled', 'rejected')
                THEN fallback_decider.member_id
            ELSE NULL
        END AS decided_by,
        CASE
            WHEN item->>'status' IN ('approved', 'purchasing', 'fulfilled', 'rejected')
                THEN COALESCE(NULLIF(item->>'assignedAt', '')::timestamptz, NULLIF(item->>'requestedAt', '')::timestamptz, NOW())
            ELSE NULL
        END AS decided_at
    FROM raw_requests
    JOIN departments d
      ON d.slug::text = item->>'departmentSlug'
     AND d.slug::text <> 'executive'
    LEFT JOIN users requester
      ON requester.member_id = NULLIF(item->>'requestedBy', '')::int
    CROSS JOIN fallback_decider
)
INSERT INTO finance_purchase_requests (
    department_id,
    title,
    description,
    amount_requested,
    approved_amount,
    currency,
    category,
    priority,
    status,
    requested_by,
    requested_at,
    needed_by,
    assigned_to_name,
    assigned_at,
    finance_note,
    fulfilled_at,
    decided_by,
    decided_at
)
SELECT
    department_id,
    title,
    description,
    amount_requested,
    approved_amount,
    currency,
    category,
    priority,
    status,
    requested_by,
    requested_at,
    needed_by,
    assigned_to_name,
    assigned_at,
    finance_note,
    fulfilled_at,
    decided_by,
    decided_at
FROM resolved_requests
ON CONFLICT DO NOTHING;
