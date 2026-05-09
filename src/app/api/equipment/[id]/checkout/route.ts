import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const Body = z.object({ memberId: z.number().int(), notes: z.string().optional() });

export const POST = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Body);
  await withTx(async (c) => {
    await c.query(
      `INSERT INTO equipment_checkouts (equipment_id, member_id, notes) VALUES ($1,$2,$3)`,
      [id, b.memberId, b.notes ?? null],
    );
    await c.query(
      `UPDATE equipment SET status = 'in_use', current_user_id = $1 WHERE equipment_id = $2`,
      [b.memberId, id],
    );
  });
  return ok({ success: true });
});
