import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead, canManageDeptBySlug } from "@/lib/authz";

// `memberId` may be supplied only when an admin / logistics lead is checking
// out gear on someone else's behalf. For ordinary users the body's memberId
// is IGNORED and the session memberId is used instead — this closes H-04
// (anyone could previously check out gear under another member's name).
const Body = z.object({ memberId: z.number().int().optional(), notes: z.string().optional() });

export const POST = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Body);

  const canActForOthers =
    isClubLead(s) || canManageDeptBySlug(s, ["logistics", "media"]);
  const targetMemberId =
    b.memberId !== undefined && b.memberId !== s.memberId
      ? canActForOthers
        ? b.memberId
        : null
      : s.memberId;

  if (targetMemberId === null) {
    return err(403, "Cannot check out equipment for another member");
  }

  await withTx(async (c) => {
    await c.query(
      `INSERT INTO equipment_checkouts (equipment_id, member_id, notes) VALUES ($1,$2,$3)`,
      [id, targetMemberId, b.notes ?? null],
    );
    await c.query(
      `UPDATE equipment SET status = 'in_use', current_user_id = $1 WHERE equipment_id = $2`,
      [targetMemberId, id],
    );
  });
  return ok({ success: true });
});
