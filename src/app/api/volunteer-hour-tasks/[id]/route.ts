import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { departmentById, getMockStore, isMockMode } from "@/lib/mock-store";

const Patch = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  hours: z.number().positive().optional(),
  participationDate: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isRepetitive: z.boolean().optional(),
  assignedDepartmentId: z.number().int().positive().nullable().optional(),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "At least one field is required.",
});

function canManage(session: Awaited<ReturnType<typeof requireSession>>) {
  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isHr = (session.position === "dept_leader" || session.position === "dept_vice_leader") && session.departmentSlug === "hr";
  return isAdmin || isHr;
}

export const GET = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const opportunityId = Number(id);
  if (!Number.isFinite(opportunityId)) return err(400, "Invalid task id");

  if (isMockMode()) {
    const task = getMockStore().volunteerHourTasks.find((entry) => entry.opportunityId === opportunityId);
    if (!task || task.isDeleted) return err(404, "Volunteer hour task not found");
    const department = task.assignedDepartmentId ? departmentById(task.assignedDepartmentId) : null;
    return ok({
      ...task,
      assignedDepartmentSlug: department?.slug ?? null,
      assignedDepartmentName: department?.name ?? null,
    });
  }

  const row = await queryOne(
    `SELECT t.opportunity_id AS "opportunityId",
            t.title,
            t.description,
            t.hours,
            t.participation_date AS "participationDate",
            t.is_active AS "isActive",
            t.is_repetitive AS "isRepetitive",
            t.assigned_department_id AS "assignedDepartmentId",
            d.slug::text AS "assignedDepartmentSlug",
            d.name AS "assignedDepartmentName",
            t.created_by AS "createdBy",
            t.created_at AS "createdAt",
            t.updated_at AS "updatedAt"
       FROM volunteer_hour_tasks t
       LEFT JOIN departments d ON d.department_id = t.assigned_department_id
      WHERE t.opportunity_id = $1 AND t.is_deleted = FALSE`,
    [opportunityId],
  );
  if (!row) return err(404, "Volunteer hour task not found");
  return ok(row);
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  if (!canManage(session)) return err(403, "Forbidden");

  const { id } = await ctx.params;
  const opportunityId = Number(id);
  const body = await parseBody(req, Patch);

  if (isMockMode()) {
    const task = getMockStore().volunteerHourTasks.find((entry) => entry.opportunityId === opportunityId);
    if (!task || task.isDeleted) return err(404, "Volunteer hour task not found");
    if (body.title !== undefined) task.title = body.title;
    if (body.description !== undefined) task.description = body.description ?? null;
    if (body.hours !== undefined) task.hours = body.hours;
    if (body.participationDate !== undefined) task.participationDate = body.participationDate;
    if (body.isActive !== undefined) task.isActive = body.isActive;
    if (body.isRepetitive !== undefined) task.isRepetitive = body.isRepetitive;
    if (body.assignedDepartmentId !== undefined) task.assignedDepartmentId = body.assignedDepartmentId ?? null;
    task.updatedAt = new Date().toISOString();
    return ok({ success: true });
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (body.title !== undefined) {
    params.push(body.title);
    sets.push(`title = $${params.length}`);
  }
  if (body.description !== undefined) {
    params.push(body.description ?? null);
    sets.push(`description = $${params.length}`);
  }
  if (body.hours !== undefined) {
    params.push(body.hours);
    sets.push(`hours = $${params.length}`);
  }
  if (body.participationDate !== undefined) {
    params.push(body.participationDate);
    sets.push(`participation_date = $${params.length}`);
  }
  if (body.isActive !== undefined) {
    params.push(body.isActive);
    sets.push(`is_active = $${params.length}`);
  }
  if (body.isRepetitive !== undefined) {
    params.push(body.isRepetitive);
    sets.push(`is_repetitive = $${params.length}`);
  }
  if (body.assignedDepartmentId !== undefined) {
    params.push(body.assignedDepartmentId ?? null);
    sets.push(`assigned_department_id = $${params.length}`);
  }
  params.push(opportunityId);
  const result = await query(
    `UPDATE volunteer_hour_tasks
        SET ${sets.join(", ")}, updated_at = NOW()
      WHERE opportunity_id = $${params.length}`,
    params,
  );
  if (result.rowCount === 0) return err(404, "Volunteer hour task not found");
  return ok({ success: true });
});

// Soft-delete (see docs/superpowers/specs/2026-05-15…design.md). The row stays
// in the DB so volunteer-hour records and registrations tied to the
// opportunity remain queryable for audit. List endpoints filter is_deleted.
export const DELETE = handle(async (_req, ctx) => {
  const session = await requireSession();
  if (!canManage(session)) return err(403, "Forbidden");
  const { id } = await ctx.params;
  const opportunityId = Number(id);
  if (!Number.isFinite(opportunityId)) return err(400, "Invalid task id");

  if (isMockMode()) {
    const store = getMockStore();
    const target = store.volunteerHourTasks.find((entry) => entry.opportunityId === opportunityId);
    if (!target || target.isDeleted) return err(404, "Volunteer hour task not found");
    target.isDeleted = true;
    return ok({ success: true });
  }

  const result = await query(
    `UPDATE volunteer_hour_tasks
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            deleted_by = $2
      WHERE opportunity_id = $1 AND is_deleted = FALSE`,
    [opportunityId, session.memberId],
  );
  if (result.rowCount === 0) return err(404, "Volunteer hour task not found");
  return ok({ success: true });
});
