import { handle, ok } from "@/lib/api";
import { withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const POST = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  await withTx(async (c) => {
    await c.query(
      `UPDATE equipment_checkouts SET returned_at = NOW()
        WHERE equipment_id = $1 AND returned_at IS NULL`,
      [id],
    );
    await c.query(
      `UPDATE equipment SET status = 'available', current_user_id = NULL WHERE equipment_id = $1`,
      [id],
    );
  });
  return ok({ success: true });
});
