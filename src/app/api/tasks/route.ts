import { z } from "zod";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { departmentById, findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { emitNotification } from "@/lib/notifications";

// ── GET /api/tasks ─────────────────────────────────────────────────────────────
// Query params: department?, status?, assignedTo?, mine=1
// mine=1 forces assigned_to = session.memberId (overrides assignedTo)

const GetQuery = z.object({
  department: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  assignedTo: z.string().optional(),
  mine: z.string().optional(),
});

export const GET = handle(async (req) => {
  const s = await requireSession();
  const q = parseQuery(new URL(req.url), GetQuery);
  if (isMockMode()) {
    const store = getMockStore();
    const rows = store.tasks
      .filter((t) => (q.mine === "1" ? t.assignedTo === s.memberId : true))
      .filter((t) => (!q.mine && q.assignedTo ? t.assignedTo === Number(q.assignedTo) : true))
      .filter((t) => (!q.status ? true : t.status === q.status))
      .filter((t) => {
        if (!q.department) return true;
        return departmentById(t.departmentId)?.slug === q.department;
      })
      .map((t) => {
        const assignee = t.assignedTo ? findMockMember(t.assignedTo) : null;
        const project = t.projectId ? store.projects.find((p) => p.projectId === t.projectId) : null;
        return {
          taskId: t.taskId,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignedTo: t.assignedTo,
          dueDate: t.dueDate,
          artifactUrl: t.artifactUrl,
          artifactNotes: t.artifactNotes,
          submittedAt: t.submittedAt,
          creditHours: t.creditHours,
          completedAt: t.completedAt,
          createdAt: t.createdAt,
          projectId: t.projectId,
          projectTitle: project?.title ?? null,
          departmentId: t.departmentId,
          departmentSlug: departmentById(t.departmentId)?.slug ?? null,
          assigneeName: assignee?.fullName ?? null,
          assigneeAvatar: assignee?.avatarUrl ?? null,
        };
      });
    return ok(rows);
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q.mine === "1") {
    params.push(s.memberId);
    conditions.push(`t.assigned_to = $${params.length}`);
  } else if (q.assignedTo) {
    params.push(Number(q.assignedTo));
    conditions.push(`t.assigned_to = $${params.length}`);
  }

  if (q.status) {
    params.push(q.status);
    conditions.push(`t.status = $${params.length}::task_status`);
  }

  if (q.department) {
    params.push(q.department);
    conditions.push(`d.slug = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query(
    `SELECT t.task_id AS "taskId", t.title, t.description,
            t.status::text AS status, t.priority::text AS priority,
            t.assigned_to AS "assignedTo", t.due_date AS "dueDate",
            t.artifact_url AS "artifactUrl", t.artifact_notes AS "artifactNotes",
            t.submitted_at AS "submittedAt", t.credit_hours AS "creditHours",
            t.completed_at AS "completedAt", t.created_at AS "createdAt",
            t.project_id AS "projectId", p.title AS "projectTitle",
            t.department_id AS "departmentId", d.slug::text AS "departmentSlug",
            ap.full_name AS "assigneeName", ap.avatar_url AS "assigneeAvatar"
       FROM tasks t
       LEFT JOIN projects    p  ON p.project_id    = t.project_id
       LEFT JOIN departments d  ON d.department_id = t.department_id
       LEFT JOIN profiles    ap ON ap.member_id    = t.assigned_to
      ${where}
      ORDER BY t.created_at DESC`,
    params,
  );
  return ok(rows);
});

// ── POST /api/tasks ────────────────────────────────────────────────────────────
// Either projectId OR departmentId must be provided.

const Post = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.number().int().optional(),
  departmentId: z.number().int().optional(),
  departmentSlug: z.string().optional(),
  assignedTo: z.number().int().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  creditHours: z.number().nonnegative().optional(),
});

function canManageDepartmentTasks(session: { position: string; departmentId: number | null }, departmentId: number | null) {
  if (session.position === "president" || session.position === "vice_president") return true;
  if (!departmentId || session.departmentId !== departmentId) return false;
  return ["dept_leader", "dept_vice_leader", "sub_leader"].includes(session.position);
}

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);
  if (isMockMode()) {
    const store = getMockStore();
    const deptId = b.departmentId ?? (b.departmentSlug ? store.departments.find((dept) => dept.slug === b.departmentSlug)?.id ?? null : (b.projectId == null ? s.departmentId : null));
    if (b.projectId == null && deptId == null) {
      return ok({ error: "Either projectId or departmentId is required" }, { status: 400 });
    }
    if (!canManageDepartmentTasks(s, deptId)) {
      return ok({ error: "Only committee leaders can assign department tasks" }, { status: 403 });
    }
    const taskId = nextMockId("task");
    store.tasks.unshift({
      taskId,
      title: b.title,
      description: b.description ?? null,
      projectId: b.projectId ?? null,
      departmentId: deptId ?? null,
      assignedTo: b.assignedTo ?? null,
      dueDate: b.dueDate ?? null,
      priority: b.priority ?? "medium",
      creditHours: b.creditHours ?? 0,
      status: "todo",
      artifactUrl: null,
      artifactNotes: null,
      submittedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: s.memberId,
    });
    if (b.assignedTo) {
      await emitNotification({
        recipientId: b.assignedTo,
        category: "task_assigned",
        title: `New task: ${b.title}`,
        body: b.description ?? null,
        linkUrl: "/dashboard",
        sourceType: "task",
        sourceId: taskId,
      });
    }
    return ok({ taskId }, { status: 201 });
  }
  // If neither projectId nor departmentId is provided, fall back to caller's dept
  const deptId = b.departmentId ?? (
    b.departmentSlug
      ? (await queryOne<{ departmentId: number }>(
        `SELECT department_id AS "departmentId" FROM departments WHERE slug = $1`,
        [b.departmentSlug],
      ))?.departmentId ?? null
      : (b.projectId == null ? s.departmentId : null)
  );
  if (b.projectId == null && deptId == null) {
    return ok({ error: "Either projectId or departmentId is required" }, { status: 400 });
  }
  if (!canManageDepartmentTasks(s, deptId)) {
    return ok({ error: "Only committee leaders can assign department tasks" }, { status: 403 });
  }
  const { rows } = await query<{ task_id: number }>(
    `INSERT INTO tasks (title, description, project_id, department_id, assigned_to,
                        due_date, priority, credit_hours, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7::task_priority,$8,$9) RETURNING task_id`,
    [
      b.title, b.description ?? null, b.projectId ?? null, deptId ?? null,
      b.assignedTo ?? null, b.dueDate ?? null,
      b.priority ?? "medium", b.creditHours ?? 0, s.memberId,
    ],
  );
  if (b.assignedTo) {
    await emitNotification({
      recipientId: b.assignedTo,
      category: "task_assigned",
      title: `New task: ${b.title}`,
      body: b.description ?? null,
      linkUrl: "/dashboard",
      sourceType: "task",
      sourceId: rows[0].task_id,
    });
  }
  return ok({ taskId: rows[0].task_id }, { status: 201 });
});
