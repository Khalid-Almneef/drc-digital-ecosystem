import { err, handle, ok } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

export const POST = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const opportunityId = Number(id);

  if (isMockMode()) {
    const store = getMockStore();
    const task = store.volunteerHourTasks.find((entry) => entry.opportunityId === opportunityId);
    if (!task) return err(404, "Volunteer hour task not found");
    if (!task.isActive) return err(400, "This volunteer hour task is closed.");
    const existing = store.volunteerHours.find((hour) =>
      hour.memberId === session.memberId &&
      hour.sourceType === "hour_task" &&
      hour.sourceId === opportunityId,
    );
    if (existing) return err(409, "You already registered for this volunteer hour task.");

    const id = nextMockId("volunteerHour");
    const row = {
      id,
      memberId: session.memberId,
      hours: task.hours,
      title: task.title,
      description: task.description ?? "Registered from the profile volunteer hours section.",
      participationDate: task.participationDate,
      approvalStatus: "pending" as const,
      approvedAt: null,
      approvedBy: null,
      sourceType: "hour_task" as const,
      sourceId: opportunityId,
    };
    store.volunteerHours.unshift(row);
    return ok(row, { status: 201 });
  }

  const task = await queryOne<{
    title: string;
    description: string | null;
    hours: string;
    participationDate: string;
    isActive: boolean;
  }>(
    `SELECT title,
            description,
            hours,
            participation_date AS "participationDate",
            is_active AS "isActive"
       FROM volunteer_hour_tasks
      WHERE opportunity_id = $1`,
    [opportunityId],
  );
  if (!task) return err(404, "Volunteer hour task not found");
  if (!task.isActive) return err(400, "This volunteer hour task is closed.");

  const inserted = await query<{
    id: number;
    hours: string;
    title: string;
    description: string | null;
    participationDate: string;
    approvalStatus: "pending" | "approved" | "rejected";
    sourceType: "hour_task";
    sourceId: number;
  }>(
    `INSERT INTO volunteer_hours
       (member_id, hours, title, description, participation_date, approval_status, source_type, source_id)
     VALUES ($1, $2, $3, $4, $5, 'pending', 'hour_task', $6)
     ON CONFLICT (member_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING
     RETURNING volunthr_id AS "id",
               hours,
               title,
               description,
               participation_date AS "participationDate",
               approval_status::text AS "approvalStatus",
               source_type AS "sourceType",
               source_id AS "sourceId"`,
    [
      session.memberId,
      Number(task.hours),
      task.title,
      task.description ?? "Registered from the profile volunteer hours section.",
      task.participationDate,
      opportunityId,
    ],
  );
  if (!inserted.rows[0]) return err(409, "You already registered for this volunteer hour task.");
  return ok(inserted.rows[0], { status: 201 });
});
