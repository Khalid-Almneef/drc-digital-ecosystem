import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  isFinanceManager,
  toFinanceDepartmentSlug,
  updateFinanceAllocation,
} from "@/lib/finance";
import { submitChangeRequest, resolveDepartmentId } from "@/lib/change-requests";

const Body = z.object({
  allocated: z.number().nonnegative(),
  note: z.string().nullable().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();

  const { slug } = await ctx.params;
  const departmentSlug = toFinanceDepartmentSlug(slug);
  if (!departmentSlug) return err(404, "Department not found");

  const body = await parseBody(req, Body);

  // Non-finance-managers queue this as a change_request to finance leadership.
  if (!isFinanceManager(session)) {
    const financeDeptId = await resolveDepartmentId("finance");
    if (!financeDeptId) return err(500, "Finance department not configured");
    const requestId = await submitChangeRequest({
      type: "update_budget_allocation",
      departmentId: financeDeptId,
      requesterId: session.memberId,
      payload: {
        departmentSlug,
        allocated: body.allocated,
        note: body.note?.trim() || null,
      },
      summary: `Update ${departmentSlug} budget allocation to ${body.allocated} SAR`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }

  const updated = await updateFinanceAllocation(
    departmentSlug,
    body.allocated,
    body.note?.trim() || null,
    session.memberId,
  );
  if (!updated) return err(404, "Allocation not found");
  return ok(updated);
});
