import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead, canManageDept, ownsResource } from "@/lib/authz";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

async function gateProject(
  s: Awaited<ReturnType<typeof requireSession>>,
  projectId: string,
): Promise<Response | null> {
  if (isClubLead(s)) return null;
  if (isMockMode()) {
    const project = getMockStore().projects.find((p) => p.projectId === Number(projectId));
    if (!project) return err(404, "Not found");
    if (canManageDept(s, project.departmentId) || ownsResource(s, project.leadMemberId)) return null;
    return err(403, "Forbidden");
  }
  const row = await queryOne<{ departmentId: number | null; leadMemberId: number | null }>(
    `SELECT department_id AS "departmentId", lead_member_id AS "leadMemberId" FROM projects WHERE project_id = $1`,
    [projectId],
  );
  if (!row) return err(404, "Not found");
  if (canManageDept(s, row.departmentId) || ownsResource(s, row.leadMemberId)) return null;
  return err(403, "Forbidden");
}

export const GET = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const rows = getMockStore().tasks
      .filter((t) => t.projectId === Number(id))
      .map((t) => ({
        taskId: t.taskId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo,
        assigneeName: t.assignedTo ? findMockMember(t.assignedTo)?.fullName ?? null : null,
        creditHours: t.creditHours,
      }));
    return ok(rows);
  }
  const { rows } = await query(
    `SELECT t.task_id AS "taskId", t.title, t.description, t.status::text AS status,
            t.priority::text AS priority, t.due_date AS "dueDate",
            t.assigned_to AS "assignedTo", p.full_name AS "assigneeName",
            t.credit_hours AS "creditHours"
       FROM tasks t
       LEFT JOIN profiles p ON p.member_id = t.assigned_to
      WHERE t.project_id = $1 ORDER BY t.created_at DESC`,
    [id],
  );
  return ok(rows);
});

const Post = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedTo: z.number().int().optional(),
  dueDate: z.string().optional(),
  creditHours: z.number().nonnegative().optional(),
});

export const POST = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const gate = await gateProject(s, id);
  if (gate) return gate;
  const b = await parseBody(req, Post);
  if (isMockMode()) {
    const store = getMockStore();
    const project = store.projects.find((p) => p.projectId === Number(id));
    const taskId = nextMockId("task");
    store.tasks.unshift({
      taskId,
      title: b.title,
      description: b.description ?? null,
      status: b.status,
      priority: b.priority,
      assignedTo: b.assignedTo ?? null,
      dueDate: b.dueDate ?? null,
      artifactUrl: null,
      artifactNotes: null,
      submittedAt: null,
      creditHours: b.creditHours ?? 0,
      completedAt: b.status === "done" ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      createdBy: s.memberId,
      projectId: Number(id),
      departmentId: project?.departmentId ?? null,
    });
    return ok({ taskId }, { status: 201 });
  }
  const { rows } = await query<{ task_id: number }>(
    `INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, credit_hours, created_by)
     VALUES ($1,$2,$3,$4::task_status,$5::task_priority,$6,$7,$8,$9) RETURNING task_id`,
    [id, b.title, b.description ?? null, b.status, b.priority, b.assignedTo ?? null, b.dueDate ?? null, b.creditHours ?? 0, s.memberId],
  );
  return ok({ taskId: rows[0].task_id }, { status: 201 });
});
