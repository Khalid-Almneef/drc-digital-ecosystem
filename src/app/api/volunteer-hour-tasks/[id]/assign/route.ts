import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query, queryOne, withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

// POST /api/volunteer-hour-tasks/[id]/assign
//   Body: { memberIds: number[] }
//   HR / club admin assigns an hour task to one or more members. Pre-creates a
//   pending volunteer_hours row per member (mirrors what /register does for
//   self-registration). Members see the credit in their volunteer-hours
//   summary; HR can then approve the rows in the Hours tab.

const Body = z.object({
  memberIds: z.array(z.number().int().positive()).min(1).max(200),
});

function canAssign(session: { position: string; departmentSlug?: string | null }) {
  if (session.position === "president" || session.position === "vice_president") return true;
  return (
    (session.position === "dept_leader" ||
      session.position === "dept_vice_leader" ||
      session.position === "sub_leader") &&
    session.departmentSlug === "hr"
  );
}

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  if (!canAssign(session)) return err(403, "Only HR or club admins can assign hour tasks");

  const { id } = await ctx.params;
  const opportunityId = Number(id);
  if (!Number.isFinite(opportunityId)) return err(400, "Invalid task id");
  const body = await parseBody(req, Body);

  if (isMockMode()) {
    const store = getMockStore();
    const task = store.volunteerHourTasks.find((entry) => entry.opportunityId === opportunityId);
    if (!task || task.isDeleted) return err(404, "Volunteer hour task not found");
    if (!task.isActive) return err(400, "This volunteer hour task is closed.");

    let assigned = 0;
    let skipped = 0;
    for (const memberId of body.memberIds) {
      const member = findMockMember(memberId);
      if (!member) { skipped++; continue; }
      if (!task.isRepetitive) {
        const existing = store.volunteerHours.find((h) =>
          h.memberId === memberId &&
          h.sourceType === "hour_task" &&
          h.sourceId === opportunityId,
        );
        if (existing) { skipped++; continue; }
      }
      const rowId = nextMockId("volunteerHour");
      store.volunteerHours.unshift({
        id: rowId,
        memberId,
        hours: task.hours,
        title: task.title,
        description: task.description ?? "Assigned by HR.",
        participationDate: task.participationDate,
        approvalStatus: "pending",
        approvedAt: null,
        approvedBy: null,
        sourceType: "hour_task",
        sourceId: opportunityId,
      });
      assigned++;
    }
    return ok({ assigned, skipped });
  }

  const task = await queryOne<{
    title: string; description: string | null; hours: string;
    participationDate: string; isActive: boolean; isRepetitive: boolean;
  }>(
    `SELECT title, description, hours,
            participation_date AS "participationDate",
            is_active AS "isActive",
            is_repetitive AS "isRepetitive"
       FROM volunteer_hour_tasks
      WHERE opportunity_id = $1 AND is_deleted = FALSE`,
    [opportunityId],
  );
  if (!task) return err(404, "Volunteer hour task not found");
  if (!task.isActive) return err(400, "This volunteer hour task is closed.");

  let assigned = 0;
  let skipped = 0;
  await withTx(async (c) => {
    for (const memberId of body.memberIds) {
      if (!task.isRepetitive) {
        const dupe = await c.query<{ volunthr_id: number }>(
          `SELECT volunthr_id FROM volunteer_hours
            WHERE member_id = $1 AND source_type = 'hour_task' AND source_id = $2`,
          [memberId, opportunityId],
        );
        if (dupe.rows.length > 0) { skipped++; continue; }
      }
      const exists = await c.query<{ member_id: number }>(
        `SELECT member_id FROM users WHERE member_id = $1 AND is_active = TRUE`,
        [memberId],
      );
      if (exists.rows.length === 0) { skipped++; continue; }
      await c.query(
        `INSERT INTO volunteer_hours
            (member_id, hours, title, description, participation_date,
             approval_status, source_type, source_id)
         VALUES ($1, $2, $3, $4, $5::date, 'pending', 'hour_task', $6)`,
        [
          memberId,
          Number(task.hours),
          task.title,
          task.description ?? "Assigned by HR.",
          task.participationDate,
          opportunityId,
        ],
      );
      assigned++;
    }
  });

  // Hush unused query() to keep import warnings clean.
  void query;

  return ok({ assigned, skipped });
});
