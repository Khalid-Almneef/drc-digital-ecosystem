# Event Approval Workflow — Design

**Date:** 2026-05-06
**Status:** Approved (pending implementation)
**Goal:** Let any department leader create event drafts; HR reviews, edits, approves, or rejects them. Approved events appear on the public `/events` page.

---

## 1. Lifecycle

```
[create] → draft ──submit──→ pending_review ──approve──→ approved
                                  ↑                          │
                                  └──── edit-sensitive ──────┘
                                  (date, location, credit_hours, etc.)

  draft / pending_review / approved ──reject──→ [DELETED + notify creator]
```

**Persistent states:** `draft`, `pending_review`, `approved`.
"Rejected" is **not stored** — rejection deletes the row and sends a notification carrying the reason.

`is_published` is derived from `status` (always `status = 'approved'`). Kept as a column so the existing public query keeps working, but writes always come through status transitions.

---

## 2. Data model

Migration `018_event_approval.sql`:

```sql
CREATE TYPE event_status AS ENUM ('draft', 'pending_review', 'approved');

ALTER TABLE events
  ADD COLUMN status event_status NOT NULL DEFAULT 'draft',
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN approved_at  timestamptz,
  ADD COLUMN approved_by  int REFERENCES members(member_id),
  ADD COLUMN hosting_department_slug text NOT NULL DEFAULT 'executive';

-- Backfill existing rows: anything previously is_published = true is 'approved'.
UPDATE events SET status = 'approved', approved_at = NOW()
  WHERE is_published = true;

-- Keep is_published in sync via trigger so legacy code paths still work.
CREATE OR REPLACE FUNCTION sync_event_is_published() RETURNS trigger AS $$
BEGIN
  NEW.is_published := (NEW.status = 'approved');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER events_sync_is_published
  BEFORE INSERT OR UPDATE OF status ON events
  FOR EACH ROW EXECUTE FUNCTION sync_event_is_published();

CREATE INDEX events_status_idx ON events (status);
```

Mock-mode (`src/lib/mock-store.ts`): mirror the same fields on the `Event` type, default `status='draft'`, derive `isPublished` in the helper that returns events.

### Sensitive vs. non-sensitive fields

Editing **sensitive** fields on an approved event flips `status` back to `pending_review`:
`title`, `startTime`, `endTime`, `location`, `creditHours`, `seatsAvailable`, `maxTeamSize`.

Editing **non-sensitive** fields keeps the event approved:
`description`, `imageUrl`, `requirements`, `category`.

---

## 3. API

### `POST /api/events`
- Any leader.
- Forces `status='draft'`, `hosting_department_slug = session.departmentSlug`.
- Returns the new row.

### `GET /api/events`
- **No session** (public): `WHERE status='approved'`.
- **Leader, non-HR**: own-dept rows in any status + all `status='approved'`.
- **HR leader**: all rows.
- Response includes `status` and `hostingDepartmentSlug`.

### `PATCH /api/events/[id]`
- **Creator or same-dept leader**:
  - In `draft`: any field editable.
  - In `approved`: non-sensitive editable freely; sensitive triggers `status → pending_review`, clears `approved_at` / `approved_by`.
  - In `pending_review`: forbidden (must wait or be re-opened by HR).
- **HR leader**: any field, any state. HR-edit-then-approve is one atomic PATCH that sets `status='approved'`, `approved_at`, `approved_by`.

### `POST /api/events/[id]/submit`
- Creator or same-dept leader. `draft → pending_review`. Sets `submitted_at = NOW()`.

### `POST /api/events/[id]/approve`
- HR leader only. `pending_review → approved`. Sets `approved_at`, `approved_by`. Sends notification to `created_by`.

### `DELETE /api/events/[id]`
- Body: `{ reason?: string }`.
- HR: hard-delete from any state; if `reason` provided, send notification to creator with the reason ("rejection").
- Creator on own draft: hard-delete, no notification.
- Anyone else: 403.

### Notifications (using existing `notifications` API)
Only two events fire notifications, both to the event creator:
- `event_approved` — when HR approves.
- `event_rejected` — when HR deletes with a reason.

`linkUrl` points to `/dashboard/events`.

---

## 4. UI

### `/dashboard/events` — new route, all leaders

Sidebar entry "Events" (calendar icon), visible whenever `session.isLeader`.

**Top-level tabs:** `My Drafts` · `Pending Review` · `Approved`

- "+ Create Event" button (top-right) → modal with current event fields. Save → `POST /api/events` creates a draft.
- **Draft card:** badge ⚪ Draft. Actions: `Edit`, `Submit for Review`, `Delete`.
- **Pending card:** badge 🟡 Awaiting HR. Read-only preview.
- **Approved card:** badge 🟢 Live. Actions: `Edit`. Sensitive-field edit shows an inline warning: "Changing date/location/credit hours will send this back to HR for re-approval."

ESC closes modal (`useEscape`). Tabs use `role="tablist"`/`role="tab"`/`aria-selected`. All strings bilingual via `tr(en, ar)`.

### `/dashboard/hr` — new "Event Requests" tab

Mirrors the Workshop Requests UX.

- Filter chips: `Pending Review` (default) · `Approved` · `Drafts`.
- Row: title · hosting dept · start date · creator avatar+name · actions.
- Actions on a pending row: `Edit & Approve` (opens edit modal, save = approve), `Approve`, `Reject`.
- Reject opens an inline reason textarea, then a bilingual confirm, then `DELETE /api/events/[id]?reason=…`.

### Public `/events`

No code change. Continues to call `GET /api/events` without a session, which now filters `status='approved'`.

---

## 5. Permissions helper

Add to `src/lib/auth.ts`:

```ts
export function isHrLeader(session: Session): boolean {
  return session.isLeader && session.departmentSlug === "hr";
}
```

Used by approve/reject endpoints and to gate the HR-only tab.

---

## 6. File touch list

- `migrations/018_event_approval.sql` (new)
- `src/lib/mock-store.ts` (event type + seed updates)
- `src/lib/auth.ts` (`isHrLeader`)
- `src/app/api/events/route.ts` (GET filter, POST defaults)
- `src/app/api/events/[id]/route.ts` (existing or new — PATCH + DELETE)
- `src/app/api/events/[id]/submit/route.ts` (new)
- `src/app/api/events/[id]/approve/route.ts` (new)
- `src/app/dashboard/events/page.tsx` (new route)
- `src/app/dashboard/hr/page.tsx` (new "Event Requests" tab + inbox component)
- `src/app/(dashboard)/_components/Sidebar.tsx` (add Events link — find actual path during impl)
- `src/lib/i18n` / `LanguageContext.tsx` (status labels, action verbs)

---

## 7. Acceptance criteria

1. A non-HR leader can: create a draft, edit it freely, submit it, see it in "Pending Review", and stop being able to edit it.
2. HR sees the submitted event in the "Event Requests" tab. HR can edit any field, then approve in one step.
3. On approve: creator receives a notification linking to `/dashboard/events`; the event appears on public `/events`.
4. HR rejects with a reason → row is deleted; creator receives a notification carrying the reason; event is gone from everywhere.
5. After approval, leader edits the description → still approved, still live.
6. After approval, leader edits the start time → status flips to `pending_review`, public site no longer shows it, HR sees it again in the inbox.
7. Public `/events` only shows `status='approved'` rows; works without a session.
8. All UI strings render correctly in EN and AR; layout flips RTL.
9. `npx tsc --noEmit` and `npx next build --webpack` both pass.

---

## 8. Out of scope

- Comments / change-request threads.
- Per-field audit log.
- Email notifications (only in-app via existing notifications system).
- Auto-publish on a schedule (e.g., "publish at startTime - 1 week").
- Re-review notifications to HR (HR uses the inbox tab; minimal-notification model).
