import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const Post = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  hours: z.number().positive(),
  participationDate: z.string().min(1),
  isActive: z.boolean().optional(),
  isRepetitive: z.boolean().optional(),
  assignedDepartmentId: z.number().int().positive().nullable().optional(),
});

function canManage(session: Awaited<ReturnType<typeof requireSession>>) {
  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isHr = (session.position === "dept_leader" || session.position === "dept_vice_leader") && session.departmentSlug === "hr";
  return isAdmin || isHr;
}

export const GET = handle(async (req) => {
  const session = await requireSession();
  const scope = new URL(req.url).searchParams.get("scope");
  const manage = scope === "manage";

  if (manage && !canManage(session)) return err(403, "Forbidden");

  if (isMockMode()) {
    const store = getMockStore();
    const deptName = (id: number | null) =>
      id == null ? null : store.departments.find((d) => d.id === id)?.name ?? null;
    const deptSlug = (id: number | null) =>
      id == null ? null : store.departments.find((d) => d.id === id)?.slug ?? null;

    if (manage) {
      const registrations = new Map<number, number>();
      for (const hour of store.volunteerHours) {
        if (hour.sourceType !== "hour_task" || hour.sourceId == null) continue;
        registrations.set(hour.sourceId, (registrations.get(hour.sourceId) ?? 0) + 1);
      }
      return ok(
        store.volunteerHourTasks
          .slice()
          .sort((a, b) => `${b.participationDate}${b.createdAt}`.localeCompare(`${a.participationDate}${a.createdAt}`))
          .map((task) => ({
            ...task,
            registrationsCount: registrations.get(task.opportunityId) ?? 0,
            createdByName: task.createdBy ? findMockMember(task.createdBy)?.fullName ?? null : null,
            assignedDepartmentSlug: deptSlug(task.assignedDepartmentId),
            assignedDepartmentName: deptName(task.assignedDepartmentId),
          })),
      );
    }

    const myCounts = new Map<number, number>();
    const myStatuses = new Map<number, "pending" | "approved" | "rejected">();
    for (const hour of store.volunteerHours) {
      if (hour.memberId !== session.memberId) continue;
      if (hour.sourceType !== "hour_task" || hour.sourceId == null) continue;
      myCounts.set(hour.sourceId, (myCounts.get(hour.sourceId) ?? 0) + 1);
      myStatuses.set(hour.sourceId, hour.approvalStatus);
    }

    return ok(
      store.volunteerHourTasks
        .filter((task) => task.isActive)
        .filter((task) =>
          task.assignedDepartmentId == null || task.assignedDepartmentId === session.departmentId,
        )
        .slice()
        .sort((a, b) => {
          // Surface dept-assigned tasks for the member's department first.
          const aMine = a.assignedDepartmentId === session.departmentId ? 0 : 1;
          const bMine = b.assignedDepartmentId === session.departmentId ? 0 : 1;
          if (aMine !== bMine) return aMine - bMine;
          return `${b.participationDate}${b.createdAt}`.localeCompare(`${a.participationDate}${a.createdAt}`);
        })
        .map((task) => ({
          ...task,
          // Repetitive tasks are always available regardless of prior logs.
          myRegistrationStatus: task.isRepetitive ? null : myStatuses.get(task.opportunityId) ?? null,
          myRegistrationCount: myCounts.get(task.opportunityId) ?? 0,
          assignedDepartmentSlug: deptSlug(task.assignedDepartmentId),
          assignedDepartmentName: deptName(task.assignedDepartmentId),
        })),
    );
  }

  if (manage) {
    const { rows } = await query(
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
              t.updated_at AS "updatedAt",
              p.full_name AS "createdByName",
              COUNT(vh.volunthr_id)::int AS "registrationsCount"
         FROM volunteer_hour_tasks t
         LEFT JOIN profiles p
           ON p.member_id = t.created_by
         LEFT JOIN departments d
           ON d.department_id = t.assigned_department_id
         LEFT JOIN volunteer_hours vh
           ON vh.source_type = 'hour_task' AND vh.source_id = t.opportunity_id
        GROUP BY t.opportunity_id, p.full_name, d.slug, d.name
        ORDER BY t.participation_date DESC, t.created_at DESC`,
    );
    return ok(rows);
  }

  // Members only see club-wide tasks or tasks assigned to their department.
  // Repetitive tasks show no "myRegistrationStatus" so they remain registrable.
  // Dept-assigned tasks for the member's own department surface first.
  const { rows } = await query(
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
            t.updated_at AS "updatedAt",
            CASE WHEN t.is_repetitive THEN NULL ELSE vh.approval_status::text END AS "myRegistrationStatus",
            (SELECT COUNT(*)::int FROM volunteer_hours vh2
               WHERE vh2.member_id = $1
                 AND vh2.source_type = 'hour_task'
                 AND vh2.source_id = t.opportunity_id) AS "myRegistrationCount"
       FROM volunteer_hour_tasks t
       LEFT JOIN departments d
         ON d.department_id = t.assigned_department_id
       LEFT JOIN LATERAL (
         SELECT approval_status FROM volunteer_hours
          WHERE member_id = $1
            AND source_type = 'hour_task'
            AND source_id = t.opportunity_id
          ORDER BY volunthr_id DESC
          LIMIT 1
       ) vh ON TRUE
      WHERE t.is_active = TRUE
        AND (t.assigned_department_id IS NULL OR t.assigned_department_id = $2)
      ORDER BY (CASE WHEN t.assigned_department_id = $2 THEN 0 ELSE 1 END),
               t.participation_date DESC, t.created_at DESC`,
    [session.memberId, session.departmentId],
  );
  return ok(rows);
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (!canManage(session)) return err(403, "Forbidden");

  const body = await parseBody(req, Post);
  if (isMockMode()) {
    const opportunityId = nextMockId("volunteerHourTask");
    getMockStore().volunteerHourTasks.unshift({
      opportunityId,
      title: body.title,
      description: body.description ?? null,
      hours: body.hours,
      participationDate: body.participationDate,
      isActive: body.isActive ?? true,
      isRepetitive: body.isRepetitive ?? false,
      assignedDepartmentId: body.assignedDepartmentId ?? null,
      createdBy: session.memberId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return ok({ opportunityId }, { status: 201 });
  }

  const { rows } = await query<{ opportunity_id: number }>(
    `INSERT INTO volunteer_hour_tasks
       (title, description, hours, participation_date, is_active, is_repetitive, assigned_department_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING opportunity_id`,
    [
      body.title,
      body.description ?? null,
      body.hours,
      body.participationDate,
      body.isActive ?? true,
      body.isRepetitive ?? false,
      body.assignedDepartmentId ?? null,
      session.memberId,
    ],
  );
  return ok({ opportunityId: rows[0].opportunity_id }, { status: 201 });
});
