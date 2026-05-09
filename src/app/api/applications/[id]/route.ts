import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const Body = z.object({
  status: z.enum(["pending", "interview", "accepted", "rejected"]).optional(),
  reviewNotes: z.string().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");

  const { id } = await ctx.params;
  const body = await parseBody(req, Body);
  const sets: string[] = [];
  const params: unknown[] = [id];
  if (body.status) { params.push(body.status); sets.push(`status = $${params.length}::application_status`); }
  if (body.reviewNotes !== undefined) { params.push(body.reviewNotes); sets.push(`review_notes = $${params.length}`); }
  sets.push(`reviewed_by = ${params.length + 1}`); params.push(s.memberId);
  sets.push(`reviewed_date = CURRENT_DATE`);
  await query(`UPDATE membership_applications SET ${sets.join(", ")} WHERE application_id = $1`, params);
  return ok({ success: true });
});
