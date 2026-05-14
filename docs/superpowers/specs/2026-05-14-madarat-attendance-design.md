# Madarat — Registration Removal & Attendance Tracking

**Status:** draft
**Date:** 2026-05-14
**Owner:** Madarat dept leaders

## Problem

A Madarat session leader can publish a session, open registration, and see a list of registrants in the dashboard's RegistrationsModal (`src/app/dashboard/madarat/page.tsx:167`). Today that list is read-only. Leaders cannot:

1. Remove a registrant who they know will not attend or registered in error.
2. Record who actually showed up versus who no-showed.

Both gaps matter for capacity management (`max_registrants` blocks new sign-ups when full, even if half the list is junk) and for post-session reporting.

## Goals

- Let a Madarat leader hard-delete a registration row from the modal, freeing a seat against `max_registrants`.
- Let a Madarat leader mark each remaining registrant as Attended, No-show, or Unmarked, persisted to the DB.
- Keep the modal a single, scannable table — no new screen, no new tab.
- Preserve existing public POST behavior (self-serve registration) and existing leader gating.

## Non-goals

- Bulk actions (multi-select delete, bulk-mark-attended). Out of scope for v1.
- Self-service cancellation by the registrant. The public-facing flow is unchanged.
- Notification to the registrant when removed. Silent admin action.
- Attendance analytics, exports, or reporting dashboards. The data is captured; reporting comes later if asked.
- Soft-delete / audit log of removed rows. The user explicitly chose hard delete.

## Design

### Data model

Add one nullable column to `madarat_session_registrations`:

```sql
ALTER TABLE madarat_session_registrations
  ADD COLUMN IF NOT EXISTS attended BOOLEAN;
```

Semantics:

| value   | meaning   |
|---------|-----------|
| `NULL`  | Unmarked (default — leader hasn't decided yet) |
| `TRUE`  | Attended  |
| `FALSE` | No-show   |

Tri-state is intentional: an empty attendance column on a session that hasn't happened yet should not look like "everyone no-showed."

Hard delete uses `DELETE FROM madarat_session_registrations WHERE registration_id = $1 AND session_id = $2`. `ON DELETE CASCADE` from the session FK is already in place (`database/012_madarat_dashboard.sql:34`), so session deletion still wipes registrations.

Migration file: `database/migrations/019_madarat_attendance.sql`. Idempotent (`IF NOT EXISTS`). Also update the canonical schema in `database/012_madarat_dashboard.sql` so fresh installs pick it up.

### API

New file: `src/app/api/madarat/sessions/[id]/registrations/[regId]/route.ts`.

Both handlers call `await requireDeptLeaderOf(["madarat"])` first. Both validate that `regId` belongs to the `id` session (defense against a leader from another dept guessing IDs is not the concern — the auth guard handles that — but cross-session ID confusion is, so we filter by both).

**`PATCH`** — update attendance.

Body schema:
```ts
const PatchBody = z.object({
  attended: z.union([z.boolean(), z.null()]),
});
```

Real-DB path:
```sql
UPDATE madarat_session_registrations
   SET attended = $1
 WHERE registration_id = $2 AND session_id = $3
RETURNING registration_id;
```
Returns `404` if no row updated, `200 { success: true }` otherwise.

Mock path: locate by `registrationId` in `getMockStore().madaratRegistrations`, set `attended`, return success.

**`DELETE`** — hard delete.

Real-DB path:
```sql
DELETE FROM madarat_session_registrations
 WHERE registration_id = $1 AND session_id = $2
RETURNING registration_id;
```
Returns `404` if nothing deleted, `200 { success: true }` otherwise.

Mock path: splice from `madaratRegistrations`.

**Existing GET** (`.../registrations/route.ts`): extend the SQL `SELECT` and the mock map to include `attended`. Update the existing `MadaratRegistration` type in the dashboard page accordingly.

No rate limiting on leader actions — these are authenticated admin operations, consistent with how other leader endpoints (`PATCH /api/madarat/sessions/[id]`) are unthrottled.

### UI — `RegistrationsModal`

A new rightmost "Status" column. For each row, two segmented pill buttons followed by a delete icon button.

```
[ Attended ] [ No-show ]   🗑
```

Behavior:

- Both pills off (unmarked) → both rendered in muted/outline style.
- Click "Attended" → pill turns success-green, "No-show" stays muted. PATCH `{ attended: true }`.
- Click "No-show" → pill turns danger-red, "Attended" stays muted. PATCH `{ attended: false }`.
- Click the active pill again → PATCH `{ attended: null }`, both pills return to muted.
- All PATCH calls are optimistic via SWR `mutate(..., false)`; on failure revert and surface a toast.

Delete icon (`Trash2` from `lucide-react`):

- Opens an inline confirm — either a small AlertDialog (if already available in the repo) or the existing modal pattern. The confirm text must include the registrant's full name and email so a leader can't misclick: `Remove ${fullName} (${email})? This cannot be undone.`
- On confirm: DELETE the row, SWR-mutate the list to drop it, show a success toast (`tr("Registrant removed", "تم حذف المسجّل")`).

The "Status" column appears for leaders only — but the modal is already leader-only (the page is under `/dashboard/madarat`, and the API enforces `requireDeptLeaderOf`). No additional gating needed in the component.

Visual reference: the segmented attendance control should reuse the existing dashboard pill styles (see how toggles render at `src/app/dashboard/madarat/page.tsx:694` for the open-registration toggle, and any pill-button pattern already in use in the dashboard surface). If no segmented control exists yet, build a small local component `<AttendancePills value={attended} onChange={...} />` inside this file — do not add a new shared component just for two pills.

### Mock store

In `src/lib/mock-store.ts`:

- Add `attended: boolean | null` to `MockMadaratRegistration` (`src/lib/mock-store.ts:368`).
- Seed rows default to `attended: null`.

### i18n

New strings (EN / AR) in `RegistrationsModal`:

| key            | EN             | AR              |
|----------------|----------------|-----------------|
| status header  | Status         | الحالة          |
| attended pill  | Attended       | حضر             |
| no-show pill   | No-show        | لم يحضر         |
| remove button  | Remove         | حذف             |
| confirm title  | Remove registrant? | حذف المسجّل؟ |
| confirm body   | Remove {name} ({email})? This cannot be undone. | حذف {name} ({email})؟ لا يمكن التراجع. |
| success toast  | Registrant removed | تم حذف المسجّل |

Strings stay inline with the existing `tr(en, ar)` pattern in this file — no new translation infra.

## Error handling

- PATCH/DELETE return `404` for unknown `regId` or mismatched `sessionId` — UI surfaces a toast and re-fetches the list.
- Auth failures bubble through `requireDeptLeaderOf` (existing pattern, returns 401/403).
- Network failure on optimistic PATCH: revert local state, show toast "Could not update attendance".

## Testing

Manual:

1. As a Madarat leader, open the registrations modal for a session with 3+ registrants.
2. Mark one Attended → reload → still Attended.
3. Mark a second No-show → click No-show again → returns to unmarked, reload confirms.
4. Delete the third → row disappears, total count in the parent table decrements, seat freed (verify by registering a new person if cap was hit).
5. With `MOCK_MODE=true`, repeat steps 1–4 against the mock store.
6. As a non-leader (e.g. a regular member), confirm DELETE/PATCH respond 401/403.

No automated tests are required for this change; the project does not have a Madarat dashboard test harness today and adding one is out of scope. (If that changes during planning, revisit.)

## Rollout

- Single migration, additive nullable column → safe to deploy alongside the code in one commit/PR.
- No data backfill: existing rows are `NULL` (unmarked), which is the correct historical state.

## Files touched

- `database/migrations/019_madarat_attendance.sql` (new)
- `database/012_madarat_dashboard.sql` (update canonical schema)
- `src/app/api/madarat/sessions/[id]/registrations/route.ts` (GET returns `attended`)
- `src/app/api/madarat/sessions/[id]/registrations/[regId]/route.ts` (new — PATCH + DELETE)
- `src/app/dashboard/madarat/page.tsx` (extend `MadaratRegistration` type; expand RegistrationsModal with Status column + confirm dialog)
- `src/lib/mock-store.ts` (extend `MockMadaratRegistration`; mock PATCH/DELETE branches handled inline in the route)
