import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { emitNotification } from "@/lib/notifications";
import { submitChangeRequest, resolveDepartmentId } from "@/lib/change-requests";

const Body = z.object({ status: z.enum(["approved", "rejected"]) });

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isFinance = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "finance";
  const { id } = await ctx.params;
  const { status } = await parseBody(req, Body);

  // Non-finance-leaders queue this as a change_request to finance leadership.
  if (!isAdmin && !isFinance) {
    const financeDeptId = await resolveDepartmentId("finance");
    if (!financeDeptId) return err(500, "Finance department not configured");
    const requestId = await submitChangeRequest({
      type: "decide_expense",
      departmentId: financeDeptId,
      requesterId: s.memberId,
      targetId: Number(id),
      payload: { status },
      summary: `${status === "approved" ? "Approve" : "Reject"} expense #${id}`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }
  const expense = await queryOne<{ requested_by: number; description: string; amount: string }>(
    `SELECT requested_by, description, amount FROM expenses WHERE expense_id = $1`,
    [id],
  );
  await query(
    `UPDATE expenses SET approval_status = $1::approval_status, approved_by = $2, approved_at = NOW()
     WHERE expense_id = $3`,
    [status, s.memberId, id],
  );
  if (expense) {
    void emitNotification({
      recipientId: expense.requested_by,
      category: "expense_decision",
      title: status === "approved"
        ? `Purchase request approved: ${expense.description}`
        : `Purchase request rejected: ${expense.description}`,
      body: `Amount: ${expense.amount} SAR`,
      linkUrl: "/dashboard/finance",
      sourceType: "expense",
      sourceId: Number(id),
    });
  }
  return ok({ success: true });
});
