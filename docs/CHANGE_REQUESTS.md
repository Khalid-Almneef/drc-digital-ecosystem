# Change Requests — leader-approval pipeline

Members of a department can see and work on their committee's dashboard, but
"big" changes need leader approval. This doc shows how the pipeline is wired
and how to add a new approval-gated action.

## Definitions

A **change request** is a proposed mutation that's been queued for a leader
to approve or reject. Approval applies the mutation server-side; rejection
just notifies the requester (no reason field — that's an explicit product
choice).

A mutation is "big" when:

- It's visible outside the immediate workspace (announcements, public posts).
- It's destructive (deleting projects, removing members).
- It moves money (budget allocations, expense decisions).
- It crosses departments (deciding service requests from other depts).
- It has HR-sensitive blast radius (member status, MOTM).

Anything else members can do directly. Reading is always direct.

## Architecture

### Database (`database/021_change_requests.sql`)

```
change_requests(
  request_id, request_type, department_id, requester_id, target_id,
  payload jsonb, summary, status, decided_by, decided_at, applied_at,
  apply_error, created_at, updated_at
)
```

- `request_type` is a free-form string identifying which apply handler runs.
- `payload` is the exact JSON body that would have gone to the original endpoint.
- `target_id` is the entity being edited or deleted (NULL for pure creates).
- `status` lifecycle: `pending → approved → applied` (or `apply_failed`),
  or `pending → rejected`.

### API

| Endpoint | Method | Who | What |
|---|---|---|---|
| `/api/change-requests?scope=mine` | GET | Member | Their own requests, any status |
| `/api/change-requests?scope=inbox` | GET | Leaders | Pending requests for their dept |
| `/api/change-requests` | POST | Member | Create a request directly (rare; usually the original endpoint creates it for you) |
| `/api/change-requests/[id]` | PATCH | Leaders | `{ decision: "approved" \| "rejected" }` |

Approving runs the registered apply handler. On success the row goes to
`applied`, on failure to `apply_failed` with the error in `apply_error`.

### Helpers (`src/lib/change-requests.ts`)

- `submitChangeRequest({ type, departmentId, requesterId, targetId, payload, summary })` —
  inserts the row and fans out a notification to the responsible department's leadership.
- `registerChangeRequestHandler(type, handler)` — registers an apply handler.
- `notifyRequesterDecision(requesterId, requestId, summary, decision)` — sends
  the requester a notification when their request is approved/rejected/failed.

### UI (`src/components/dashboard/ChangeRequestInbox.tsx`)

Self-scoping component:
- Members see their own submissions (status, decision, errors).
- Leaders see incoming requests with Approve/Reject buttons.

Drop it into any dashboard tab.

## Adding a new approval-gated action

Worked example (announcements is already done — use it as a template):

### 1. Pick a `request_type` and add it to the union

`src/lib/change-requests.ts`:

```ts
export type ChangeRequestType =
  | "post_announcement"
  | "create_project"   // ← add the new one
  | "system";
```

### 2. Register an apply handler

`src/lib/change-request-handlers.ts`:

```ts
registerChangeRequestHandler("create_project", async ({ payload, decidedById, requesterId }) => {
  const data = payload as unknown as CreateProjectPayload;
  // Run the same INSERT the original endpoint would have run, attributing to
  // the original requester (or to decidedById, your choice — pick what makes
  // sense for the audit trail).
  await query(
    `INSERT INTO projects (...) VALUES (...)`,
    [/* fields from data, lead_member_id = data.originalLeadId ?? requesterId */],
  );
});
```

The handler must throw on failure — the API catches and marks the request
`apply_failed` with the error.

### 3. Gate the original endpoint

In the route that performed the mutation directly, gate on position:

```ts
const canDoDirectly =
  s.position === "president" ||
  s.position === "vice_president" ||
  s.position === "dept_leader" ||
  s.position === "dept_vice_leader";

if (!canDoDirectly) {
  if (!s.departmentId) return err(403, "No department leadership to route to");
  const requestId = await submitChangeRequest({
    type: "create_project",
    departmentId: s.departmentId,
    requesterId: s.memberId,
    payload: { ...body, originalLeadId: s.memberId },
    summary: `Create project: "${body.title}"`,
  });
  return ok({ requestId, requiresApproval: true }, { status: 202 });
}

// existing leader-only logic continues unchanged
```

That's it. The same frontend "Create project" button works for everyone — it
just gets a 202 + queued notification when a non-leader clicks it. The leader
inbox shows the pending request with the same payload they would have sent.

## Opting out (when something seems "big" but isn't)

Some mutations look big but are actually scoped to the requester:

- **Updating my own profile** — direct.
- **Submitting a service request** — direct (the *decision* on the receiving
  end is what's gated, not the submission).
- **Logging volunteer hours** — direct (HR's *approval* of those hours is the
  gated step).

When in doubt: if the action is reversible by a single person, makes nothing
public, and doesn't move resources between people, leave it direct.

## Notifications wired

| Event | Recipient |
|---|---|
| Member submits a request | Every leader/vice-leader of the responsible dept |
| Leader approves & it applies | The original requester |
| Leader rejects | The original requester (no reason given) |
| Approval but apply failed | The original requester (with error message) |

All flow through the existing notifications inbox (`<NotificationPanel>` in
the sidebar bell).

## Currently wired

- `post_announcement` (canonical example — see
  `src/app/api/announcements/route.ts` for the gate, and
  `src/lib/change-request-handlers.ts` for the handler)

## Suggested follow-ups (mechanical pattern application)

Each of these is one apply handler + one gate in the existing endpoint:

- `create_project` / `delete_project` (`/api/projects`)
- `decide_service_request` (`/api/service-requests/[id]` PATCH)
- `create_sponsor` / `update_sponsor` / `delete_sponsor` (`/api/sponsors`)
- `set_member_status` / `set_team_visibility` (`/api/members/[id]/team-visibility`)
- `decide_expense` (`/api/expenses/[id]/approve`)
- `set_motm` (`/api/members/month` POST)

Each takes ~15 lines (handler) + ~10 lines (route gate). Total: less than a
day for the rest of the surface.
