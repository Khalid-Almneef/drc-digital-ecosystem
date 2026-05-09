import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const Body = z.object({
  position: z.enum([
    "president", "vice_president", "dept_leader", "dept_vice_leader", "sub_leader", "member",
  ]),
  departmentId: z.number().int().nullable().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await parseBody(req, Body);
  if (body.departmentId !== undefined) {
    await query(
      `UPDATE users SET position = $1::user_position, department_id = $2 WHERE member_id = $3`,
      [body.position, body.departmentId, id],
    );
  } else {
    await query(`UPDATE users SET position = $1::user_position WHERE member_id = $2`, [
      body.position, id,
    ]);
  }
  return ok({ success: true });
});
