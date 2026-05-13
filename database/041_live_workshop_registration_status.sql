-- Live workshop registration approval flow.
--
-- Adds a `status` column to live_workshop_registrations so dev leadership can
-- accept or reject pending registrations. Allowed values are constrained at the
-- column level (CHECK, not an enum) so we can evolve cheaply later.
--
-- Backfill: every existing row is set to 'accepted' so anyone already
-- registered before this migration ran does NOT see their status suddenly flip
-- to "rejected" or "pending" on the public /workshops page.

ALTER TABLE live_workshop_registrations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Backfill any rows that pre-existed the default (defensive — the DEFAULT only
-- applies to new rows, but in case the column already existed we still want
-- non-pending historic rows to be marked accepted).
UPDATE live_workshop_registrations
   SET status = 'accepted'
 WHERE status IS NULL
    OR status NOT IN ('pending', 'accepted', 'rejected');

-- Mark anything created before this migration as accepted (existing behaviour).
UPDATE live_workshop_registrations
   SET status = 'accepted'
 WHERE status = 'pending'
   AND registered_at < NOW();

-- Constrain to the allowed values. Drop first in case a prior partial run added
-- a different version of the constraint.
ALTER TABLE live_workshop_registrations
  DROP CONSTRAINT IF EXISTS live_workshop_registrations_status_check;

ALTER TABLE live_workshop_registrations
  ADD CONSTRAINT live_workshop_registrations_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_live_workshop_registrations_status
  ON live_workshop_registrations(live_workshop_id, status);
