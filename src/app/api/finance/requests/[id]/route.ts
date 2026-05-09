import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { isFinanceManager, updateFinanceRequest } from "@/lib/finance";

const Body = z.object({
  status: z.enum(["pending", "approved", "purchasing", "fulfilled", "rejected"]).optional(),
  approvedAmount: z.number().nonnegative().nullable().optional(),
  assignedToName: z.string().nullable().optional(),
  financeNote: z.string().nullable().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  if (!isFinanceManager(session)) return err(403, "Forbidden");

  const { id } = await ctx.params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId)) return err(400, "Invalid request id");

  const body = await parseBody(req, Body);
  const updated = await updateFinanceRequest(
    requestId,
    {
      status: body.status,
      approvedAmount: body.approvedAmount,
      assignedToName: body.assignedToName,
      financeNote: body.financeNote,
    },
    session.memberId,
  );
  if (!updated) return err(404, "Request not found");
  return ok(updated);
});
