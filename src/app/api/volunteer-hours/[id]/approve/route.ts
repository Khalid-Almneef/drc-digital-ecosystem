import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";
import { emitNotification } from "@/lib/notifications";

const Body = z.object({
  status: z.enum(["approved", "rejected"]),
  hoursOverride: z.number().positive().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");
  const { id } = await ctx.params;
  const { status, hoursOverride } = await parseBody(req, Body);
  // Override only applies when accepting hours.
  const applyOverride = status === "approved" && typeof hoursOverride === "number";

  if (isMockMode()) {
    const row = getMockStore().volunteerHours.find((h) => h.id === Number(id));
    if (!row) return err(404, "Not found");
    const originalHours = Number(row.hours);
    if (applyOverride) row.hours = hoursOverride;
    row.approvalStatus = status;
    row.approvedBy = s.memberId;
    row.approvedAt = new Date().toISOString();
    const adjusted = applyOverride && hoursOverride !== originalHours;
    await emitNotification({
      recipientId: row.memberId,
      category: status === "approved" ? "hours_approved" : "hours_rejected",
      title: status === "approved"
        ? `${row.hours} volunteer hours approved`
        : `${originalHours} volunteer hours rejected`,
      body: adjusted
        ? `Adjusted from ${originalHours}h to ${row.hours}h${row.title ? ` — ${row.title}` : ""}`
        : row.title ?? null,
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
  if (applyOverride) {
    await query(
      `UPDATE volunteer_hours
          SET approval_status = $1::approval_status,
              approved_by = $2,
              approved_at = NOW(),
              hours = $3
        WHERE volunthr_id = $4`,
      [status, s.memberId, hoursOverride, id],
    );
  } else {
    await query(
      `UPDATE volunteer_hours
          SET approval_status = $1::approval_status, approved_by = $2, approved_at = NOW()
        WHERE volunthr_id = $3`,
      [status, s.memberId, id],
    );
  }
  if (row) {
    const originalHours = Number(row.hours);
    const finalHours = applyOverride ? (hoursOverride as number) : originalHours;
    const adjusted = applyOverride && finalHours !== originalHours;
    await emitNotification({
      recipientId: row.memberId,
      category: status === "approved" ? "hours_approved" : "hours_rejected",
      title: status === "approved"
        ? `${finalHours} volunteer hours approved`
        : `${originalHours} volunteer hours rejected`,
      body: adjusted
        ? `Adjusted from ${originalHours}h to ${finalHours}h${row.title ? ` — ${row.title}` : ""}`
        : row.title,
      linkUrl: "/dashboard",
      sourceType: "volunteer_hours",
      sourceId: Number(id),
    });
  }
  return ok({ success: true });
});
