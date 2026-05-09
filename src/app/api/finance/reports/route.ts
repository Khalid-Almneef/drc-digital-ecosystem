import { z } from "zod";
import { err, handle, ok, parseQuery } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  filterFinanceRequests,
  getFinanceBudgetHistory,
  getFinanceRequestHistory,
  getFinanceRequests,
  isFinanceManager,
  listFinanceFiscalYears,
  summarizeFinanceRequests,
  toFinanceDepartmentSlug,
  type FinanceRequestStatus,
} from "@/lib/finance";

const REQUEST_STATUSES: FinanceRequestStatus[] = ["pending", "approved", "purchasing", "fulfilled", "rejected"];

const Query = z.object({
  department: z.string().optional().default("all"),
  status: z.string().optional().default("all"),
  fiscalYear: z.string().optional().default(String(new Date().getFullYear())),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export const GET = handle(async (req) => {
  const session = await requireSession();
  if (!isFinanceManager(session)) return err(403, "Forbidden");

  const url = new URL(req.url);
  const raw = parseQuery(url, Query);

  const departmentSlug = raw.department === "all" ? null : toFinanceDepartmentSlug(raw.department);
  if (raw.department !== "all" && !departmentSlug) return err(400, "Invalid department filter");

  const status = raw.status === "all" ? null : raw.status;
  if (status && !REQUEST_STATUSES.includes(status as FinanceRequestStatus)) {
    return err(400, "Invalid status filter");
  }

  let fiscalYear: number | null = null;
  if (raw.fiscalYear !== "all") {
    const parsedYear = Number(raw.fiscalYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
      return err(400, "Invalid fiscal year filter");
    }
    fiscalYear = parsedYear;
  }

  const filters = {
    departmentSlug,
    status: status as FinanceRequestStatus | null,
    fiscalYear,
  };

  const [allRequests, budgetHistory, requestHistory, years] = await Promise.all([
    getFinanceRequests(),
    getFinanceBudgetHistory(filters),
    getFinanceRequestHistory(filters),
    listFinanceFiscalYears(),
  ]);
  const requests = filterFinanceRequests(allRequests, filters);
  const snapshot = summarizeFinanceRequests(requests);

  if (raw.format === "csv") {
    const header = [
      "Request ID",
      "Department",
      "Title",
      "Category",
      "Priority",
      "Status",
      "Requested Amount",
      "Approved Amount",
      "Currency",
      "Requested By",
      "Requested At",
      "Needed By",
      "Assigned Buyer",
      "Finance Note",
    ];
    const rows = requests.map((request) => [
      request.requestId,
      request.departmentSlug,
      request.title,
      request.category,
      request.priority,
      request.status,
      request.amountRequested,
      request.approvedAmount ?? "",
      request.currency,
      request.requestedByName,
      request.requestedAt,
      request.neededBy ?? "",
      request.assignedToName ?? "",
      request.financeNote ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const yearLabel = fiscalYear ?? "all";
    const departmentLabel = departmentSlug ?? "all";
    const statusLabel = status ?? "all";

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-requests-${departmentLabel}-${statusLabel}-${yearLabel}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return ok({
    filters: {
      departmentSlug,
      status: status as FinanceRequestStatus | null,
      fiscalYear,
    },
    years,
    requests,
    budgetHistory,
    requestHistory,
    snapshot,
  });
});
