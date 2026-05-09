import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  canCreateFinanceRequest,
  createFinanceRequest,
  lookupMemberDisplayName,
  isFinanceManager,
  toFinanceDepartmentSlug,
} from "@/lib/finance";

const Body = z.object({
  departmentSlug: z.string().optional(),
  title: z.string().min(2),
  description: z.string().trim().optional(),
  amountRequested: z.number().positive(),
  currency: z.string().default("SAR"),
  category: z.string().min(2),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  neededBy: z.string().optional(),
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (!canCreateFinanceRequest(session)) return err(403, "Forbidden");

  const body = await parseBody(req, Body);
  const requestedDepartment = toFinanceDepartmentSlug(body.departmentSlug);
  const ownDepartment = toFinanceDepartmentSlug(session.departmentSlug);
  const canManage = isFinanceManager(session);
  const departmentSlug = canManage ? (requestedDepartment ?? ownDepartment) : ownDepartment;

  if (!departmentSlug) return err(400, "A department is required");
  if (!canManage && departmentSlug !== ownDepartment) return err(403, "Forbidden");

  const requestedByName = await lookupMemberDisplayName(session.memberId);
  const nextRequest = await createFinanceRequest({
    departmentSlug,
    title: body.title,
    description: body.description?.trim() || null,
    amountRequested: body.amountRequested,
    currency: body.currency,
    category: body.category,
    priority: body.priority,
    neededBy: body.neededBy || null,
    requestedBy: session.memberId,
    requestedByName,
  });
  if (!nextRequest) return err(404, "Department not found");
  return ok(nextRequest, { status: 201 });
});
