import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { requireDeptLeaderOf } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { departmentById, findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const ALLOWED_DEPARTMENTS = new Set(["hr", "pr", "media"]);

const Body = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  departmentId: z.number().int(),
  assignedTo: z.number().int().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  creditHours: z.number().nonnegative().optional(),
});

export const GET = handle(async () => {
  const session = await requireDeptLeaderOf(["madarat"]);

  if (isMockMode()) {
    const store = getMockStore();
    return ok(
      store.tasks
        .filter((task) => task.createdBy === session.memberId)
        .filter((task) => {
          const slug = departmentById(task.departmentId)?.slug;
          return slug ? ALLOWED_DEPARTMENTS.has(slug) : false;
        })
        .map((task) => ({
          taskId: task.taskId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo,
          assigneeName: task.assignedTo ? findMockMember(task.assignedTo)?.fullName ?? null : null,
          dueDate: task.dueDate,
          artifactUrl: task.artifactUrl,
          artifactNotes: task.artifactNotes,
          submittedAt: task.submittedAt,
          creditHours: task.creditHours,
          completedAt: task.completedAt,
          createdAt: task.createdAt,
          departmentId: task.departmentId,
          departmentSlug: departmentById(task.departmentId)?.slug ?? null,
          departmentName: departmentById(task.departmentId)?.name ?? null,
        })),
    );
  }

  const { rows } = await query(
    `SELECT t.task_id AS "taskId",
            t.title,
            t.description,
            t.status::text AS status,
            t.priority::text AS priority,
            t.assigned_to AS "assignedTo",
            p.full_name AS "assigneeName",
            t.due_date AS "dueDate",
            t.artifact_url AS "artifactUrl",
            t.artifact_notes AS "artifactNotes",
            t.submitted_at AS "submittedAt",
            t.credit_hours AS "creditHours",
            t.completed_at AS "completedAt",
            t.created_at AS "createdAt",
            t.department_id AS "departmentId",
            d.slug::text AS "departmentSlug",
            d.name AS "departmentName"
       FROM tasks t
       LEFT JOIN profiles p ON p.member_id = t.assigned_to
       LEFT JOIN departments d ON d.department_id = t.department_id
      WHERE t.created_by = $1
        AND d.slug = ANY($2::text[])
      ORDER BY t.created_at DESC`,
    [session.memberId, Array.from(ALLOWED_DEPARTMENTS)],
  );
  return ok(rows);
});

export const POST = handle(async (req) => {
  const session = await requireDeptLeaderOf(["madarat"]);
  const body = await parseBody(req, Body);

  if (isMockMode()) {
    const department = departmentById(body.departmentId);
    if (!department || !ALLOWED_DEPARTMENTS.has(department.slug)) {
      return err(400, "Madarat tasks can only target HR, PR, or Media.");
    }
    const taskId = nextMockId("task");
    getMockStore().tasks.unshift({
      taskId,
      title: body.title,
      description: body.description ?? null,
      status: "todo",
      priority: body.priority,
      assignedTo: body.assignedTo ?? null,
      dueDate: body.dueDate ?? null,
      artifactUrl: null,
      artifactNotes: null,
      submittedAt: null,
      creditHours: body.creditHours ?? 0,
      completedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: session.memberId,
      projectId: null,
      departmentId: body.departmentId,
    });
    return ok({ taskId }, { status: 201 });
  }

  const department = await queryOne<{ slug: string | null }>(
    `SELECT slug::text AS slug FROM departments WHERE department_id = $1`,
    [body.departmentId],
  );
  if (!department?.slug || !ALLOWED_DEPARTMENTS.has(department.slug)) {
    return err(400, "Madarat tasks can only target HR, PR, or Media.");
  }

  const { rows } = await query<{ task_id: number }>(
    `INSERT INTO tasks
       (title, description, department_id, assigned_to, due_date, priority, credit_hours, created_by)
     VALUES ($1,$2,$3,$4,$5,$6::task_priority,$7,$8)
     RETURNING task_id`,
    [
      body.title,
      body.description ?? null,
      body.departmentId,
      body.assignedTo ?? null,
      body.dueDate ?? null,
      body.priority,
      body.creditHours ?? 0,
      session.memberId,
    ],
  );
  return ok({ taskId: rows[0].task_id }, { status: 201 });
});
