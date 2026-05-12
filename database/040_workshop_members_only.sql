-- Workshop visibility:
--   members_only = FALSE → any site visitor can see the workshop on /workshops
--   members_only = TRUE  → only authenticated visitors can see the workshop
-- Default FALSE keeps existing behavior (public for everyone).
-- Applies to BOTH live (scheduled) workshops and recorded workshop libraries.

ALTER TABLE live_workshops
  ADD COLUMN IF NOT EXISTS members_only BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS members_only BOOLEAN NOT NULL DEFAULT FALSE;
