import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";
import { emitNotification } from "@/lib/notifications";

const Body = z.object({ status: z.enum(["approved", "rejected"]) });

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");
  const { id } = await ctx.params;
  const { status } = await parseBody(req, Body);
  if (isMockMode()) {
    const row = getMockStore().volunteerHours.find((h) => h.id === Number(id));
    if (!row) return err(404, "Not found");
    row.approvalStatus = status;
    row.approvedBy = s.memberId;
    row.approvedAt = new Date().toISOString();
    await emitNotification({
      recipientId: row.memberId,
      category: status === "approved" ? "hours_approved" : "hours_rejected",
      title: status === "approved"
        ? `${row.hours} volunteer hours approved`
        : `${row.hours} volunteer hours rejected`,
      body: row.title ?? null,
      linkUrl: "/dashboard",
      sourceType: "volunteer_hours",
      sourceId: row.id,
    });
    return ok({ success: true });
  }
  const row = await queryOne<{ memberId: number; hours: number; title: string | null }>(
    `SELECT member_id AS "memberId", hours, title
       FROM volunteer_hours WHERE volunthr_id = $1`,
    [id],
  );
  await query(
    `UPDATE volunteer_hours
        SET approval_status = $1::approval_status, approved_by = $2, approved_at = NOW()
      WHERE volunthr_id = $3`,
    [status, s.memberId, id],
  );
  if (row) {
    await emitNotification({
      recipientId: row.memberId,
      category: status === "approved" ? "hours_approved" : "hours_rejected",
      title: status === "approved"
        ? `${row.hours} volunteer hours approved`
        : `${row.hours} volunteer hours rejected`,
      body: row.title,
      linkUrl: "/dashboard",
      sourceType: "volunteer_hours",
      sourceId: Number(id),
    });
  }
  return ok({ success: true });
});
