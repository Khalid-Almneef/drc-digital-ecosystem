# Leader-only task/project create + multi-assign + subtasks

**Date:** 2026-05-15
**Author:** Khalid (with Claude)
**Status:** Draft

## Problem

Today any signed-in member can create projects (if they are project lead) and
tasks (depending on dashboard surface). Members are also overloaded with create
affordances they shouldn't see. Tasks support exactly one assignee, and there
is no way to break a task into smaller pieces.

## Goals

1. **Lock down create.** Only leaders can create projects and tasks. Members
   only consume what's assigned to them.
2. **Multi-assign by auto-clone.** A leader picks N members; the system creates
   N tasks, one per assignee. No schema change.
3. **One level of subtasks.** Project tasks can have subtasks. Subtasks cannot
   themselves have subtasks.
4. **Polish.** Apply a `ui-ux-pro-max` review pass to every surface this
   session touched.

## Non-goals

- Arbitrary subtask nesting.
- Real many-to-many assignment (junction table) — explicitly rejected in favor
  of auto-clone.
- Reassigning a subtask's parent after creation — keep parent fixed.
- Changing the existing single-assignee field on the `tasks` table.

## Definition of "leader"

`position` is in:
- `president`
- `vice_president`
- `dept_leader`
- `dept_vice_leader`
- `sub_leader`

Anyone with `position === "member"` is a regular member and cannot create.

## Permission lockdown

### API

| Endpoint | Today | After |
|---|---|---|
| `POST /api/projects` | president / vp / dept_leader / dept_vice_leader | unchanged (already leader-only) |
| `POST /api/projects/[id]/tasks` | club lead, dept manager of project, **OR project lead (even if member)** | club lead OR dept manager only — drop the `ownsResource` bypass |
| `POST /api/tasks` | `canManageDepartmentTasks` (leader of that dept) | unchanged (already leader-only) |
| `POST /api/madarat/tasks` | `requireDeptLeaderOf(["madarat"])` | unchanged |
| `POST /api/volunteer-hour-tasks` | HR admin / HR leader | unchanged |

The only API change is dropping the `ownsResource` bypass in
`POST /api/projects/[id]/tasks` so a regular member who happens to be project
lead can no longer create project tasks.

### UI

A small `useIsLeader()` hook reads `position` from the session and returns
true for any non-`member`. Hide or disable these buttons when it returns false:

- `/dashboard/innovation/projects/[id]` → "New Task" button
- `/dashboard/innovation/projects/[id]` → "+ Subtask" buttons (new in this work)
- `/dashboard/innovation/projects/[id]` → project edit / member assign buttons (these are already gated by `canAccessDept` + `isClubLeader`, but verify)
- `/dashboard/innovation` → "New Project" button (currently lives in the dashboard; verify and gate if missing)
- `/dashboard/madarat` → "Create Support Task" form
- `/dashboard/media` → "New Task" button
- `/dashboard/hr` → "Create Hour Task" form

When hidden, show no UI at all — don't render disabled stubs that hint at
"you can't do this".

## Multi-assign (auto-clone)

UI changes in three forms:
- Madarat support task form
- Media kanban inline task form
- Innovation/Dev `TaskFormModal`

Replace the single `<select>` for assignee with a multi-select chip control:
- Pill list of selected members with × to remove
- Type-ahead search dropdown for adding
- "Selected: 3" counter

On submit, one POST per selected assignee, fired in parallel via
`Promise.allSettled`. Toast reports `created N · failed M` (M is usually 0).
The form clears only on full success; on partial failure, the surviving
selection stays so the leader can retry.

If only one assignee is selected, behavior is identical to today.

## Subtasks

**Scope:** Subtasks only apply to project tasks (Innovation/Development).
Madarat support tasks, Media kanban tasks, and HR hour tasks do not get
subtasks — they have no parent project, the UX surface for them is flat,
and adding subtasks there would add complexity for little gain.

### Schema (migration `database/044_task_subtasks.sql`)

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id INTEGER NULL
    REFERENCES tasks(task_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx
  ON tasks(parent_task_id);
```

`ON DELETE CASCADE` so deleting a parent task takes the subtasks with it.

### Application-level guard

Even though the column is nullable, the app must reject a `parent_task_id`
that itself has a `parent_task_id` (no nesting beyond 1 level). Enforced in
`POST /api/projects/[id]/tasks` and silently treated as "not a subtask" in the
UI.

### Mock store

Add `parentTaskId: number | null` to the `MockTask` type with a default of
`null`.

### API

- `POST /api/projects/[id]/tasks`: accept optional `parentTaskId`. Validate
  parent belongs to the same project and has `parent_task_id IS NULL`.
- `GET /api/projects/[id]/tasks`: return `parentTaskId` so the UI can group.
- `GET /api/tasks/[id]`: return `parentTaskId` and `parentTaskTitle` for the
  shared detail page.
- `PATCH /api/tasks/[id]`: `parent_task_id` is **not** patchable.
- `DELETE /api/tasks/[id]`: cascade is handled by the FK, no app change.

### UI on `/dashboard/innovation/projects/[id]` tasks tab

- Tasks that are parents (or top-level) render as today.
- Subtasks render indented under their parent in the same table, with a
  visual L-connector.
- Each parent row gets a "+ Subtask" button (leader only).
- Clicking it opens `TaskFormModal` with `parentTaskId` set; the modal shows
  a "Subtask of: <parent title>" header.
- Top-level "New Task" button in the toolbar continues to create root tasks.
- Multi-assign works identically for subtasks.

### UI on `/dashboard/tasks/[id]` shared detail page

If the task has a `parentTaskId`, show a "Subtask of <parent title>" link
above the title that navigates to the parent's detail page.

If the task has subtasks, list them under a "Subtasks" section with
status badges. Each subtask is a link to its own detail page.

## UI polish (ui-ux-pro-max)

After implementation, run a `ui-ux-pro-max` review pass on every screen this
session touched:

1. `/dashboard/innovation/projects/[id]` — tasks tab (now with subtasks +
   multi-assign)
2. `/dashboard/tasks/[id]` — shared task detail page
3. `/dashboard/hr/hour-tasks/[id]` — hour task detail page
4. `/dashboard/hr` — hour task list with new toolbar
5. `/dashboard/madarat` — support task list with new toolbar
6. `/dashboard/media` — kanban cards with new toolbar
7. `/(public)/projects` — projects list (post-events-removal)
8. `/(public)/projects/[kind]/[id]` — project detail (member cards now link
   to `/team/[id]`)

The polish pass is constrained by the existing design system (glass cards,
primary/cyan accent, dark-first). It should sharpen rather than reinvent —
spacing, hierarchy, contrast, motion. No new design language.

## Rollout

One PR, one push:
1. Add migration `044_task_subtasks.sql`.
2. Apply to Neon prod via the same MCP path used for `043`.
3. Update mock store.
4. Drop `ownsResource` bypass in `/api/projects/[id]/tasks`.
5. Add `useIsLeader()` hook and gate every create button.
6. Wire multi-assign chip control into the three forms.
7. Wire subtask UI into the project detail tasks tab.
8. Wire subtask metadata into the shared detail page.
9. Run `ui-ux-pro-max` polish pass on the 8 screens above.
10. Build, commit, push.

## Open questions

None — the four load-bearing decisions were made via direct user input
before this doc was written.
