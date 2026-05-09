import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  await requireSession();
  // Mock mode has no expenses table seeded; return an empty list so the
  // dashboard renders without crashing.
  if (isMockMode()) return ok([]);
  const { rows } = await query(
    `SELECT e.expense_id AS "expenseId", e.description, e.amount, e.currency,
            e.approval_status::text AS "approvalStatus", e.expense_date AS "expenseDate",
            e.receipt_url AS "receiptUrl", c.name AS "categoryName",
            p.full_name AS "requestedByName"
       FROM expenses e
       JOIN budget_categories c ON c.category_id = e.category_id
       LEFT JOIN profiles p ON p.member_id = e.requested_by
      ORDER BY e.expense_date DESC`,
  );
  return ok(rows);
});

const Post = z.object({
  categoryId: z.number().int(),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("SAR"),
  receiptUrl: z.string().optional(),
  expenseDate: z.string().optional(),
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);
  const { rows } = await query<{ expense_id: number }>(
    `INSERT INTO expenses (category_id, description, amount, currency, receipt_url,
       requested_by, expense_date)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE)) RETURNING expense_id`,
    [b.categoryId, b.description, b.amount, b.currency, b.receiptUrl ?? null, s.memberId, b.expenseDate ?? null],
  );
  return ok({ expenseId: rows[0].expense_id }, { status: 201 });
});
