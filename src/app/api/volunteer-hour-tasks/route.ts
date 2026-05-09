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
          })),
      );
    }

    const myStatuses = new Map<number, "pending" | "approved" | "rejected">(
      store.volunteerHours
        .filter((hour) => hour.memberId === session.memberId && hour.sourceType === "hour_task" && hour.sourceId != null)
        .map((hour) => [Number(hour.sourceId), hour.approvalStatus]),
    );
    return ok(
      store.volunteerHourTasks
        .filter((task) => task.isActive)
        .slice()
        .sort((a, b) => `${b.participationDate}${b.createdAt}`.localeCompare(`${a.participationDate}${a.createdAt}`))
        .map((task) => ({
          ...task,
          myRegistrationStatus: myStatuses.get(task.opportunityId) ?? null,
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
              t.created_by AS "createdBy",
              t.created_at AS "createdAt",
              t.updated_at AS "updatedAt",
              p.full_name AS "createdByName",
              COUNT(vh.volunthr_id)::int AS "registrationsCount"
         FROM volunteer_hour_tasks t
         LEFT JOIN profiles p
           ON p.member_id = t.created_by
         LEFT JOIN volunteer_hours vh
           ON vh.source_type = 'hour_task' AND vh.source_id = t.opportunity_id
        GROUP BY t.opportunity_id, p.full_name
        ORDER BY t.participation_date DESC, t.created_at DESC`,
    );
    return ok(rows);
  }

  const { rows } = await query(
    `SELECT t.opportunity_id AS "opportunityId",
            t.title,
            t.description,
            t.hours,
            t.participation_date AS "participationDate",
            t.is_active AS "isActive",
            t.created_by AS "createdBy",
            t.created_at AS "createdAt",
            t.updated_at AS "updatedAt",
            vh.approval_status::text AS "myRegistrationStatus"
       FROM volunteer_hour_tasks t
       LEFT JOIN volunteer_hours vh
         ON vh.member_id = $1 AND vh.source_type = 'hour_task' AND vh.source_id = t.opportunity_id
      WHERE t.is_active = TRUE
      ORDER BY t.participation_date DESC, t.created_at DESC`,
    [session.memberId],
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
      createdBy: session.memberId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return ok({ opportunityId }, { status: 201 });
  }

  const { rows } = await query<{ opportunity_id: number }>(
    `INSERT INTO volunteer_hour_tasks
       (title, description, hours, participation_date, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING opportunity_id`,
    [
      body.title,
      body.description ?? null,
      body.hours,
      body.participationDate,
      body.isActive ?? true,
      session.memberId,
    ],
  );
  return ok({ opportunityId: rows[0].opportunity_id }, { status: 201 });
});
