import { handle, ok, err } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  getFinanceAllocations,
  getFinanceRequests,
  isFinanceManager,
  summarizeFinance,
  toFinanceDepartmentSlug,
  listFinanceDepartments,
} from "@/lib/finance";

export const GET = handle(async (req) => {
  const session = await requireSession();
  const url = new URL(req.url);
  const requestedDepartment = toFinanceDepartmentSlug(url.searchParams.get("department"));
  const canManage = isFinanceManager(session);

  if (requestedDepartment && !canManage && session.departmentSlug !== requestedDepartment) {
    return err(403, "Forbidden");
  }

  const departments = await listFinanceDepartments();
  const allocations = await getFinanceAllocations();
  const requests = await getFinanceRequests();
  const summary = summarizeFinance(departments, allocations, requests);

  if (requestedDepartment) {
    const department = summary.departments.find((item) => item.slug === requestedDepartment);
    if (!department) return err(404, "Department budget not found");
    return ok({
      canManage,
      department,
      requests: requests.filter((item) => item.departmentSlug === requestedDepartment),
      totals: {
        allocated: department.allocated,
        spent: department.spent,
        committed: department.committed,
        remaining: department.remaining,
        pendingRequests: department.pendingRequests,
      },
    });
  }

  if (!canManage) {
    const ownDepartment = toFinanceDepartmentSlug(session.departmentSlug);
    if (!ownDepartment) return err(403, "Forbidden");
    const department = summary.departments.find((item) => item.slug === ownDepartment);
    if (!department) return err(404, "Department budget not found");
    return ok({
      canManage: false,
      department,
      requests: requests.filter((item) => item.departmentSlug === ownDepartment),
      totals: {
        allocated: department.allocated,
        spent: department.spent,
        committed: department.committed,
        remaining: department.remaining,
        pendingRequests: department.pendingRequests,
      },
    });
  }

  return ok({
    canManage: true,
    departments: summary.departments,
    requests,
    totals: summary.totals,
  });
});
