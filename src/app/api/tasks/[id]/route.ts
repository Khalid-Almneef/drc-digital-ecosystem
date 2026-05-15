import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { departmentById, findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { emitNotification } from "@/lib/notifications";

export const GET = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const taskId = Number(id);
  if (!Number.isFinite(taskId)) return err(400, "Invalid task id");

  if (isMockMode()) {
    const store = getMockStore();
    const task = store.tasks.find((t) => t.taskId === taskId);
    if (!task) return err(404, "Task not found");
    const assignee = task.assignedTo ? findMockMember(task.assignedTo) : null;
    const creator = task.createdBy ? findMockMember(task.createdBy) : null;
    const project = task.projectId ? store.projects.find((p) => p.projectId === task.projectId) : null;
    return ok({
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      assigneeName: assignee?.fullName ?? null,
      assigneeAvatar: assignee?.avatarUrl ?? null,
      createdBy: task.createdBy,
      creatorName: creator?.fullName ?? null,
      dueDate: task.dueDate,
      artifactUrl: task.artifactUrl,
      artifactNotes: task.artifactNotes,
      submittedAt: task.submittedAt,
      creditHours: task.creditHours,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      projectId: task.projectId,
      projectTitle: project?.title ?? null,
      departmentId: task.departmentId,
      departmentSlug: departmentById(task.departmentId)?.slug ?? null,
      departmentName: departmentById(task.departmentId)?.name ?? null,
    });
  }

  const row = await queryOne(
    `SELECT t.task_id AS "taskId",
            t.title,
            t.description,
            t.status::text AS status,
            t.priority::text AS priority,
            t.assigned_to AS "assignedTo",
            ap.full_name AS "assigneeName",
            ap.avatar_url AS "assigneeAvatar",
            t.created_by AS "createdBy",
            cp.full_name AS "creatorName",
            t.due_date AS "dueDate",
            t.artifact_url AS "artifactUrl",
            t.artifact_notes AS "artifactNotes",
            t.submitted_at AS "submittedAt",
            t.credit_hours AS "creditHours",
            t.completed_at AS "completedAt",
            t.created_at AS "createdAt",
            t.project_id AS "projectId",
            p.title AS "projectTitle",
            t.department_id AS "departmentId",
            d.slug::text AS "departmentSlug",
            d.name AS "departmentName"
       FROM tasks t
       LEFT JOIN projects    p  ON p.project_id   = t.project_id
       LEFT JOIN departments d  ON d.department_id = t.department_id
       LEFT JOIN profiles    ap ON ap.member_id   = t.assigned_to
       LEFT JOIN profiles    cp ON cp.member_id   = t.created_by
      WHERE t.task_id = $1`,
    [taskId],
  );
  if (!row) return err(404, "Task not found");
  return ok(row);
});

const Patch = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.number().int().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  artifactUrl: z.string().nullable().optional(),
  artifactNotes: z.string().nullable().optional(),
  creditHours: z.number().nonnegative().optional(),
  departmentId: z.number().int().nullable().optional(),
});

function canManageTask(
  session: { position: string; departmentId: number | null; memberId: number },
  task: { departmentId: number | null; createdBy: number | null },
) {
  if (session.position === "president" || session.position === "vice_president") return true;
  const isLeader = ["dept_leader", "dept_vice_leader", "sub_leader"].includes(session.position);
  if (!isLeader) return false;
  if (task.createdBy === session.memberId) return true;
  return task.departmentId != null && session.departmentId === task.departmentId;
}

function isMemberSubmissionPatch(body: z.infer<typeof Patch>) {
  const allowedKeys = new Set(["status", "artifactUrl", "artifactNotes"]);
  const keys = Object.keys(body);
  if (keys.some((key) => !allowedKeys.has(key))) return false;
  return body.status === undefined || body.status === "review" || body.status === "in_progress";
}

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);
  if (isMockMode()) {
    const store = getMockStore();
    const task = store.tasks.find((t) => t.taskId === Number(id));
    if (!task) return ok({ success: true });
    const isManager = canManageTask(s, { departmentId: task.departmentId, createdBy: task.createdBy });
    const isAssignee = task.assignedTo === s.memberId;
    if (!isManager && !(isAssignee && isMemberSubmissionPatch(b))) {
      return err(403, "Only the assigned member or committee leaders can update this task");
    }
    const previousAssignee = task.assignedTo;
    if (b.title !== undefined) task.title = b.title;
    if (b.description !== undefined) task.description = b.description ?? null;
    if (b.status !== undefined) {
      task.status = b.status;
      if (b.status === "review") task.submittedAt = new Date().toISOString();
      if (b.status === "done") task.completedAt = new Date().toISOString();
      if (b.status === "todo" || b.status === "in_progress") task.submittedAt = null;
      if (b.status === "review" && task.createdBy && task.createdBy !== s.memberId) {
        await emitNotification({
          recipientId: task.createdBy,
          category: "task_returned",
          title: `Submitted for review: ${task.title}`,
          body: task.artifactNotes ?? null,
          linkUrl: "/dashboard",
          sourceType: "task",
          sourceId: task.taskId,
        });
      }
      if (b.status === "done" && task.assignedTo && task.assignedTo !== s.memberId) {
        await emitNotification({
          recipientId: task.assignedTo,
          category: "task_approved",
          title: `Task marked done: ${task.title}`,
          body: null,
          linkUrl: "/dashboard",
          sourceType: "task",
          sourceId: task.taskId,
        });
      }
    }
    if (b.priority !== undefined) task.priority = b.priority;
    if (b.assignedTo !== undefined) {
      task.assignedTo = b.assignedTo;
      if (b.assignedTo && b.assignedTo !== previousAssignee) {
        await emitNotification({
          recipientId: b.assignedTo,
          category: "task_assigned",
          title: `New task: ${task.title}`,
          body: task.description ?? null,
          linkUrl: "/dashboard",
          sourceType: "task",
          sourceId: task.taskId,
        });
      }
    }
    if (b.dueDate !== undefined) task.dueDate = b.dueDate ?? null;
    if (b.artifactUrl !== undefined) task.artifactUrl = b.artifactUrl ?? null;
    if (b.artifactNotes !== undefined) task.artifactNotes = b.artifactNotes ?? null;
    if (b.creditHours !== undefined) task.creditHours = b.creditHours;
    if (b.departmentId !== undefined) task.departmentId = b.departmentId;
    if (b.status === "done" && task.assignedTo && task.creditHours > 0) {
      const exists = store.volunteerHours.find((h) => h.sourceType === "task_credit" && h.sourceId === task.taskId && h.memberId === task.assignedTo);
      if (!exists) {
        store.volunteerHours.unshift({
          id: nextMockId("volunteerHour"),
          memberId: task.assignedTo,
          hours: task.creditHours,
          title: `Credit for task: ${task.title}`,
          description: "Automatically credited on task completion.",
          participationDate: new Date().toISOString().slice(0, 10),
          approvalStatus: "pending",
          approvedAt: null,
          approvedBy: null,
          sourceType: "task_credit",
          sourceId: task.taskId,
        });
      }
    }
    return ok({ success: true });
  }
  const existing = await queryOne<{ assignedTo: number | null; departmentId: number | null; createdBy: number | null }>(
    `SELECT assigned_to AS "assignedTo", department_id AS "departmentId", created_by AS "createdBy"
       FROM tasks WHERE task_id = $1`,
    [id],
  );
  if (!existing) return ok({ success: true });
  const isManager = canManageTask(s, { departmentId: existing.departmentId, createdBy: existing.createdBy });
  const isAssignee = existing.assignedTo === s.memberId;
  if (!isManager && !(isAssignee && isMemberSubmissionPatch(b))) {
    return err(403, "Only the assigned member or committee leaders can update this task");
  }
  const map: Record<string, string> = {
    title: "title", description: "description", assignedTo: "assigned_to", dueDate: "due_date",
    artifactUrl: "artifact_url", artifactNotes: "artifact_notes", creditHours: "credit_hours",
    departmentId: "department_id",
  };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (k === "status") { params.push(v); sets.push(`status = $${params.length}::task_status`); }
    else if (k === "priority") { params.push(v); sets.push(`priority = $${params.length}::task_priority`); }
    else if (map[k]) { params.push(v); sets.push(`${map[k]} = $${params.length}`); }
  }
  if (b.status === "review")  sets.push(`submitted_at = NOW()`);
  if (b.status === "done")    sets.push(`completed_at = NOW()`);
  if (b.status === "in_progress" || b.status === "todo") sets.push(`submitted_at = NULL`);
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE tasks SET ${sets.join(", ")} WHERE task_id = $1`, params);

  // Auto-credit: when transitioning to done, grant credit hours to the assignee
  if (b.status === "done") {
    const task = await queryOne<{
      assignedTo: number | null;
      creditHours: string;
      title: string;
    }>(
      `SELECT assigned_to AS "assignedTo", credit_hours AS "creditHours", title
         FROM tasks WHERE task_id = $1`,
      [id],
    );
    if (task?.assignedTo && Number(task.creditHours) > 0) {
      await query(
        `INSERT INTO volunteer_hours
           (member_id, hours, title, description, participation_date,
            approval_status, source_type, source_id)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, 'pending', 'task_credit', $5)
         ON CONFLICT (member_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING`,
        [
          task.assignedTo,
          Number(task.creditHours),
          `Credit for task: ${task.title}`,
          "Automatically credited on task completion.",
          Number(id),
        ],
      );
    }
  }

  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    const task = store.tasks.find((t) => t.taskId === Number(id));
    if (task && !canManageTask(s, { departmentId: task.departmentId, createdBy: task.createdBy })) {
      return err(403, "Only committee leaders can delete tasks");
    }
    store.tasks = store.tasks.filter((t) => t.taskId !== Number(id));
    return ok({ success: true });
  }
  const existing = await queryOne<{ departmentId: number | null; createdBy: number | null }>(
    `SELECT department_id AS "departmentId", created_by AS "createdBy" FROM tasks WHERE task_id = $1`,
    [id],
  );
  if (existing && !canManageTask(s, { departmentId: existing.departmentId, createdBy: existing.createdBy })) {
    return err(403, "Only committee leaders can delete tasks");
  }
  await query(`DELETE FROM tasks WHERE task_id = $1`, [id]);
  return ok({ success: true });
});
