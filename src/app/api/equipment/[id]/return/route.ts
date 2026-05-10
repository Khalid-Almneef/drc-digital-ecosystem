import { handle, ok, err } from "@/lib/api";
import { withTx, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead, canManageDeptBySlug, ownsResource } from "@/lib/authz";

export const POST = handle(async (_req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;

  // Only the member who currently has the gear, club admins, or
  // logistics/media leadership may mark a checkout as returned. Otherwise
  // any member could close out somebody else's checkout (H-04 follow-on).
  const current = await queryOne<{ current_user_id: number | null }>(
    `SELECT current_user_id FROM equipment WHERE equipment_id = $1`,
    [id],
  );
  if (!current) return err(404, "Not found");
  const canActForOthers =
    isClubLead(s) || canManageDeptBySlug(s, ["logistics", "media"]);
  if (!canActForOthers && !ownsResource(s, current.current_user_id)) {
    return err(403, "Forbidden");
  }

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
