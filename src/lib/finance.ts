import type { SessionUser } from "@/lib/auth";
import { query, queryOne, withTx } from "@/lib/db";
import {
  findMockMember,
  getMockStore,
  isMockMode,
  siteContentValue,
  upsertSiteContent,
  type MockDepartmentSlug,
} from "@/lib/mock-store";
import { normalizeSiteContentKey } from "@/lib/site-content";

export type FinanceDepartmentSlug = Exclude<MockDepartmentSlug, "executive">;
export type FinanceRequestPriority = "low" | "medium" | "high";
export type FinanceRequestStatus = "pending" | "approved" | "purchasing" | "fulfilled" | "rejected";

export interface FinanceDepartmentMeta {
  slug: FinanceDepartmentSlug;
  name: string;
  nameAr: string;
}

export interface FinanceBudgetAllocation {
  departmentSlug: FinanceDepartmentSlug;
  allocated: number;
  note: string | null;
  distributedAt: string | null;
}

export interface FinancePurchaseRequest {
  requestId: number;
  departmentSlug: FinanceDepartmentSlug;
  title: string;
  description: string | null;
  amountRequested: number;
  approvedAmount: number | null;
  currency: string;
  category: string;
  priority: FinanceRequestPriority;
  status: FinanceRequestStatus;
  requestedBy: number;
  requestedByName: string;
  requestedAt: string;
  neededBy: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  financeNote: string | null;
  fulfilledAt: string | null;
}

export interface FinanceDepartmentSummary extends FinanceDepartmentMeta {
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  pendingRequests: number;
  pendingAmount: number;
  requestCount: number;
}

export interface FinanceTotals {
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  pendingRequests: number;
}

export interface FinanceBudgetHistoryEntry {
  historyId: number;
  departmentSlug: FinanceDepartmentSlug;
  name: string;
  nameAr: string;
  fiscalYear: number;
  previousAllocated: number | null;
  newAllocated: number;
  note: string | null;
  changedBy: number | null;
  changedByName: string;
  changedAt: string;
}

export interface FinanceRequestHistoryEntry {
  historyId: number;
  requestId: number;
  departmentSlug: FinanceDepartmentSlug;
  name: string;
  nameAr: string;
  title: string;
  currentStatus: FinanceRequestStatus;
  requestedAt: string;
  fromStatus: FinanceRequestStatus;
  toStatus: FinanceRequestStatus;
  previousApprovedAmount: number | null;
  newApprovedAmount: number | null;
  previousAssignedToName: string | null;
  newAssignedToName: string | null;
  financeNote: string | null;
  changedBy: number | null;
  changedByName: string;
  changedAt: string;
}

export interface FinanceReportFilters {
  departmentSlug?: FinanceDepartmentSlug | null;
  status?: FinanceRequestStatus | null;
  fiscalYear?: number | null;
}

export interface FinanceRequestReportSnapshot {
  requestCount: number;
  requestedAmount: number;
  pipelineAmount: number;
  fulfilledAmount: number;
  pendingCount: number;
  approvedCount: number;
  purchasingCount: number;
  fulfilledCount: number;
  rejectedCount: number;
}

const BUDGETS_KEY = normalizeSiteContentKey("finance.departmentBudgets");
const REQUESTS_KEY = normalizeSiteContentKey("finance.purchaseRequests");
const BUDGET_HISTORY_KEY = normalizeSiteContentKey("finance.departmentBudgetHistory");
const REQUEST_HISTORY_KEY = normalizeSiteContentKey("finance.purchaseRequestHistory");

const DEFAULT_ALLOCATIONS: Record<FinanceDepartmentSlug, number> = {
  hr: 8000,
  development: 18000,
  innovation: 32000,
  media: 12000,
  pr: 14000,
  finance: 6000,
  logistics: 15000,
  madarat: 9000,
};

const FALLBACK_DEPARTMENTS: FinanceDepartmentMeta[] = [
  { slug: "hr", name: "Human Resources", nameAr: "لجنة الموارد البشرية" },
  { slug: "development", name: "Development", nameAr: "لجنة التطوير" },
  { slug: "innovation", name: "Innovation", nameAr: "لجنة الابتكار" },
  { slug: "media", name: "Media", nameAr: "لجنة الإعلام" },
  { slug: "pr", name: "Public Relations", nameAr: "لجنة العلاقات العامة" },
  { slug: "finance", name: "Finance", nameAr: "اللجنة المالية" },
  { slug: "logistics", name: "Logistics", nameAr: "اللجنة اللوجستية" },
  { slug: "madarat", name: "Madarat", nameAr: "مدارات" },
];

export function toFinanceDepartmentSlug(value: string | null | undefined): FinanceDepartmentSlug | null {
  if (!value || value === "executive") return null;
  if (FALLBACK_DEPARTMENTS.some((department) => department.slug === value)) {
    return value as FinanceDepartmentSlug;
  }
  return null;
}

function clampMoney(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Number(numeric.toFixed(2));
}

function currentFiscalYear() {
  return new Date().getFullYear();
}

function resolveFiscalYear(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
}

function departmentMetaForSlug(departmentSlug: FinanceDepartmentSlug): FinanceDepartmentMeta {
  return FALLBACK_DEPARTMENTS.find((department) => department.slug === departmentSlug) ?? {
    slug: departmentSlug,
    name: departmentSlug,
    nameAr: departmentSlug,
  };
}

function matchesFinanceFilters<T extends { departmentSlug: FinanceDepartmentSlug }>(
  row: T,
  filters: FinanceReportFilters,
  options?: { status?: FinanceRequestStatus | null; fiscalYear?: number | null },
) {
  if (filters.departmentSlug && row.departmentSlug !== filters.departmentSlug) return false;
  if (filters.status && options?.status !== filters.status) return false;
  if (filters.fiscalYear && options?.fiscalYear !== filters.fiscalYear) return false;
  return true;
}

async function readMockFinanceJson<T>(key: string, fallback: T): Promise<T> {
  const value = siteContentValue(key)?.json;
  return (value as T | undefined) ?? fallback;
}

async function writeMockFinanceJson(key: string, value: unknown) {
  const canonicalKey = normalizeSiteContentKey(key);
  upsertSiteContent(canonicalKey, { json: value });
}

type FinanceRequestRow = {
  requestId: number;
  departmentSlug: string;
  title: string;
  description: string | null;
  amountRequested: number;
  approvedAmount: number | null;
  currency: string;
  category: string;
  priority: string;
  status: string;
  requestedBy: number;
  requestedByName: string;
  requestedAt: string;
  neededBy: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  financeNote: string | null;
  fulfilledAt: string | null;
};

function normalizeFinanceRequestRow(row: Partial<FinanceRequestRow>, index: number): FinancePurchaseRequest | null {
  const departmentSlug = toFinanceDepartmentSlug(row.departmentSlug);
  if (!departmentSlug) return null;

  const status: FinanceRequestStatus = ["pending", "approved", "purchasing", "fulfilled", "rejected"].includes(String(row.status))
    ? (row.status as FinanceRequestStatus)
    : "pending";
  const priority: FinanceRequestPriority = ["low", "medium", "high"].includes(String(row.priority))
    ? (row.priority as FinanceRequestPriority)
    : "medium";

  return {
    requestId: Number(row.requestId) || index + 1,
    departmentSlug,
    title: typeof row.title === "string" && row.title.trim().length > 0 ? row.title.trim() : "Untitled request",
    description: typeof row.description === "string" && row.description.trim().length > 0 ? row.description.trim() : null,
    amountRequested: clampMoney(row.amountRequested),
    approvedAmount: row.approvedAmount == null ? null : clampMoney(row.approvedAmount),
    currency: typeof row.currency === "string" && row.currency.trim().length > 0 ? row.currency.trim().toUpperCase() : "SAR",
    category: typeof row.category === "string" && row.category.trim().length > 0 ? row.category.trim() : "Operations",
    priority,
    status,
    requestedBy: Number(row.requestedBy) || 0,
    requestedByName: typeof row.requestedByName === "string" && row.requestedByName.trim().length > 0 ? row.requestedByName.trim() : "Unknown",
    requestedAt: typeof row.requestedAt === "string" ? row.requestedAt : new Date().toISOString(),
    neededBy: typeof row.neededBy === "string" && row.neededBy.length > 0 ? row.neededBy : null,
    assignedToName: typeof row.assignedToName === "string" && row.assignedToName.trim().length > 0 ? row.assignedToName.trim() : null,
    assignedAt: typeof row.assignedAt === "string" ? row.assignedAt : null,
    financeNote: typeof row.financeNote === "string" && row.financeNote.trim().length > 0 ? row.financeNote.trim() : null,
    fulfilledAt: typeof row.fulfilledAt === "string" ? row.fulfilledAt : null,
  };
}

function sortFinanceRequests(requests: FinancePurchaseRequest[]) {
  const statusOrder: Record<FinanceRequestStatus, number> = {
    pending: 0,
    approved: 1,
    purchasing: 2,
    fulfilled: 3,
    rejected: 4,
  };

  return [...requests].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status] || b.requestedAt.localeCompare(a.requestedAt),
  );
}

export function filterFinanceRequests(requests: FinancePurchaseRequest[], filters: FinanceReportFilters) {
  return sortFinanceRequests(
    requests.filter((request) =>
      matchesFinanceFilters(request, filters, {
        status: request.status,
        fiscalYear: resolveFiscalYear(request.requestedAt),
      }),
    ),
  );
}

export function summarizeFinanceRequests(requests: FinancePurchaseRequest[]): FinanceRequestReportSnapshot {
  const snapshot = requests.reduce<FinanceRequestReportSnapshot>(
    (acc, request) => {
      const effectiveAmount = request.approvedAmount ?? request.amountRequested;
      acc.requestCount += 1;
      acc.requestedAmount += request.amountRequested;
      if (request.status === "approved" || request.status === "purchasing") {
        acc.pipelineAmount += effectiveAmount;
      }
      if (request.status === "fulfilled") {
        acc.fulfilledAmount += effectiveAmount;
      }
      if (request.status === "pending") acc.pendingCount += 1;
      if (request.status === "approved") acc.approvedCount += 1;
      if (request.status === "purchasing") acc.purchasingCount += 1;
      if (request.status === "fulfilled") acc.fulfilledCount += 1;
      if (request.status === "rejected") acc.rejectedCount += 1;
      return acc;
    },
    {
      requestCount: 0,
      requestedAmount: 0,
      pipelineAmount: 0,
      fulfilledAmount: 0,
      pendingCount: 0,
      approvedCount: 0,
      purchasingCount: 0,
      fulfilledCount: 0,
      rejectedCount: 0,
    },
  );

  return {
    requestCount: snapshot.requestCount,
    requestedAmount: clampMoney(snapshot.requestedAmount),
    pipelineAmount: clampMoney(snapshot.pipelineAmount),
    fulfilledAmount: clampMoney(snapshot.fulfilledAmount),
    pendingCount: snapshot.pendingCount,
    approvedCount: snapshot.approvedCount,
    purchasingCount: snapshot.purchasingCount,
    fulfilledCount: snapshot.fulfilledCount,
    rejectedCount: snapshot.rejectedCount,
  };
}

async function resolveDepartmentMeta(departmentSlug: FinanceDepartmentSlug) {
  return queryOne<{ departmentId: number; name: string; nameAr: string }>(
    `SELECT department_id AS "departmentId", name, name_ar AS "nameAr"
       FROM departments
      WHERE slug::text = $1`,
    [departmentSlug],
  );
}

export async function listFinanceDepartments(): Promise<FinanceDepartmentMeta[]> {
  if (isMockMode()) {
    return getMockStore().departments
      .map((department) => {
        const slug = toFinanceDepartmentSlug(department.slug);
        if (!slug) return null;
        return {
          slug,
          name: department.name,
          nameAr: department.nameAr,
        };
      })
      .filter((department): department is FinanceDepartmentMeta => department !== null);
  }

  const { rows } = await query<{ slug: string; name: string; nameAr: string }>(
    `SELECT slug::text AS slug, name, name_ar AS "nameAr"
       FROM departments
      WHERE slug::text <> 'executive'
      ORDER BY department_id`,
  );

  return rows
    .map((row) => {
      const slug = toFinanceDepartmentSlug(row.slug);
      if (!slug) return null;
      return { slug, name: row.name, nameAr: row.nameAr };
    })
    .filter((department): department is FinanceDepartmentMeta => department !== null);
}

export async function getFinanceAllocations(): Promise<FinanceBudgetAllocation[]> {
  const departments = await listFinanceDepartments();
  if (isMockMode()) {
    const stored = await readMockFinanceJson<FinanceBudgetAllocation[]>(BUDGETS_KEY, []);

    return departments.map((department) => {
      const existing = Array.isArray(stored)
        ? stored.find((row) => row.departmentSlug === department.slug)
        : null;
      return {
        departmentSlug: department.slug,
        allocated: clampMoney(existing?.allocated ?? DEFAULT_ALLOCATIONS[department.slug] ?? 0),
        note: typeof existing?.note === "string" && existing.note.trim().length > 0 ? existing.note : null,
        distributedAt: typeof existing?.distributedAt === "string" ? existing.distributedAt : null,
      };
    });
  }

  const fiscalYear = currentFiscalYear();
  const { rows } = await query<{
    slug: string;
    allocated: number | null;
    note: string | null;
    distributedAt: string | null;
  }>(
    `SELECT d.slug::text AS slug,
            b.allocated,
            b.note,
            b.distributed_at AS "distributedAt"
       FROM departments d
       LEFT JOIN finance_department_budgets b
         ON b.department_id = d.department_id
        AND b.fiscal_year = $1
      WHERE d.slug::text <> 'executive'
      ORDER BY d.department_id`,
    [fiscalYear],
  );

  return rows
    .map((row) => {
      const departmentSlug = toFinanceDepartmentSlug(row.slug);
      if (!departmentSlug) return null;
      return {
        departmentSlug,
        allocated: clampMoney(row.allocated ?? DEFAULT_ALLOCATIONS[departmentSlug] ?? 0),
        note: row.note?.trim() || null,
        distributedAt: row.distributedAt,
      };
    })
    .filter((row): row is FinanceBudgetAllocation => row !== null);
}

export async function saveFinanceAllocations(allocations: FinanceBudgetAllocation[], updatedBy: number) {
  if (isMockMode()) {
    await writeMockFinanceJson(BUDGETS_KEY, allocations);
    return;
  }

  for (const allocation of allocations) {
    await updateFinanceAllocation(allocation.departmentSlug, allocation.allocated, allocation.note, updatedBy);
  }
}

export async function getFinanceRequests(): Promise<FinancePurchaseRequest[]> {
  if (isMockMode()) {
    const stored = await readMockFinanceJson<FinancePurchaseRequest[]>(REQUESTS_KEY, []);
    if (!Array.isArray(stored)) return [];
    return sortFinanceRequests(
      stored
        .map((row, index) => normalizeFinanceRequestRow(row, index))
        .filter((row): row is FinancePurchaseRequest => row !== null),
    );
  }

  const { rows } = await query<FinanceRequestRow>(
    `SELECT r.request_id AS "requestId",
            d.slug::text AS "departmentSlug",
            r.title,
            r.description,
            r.amount_requested AS "amountRequested",
            r.approved_amount AS "approvedAmount",
            r.currency,
            r.category,
            r.priority,
            r.status,
            r.requested_by AS "requestedBy",
            COALESCE(p.full_name, u.email) AS "requestedByName",
            r.requested_at AS "requestedAt",
            r.needed_by::text AS "neededBy",
            r.assigned_to_name AS "assignedToName",
            r.assigned_at AS "assignedAt",
            r.finance_note AS "financeNote",
            r.fulfilled_at AS "fulfilledAt"
       FROM finance_purchase_requests r
       JOIN departments d ON d.department_id = r.department_id
       JOIN users u ON u.member_id = r.requested_by
       LEFT JOIN profiles p ON p.member_id = u.member_id
      ORDER BY r.requested_at DESC`,
  );

  return sortFinanceRequests(
    rows
      .map((row, index) => normalizeFinanceRequestRow(row, index))
      .filter((row): row is FinancePurchaseRequest => row !== null),
  );
}

export async function listFinanceFiscalYears() {
  if (isMockMode()) {
    const allocations = await getFinanceAllocations();
    const requests = await getFinanceRequests();
    const budgetHistory = await readMockFinanceJson<FinanceBudgetHistoryEntry[]>(BUDGET_HISTORY_KEY, []);
    const requestHistory = await readMockFinanceJson<FinanceRequestHistoryEntry[]>(REQUEST_HISTORY_KEY, []);

    const years = new Set<number>([currentFiscalYear()]);
    for (const allocation of allocations) {
      const year = resolveFiscalYear(allocation.distributedAt);
      if (year) years.add(year);
    }
    for (const request of requests) {
      const year = resolveFiscalYear(request.requestedAt);
      if (year) years.add(year);
    }
    for (const entry of budgetHistory) {
      if (Number.isFinite(entry.fiscalYear)) years.add(entry.fiscalYear);
    }
    for (const entry of requestHistory) {
      const year = resolveFiscalYear(entry.requestedAt) ?? resolveFiscalYear(entry.changedAt);
      if (year) years.add(year);
    }

    return [...years].sort((a, b) => b - a);
  }

  const { rows } = await query<{ fiscalYear: number }>(
    `SELECT DISTINCT fiscal_year AS "fiscalYear"
       FROM (
         SELECT fiscal_year FROM finance_department_budgets
         UNION
         SELECT fiscal_year FROM finance_department_budget_history
         UNION
         SELECT EXTRACT(YEAR FROM requested_at)::int AS fiscal_year FROM finance_purchase_requests
         UNION
         SELECT EXTRACT(YEAR FROM changed_at)::int AS fiscal_year FROM finance_purchase_request_history
       ) years
      ORDER BY fiscal_year DESC`,
  );

  if (rows.length === 0) return [currentFiscalYear()];
  return rows.map((row) => row.fiscalYear);
}

export async function getFinanceBudgetHistory(filters: FinanceReportFilters = {}): Promise<FinanceBudgetHistoryEntry[]> {
  if (isMockMode()) {
    const stored = await readMockFinanceJson<FinanceBudgetHistoryEntry[]>(BUDGET_HISTORY_KEY, []);
    const history =
      stored.length > 0
        ? stored
        : (await getFinanceAllocations()).map((allocation, index) => {
            const department = departmentMetaForSlug(allocation.departmentSlug);
            return {
              historyId: index + 1,
              departmentSlug: department.slug,
              name: department.name,
              nameAr: department.nameAr,
              fiscalYear: resolveFiscalYear(allocation.distributedAt) ?? currentFiscalYear(),
              previousAllocated: null,
              newAllocated: allocation.allocated,
              note: allocation.note,
              changedBy: null,
              changedByName: "Initial distribution",
              changedAt: allocation.distributedAt ?? new Date().toISOString(),
            };
          });

    return [...history]
      .filter((entry) =>
        matchesFinanceFilters(entry, filters, {
          fiscalYear: entry.fiscalYear,
        }),
      )
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  }

  const { rows } = await query<{
    historyId: number;
    departmentSlug: string;
    name: string;
    nameAr: string;
    fiscalYear: number;
    previousAllocated: number | null;
    newAllocated: number;
    note: string | null;
    changedBy: number | null;
    changedByName: string | null;
    changedAt: string;
  }>(
    `SELECT h.history_id AS "historyId",
            d.slug::text AS "departmentSlug",
            d.name,
            d.name_ar AS "nameAr",
            h.fiscal_year AS "fiscalYear",
            h.previous_allocated AS "previousAllocated",
            h.new_allocated AS "newAllocated",
            h.note,
            h.changed_by AS "changedBy",
            COALESCE(p.full_name, u.email, CASE WHEN h.changed_by IS NULL THEN NULL ELSE CONCAT('Member ', h.changed_by) END) AS "changedByName",
            h.changed_at AS "changedAt"
       FROM finance_department_budget_history h
       JOIN departments d ON d.department_id = h.department_id
       LEFT JOIN users u ON u.member_id = h.changed_by
       LEFT JOIN profiles p ON p.member_id = h.changed_by
      WHERE ($1::text IS NULL OR d.slug::text = $1)
        AND ($2::int IS NULL OR h.fiscal_year = $2)
      ORDER BY h.changed_at DESC
      LIMIT 120`,
    [filters.departmentSlug ?? null, filters.fiscalYear ?? null],
  );

  return rows
    .map((row) => {
      const departmentSlug = toFinanceDepartmentSlug(row.departmentSlug);
      if (!departmentSlug) return null;
      return {
        historyId: row.historyId,
        departmentSlug,
        name: row.name,
        nameAr: row.nameAr,
        fiscalYear: row.fiscalYear,
        previousAllocated: row.previousAllocated == null ? null : clampMoney(row.previousAllocated),
        newAllocated: clampMoney(row.newAllocated),
        note: row.note?.trim() || null,
        changedBy: row.changedBy,
        changedByName: row.changedByName?.trim() || "Finance team",
        changedAt: row.changedAt,
      };
    })
    .filter((row): row is FinanceBudgetHistoryEntry => row !== null);
}

export async function getFinanceRequestHistory(filters: FinanceReportFilters = {}): Promise<FinanceRequestHistoryEntry[]> {
  if (isMockMode()) {
    const stored = await readMockFinanceJson<FinanceRequestHistoryEntry[]>(REQUEST_HISTORY_KEY, []);
    return [...stored]
      .filter((entry) =>
        matchesFinanceFilters(entry, filters, {
          status: entry.currentStatus,
          fiscalYear: resolveFiscalYear(entry.requestedAt) ?? resolveFiscalYear(entry.changedAt),
        }),
      )
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  }

  const { rows } = await query<{
    historyId: number;
    requestId: number;
    departmentSlug: string;
    name: string;
    nameAr: string;
    title: string;
    currentStatus: string;
    requestedAt: string;
    fromStatus: string;
    toStatus: string;
    previousApprovedAmount: number | null;
    newApprovedAmount: number | null;
    previousAssignedToName: string | null;
    newAssignedToName: string | null;
    financeNote: string | null;
    changedBy: number | null;
    changedByName: string | null;
    changedAt: string;
  }>(
    `SELECT h.history_id AS "historyId",
            r.request_id AS "requestId",
            d.slug::text AS "departmentSlug",
            d.name,
            d.name_ar AS "nameAr",
            r.title,
            r.status AS "currentStatus",
            r.requested_at AS "requestedAt",
            h.from_status AS "fromStatus",
            h.to_status AS "toStatus",
            h.previous_approved_amount AS "previousApprovedAmount",
            h.new_approved_amount AS "newApprovedAmount",
            h.previous_assigned_to_name AS "previousAssignedToName",
            h.new_assigned_to_name AS "newAssignedToName",
            h.finance_note AS "financeNote",
            h.changed_by AS "changedBy",
            COALESCE(p.full_name, u.email, CASE WHEN h.changed_by IS NULL THEN NULL ELSE CONCAT('Member ', h.changed_by) END) AS "changedByName",
            h.changed_at AS "changedAt"
       FROM finance_purchase_request_history h
       JOIN finance_purchase_requests r ON r.request_id = h.request_id
       JOIN departments d ON d.department_id = r.department_id
       LEFT JOIN users u ON u.member_id = h.changed_by
       LEFT JOIN profiles p ON p.member_id = h.changed_by
      WHERE ($1::text IS NULL OR d.slug::text = $1)
        AND ($2::text IS NULL OR r.status = $2)
        AND ($3::int IS NULL OR EXTRACT(YEAR FROM r.requested_at)::int = $3)
      ORDER BY h.changed_at DESC
      LIMIT 150`,
    [filters.departmentSlug ?? null, filters.status ?? null, filters.fiscalYear ?? null],
  );

  return rows
    .map((row) => {
      const departmentSlug = toFinanceDepartmentSlug(row.departmentSlug);
      if (!departmentSlug) return null;
      if (!["pending", "approved", "purchasing", "fulfilled", "rejected"].includes(row.currentStatus)) return null;
      if (!["pending", "approved", "purchasing", "fulfilled", "rejected"].includes(row.fromStatus)) return null;
      if (!["pending", "approved", "purchasing", "fulfilled", "rejected"].includes(row.toStatus)) return null;

      return {
        historyId: row.historyId,
        requestId: row.requestId,
        departmentSlug,
        name: row.name,
        nameAr: row.nameAr,
        title: row.title,
        currentStatus: row.currentStatus as FinanceRequestStatus,
        requestedAt: row.requestedAt,
        fromStatus: row.fromStatus as FinanceRequestStatus,
        toStatus: row.toStatus as FinanceRequestStatus,
        previousApprovedAmount: row.previousApprovedAmount == null ? null : clampMoney(row.previousApprovedAmount),
        newApprovedAmount: row.newApprovedAmount == null ? null : clampMoney(row.newApprovedAmount),
        previousAssignedToName: row.previousAssignedToName?.trim() || null,
        newAssignedToName: row.newAssignedToName?.trim() || null,
        financeNote: row.financeNote?.trim() || null,
        changedBy: row.changedBy,
        changedByName: row.changedByName?.trim() || "Finance team",
        changedAt: row.changedAt,
      };
    })
    .filter((row): row is FinanceRequestHistoryEntry => row !== null);
}

export async function saveFinanceRequests(requests: FinancePurchaseRequest[], updatedBy: number) {
  if (isMockMode()) {
    await writeMockFinanceJson(REQUESTS_KEY, requests);
    return;
  }

  throw new Error(`Whole finance request sync is not supported in database mode (caller ${updatedBy}).`);
}

export async function updateFinanceAllocation(
  departmentSlug: FinanceDepartmentSlug,
  allocated: number,
  note: string | null,
  updatedBy: number,
): Promise<FinanceBudgetAllocation | null> {
  const nextAllocated = clampMoney(allocated);
  const nextNote = note?.trim() || null;

  if (isMockMode()) {
    const allocations = await getFinanceAllocations();
    const index = allocations.findIndex((item) => item.departmentSlug === departmentSlug);
    const current = index === -1 ? null : allocations[index];
    const nextRow = {
      departmentSlug,
      allocated: nextAllocated,
      note: nextNote,
      distributedAt: new Date().toISOString(),
    };

    if (index === -1) allocations.push(nextRow);
    else allocations[index] = nextRow;

    await writeMockFinanceJson(BUDGETS_KEY, allocations);
    if (!current || current.allocated !== nextAllocated || (current.note ?? null) !== nextNote) {
      const history = await readMockFinanceJson<FinanceBudgetHistoryEntry[]>(BUDGET_HISTORY_KEY, []);
      const department = departmentMetaForSlug(departmentSlug);
      const changedAt = nextRow.distributedAt ?? new Date().toISOString();
      history.unshift({
        historyId: history.reduce((max, entry) => Math.max(max, entry.historyId), 0) + 1,
        departmentSlug: department.slug,
        name: department.name,
        nameAr: department.nameAr,
        fiscalYear: currentFiscalYear(),
        previousAllocated: current?.allocated ?? null,
        newAllocated: nextAllocated,
        note: nextNote,
        changedBy: updatedBy,
        changedByName: findMockMember(updatedBy)?.fullName ?? `Member ${updatedBy}`,
        changedAt,
      });
      await writeMockFinanceJson(BUDGET_HISTORY_KEY, history);
    }
    return nextRow;
  }

  const department = await resolveDepartmentMeta(departmentSlug);
  if (!department) return null;

  return withTx(async (tx) => {
    const fiscalYear = currentFiscalYear();
    const existingResult = await tx.query<{
      budgetId: number;
      allocated: number;
      note: string | null;
    }>(
      `SELECT budget_id AS "budgetId", allocated, note
         FROM finance_department_budgets
        WHERE department_id = $1 AND fiscal_year = $2`,
      [department.departmentId, fiscalYear],
    );
    const existing = existingResult.rows[0] ?? null;

    const upsertResult = await tx.query<{
      budgetId: number;
      allocated: number;
      note: string | null;
      distributedAt: string | null;
    }>(
      `INSERT INTO finance_department_budgets (
          department_id, fiscal_year, allocated, note, distributed_at, distributed_by
       )
       VALUES ($1, $2, $3, $4, NOW(), $5)
       ON CONFLICT (department_id, fiscal_year) DO UPDATE
         SET allocated = EXCLUDED.allocated,
             note = EXCLUDED.note,
             distributed_at = NOW(),
             distributed_by = EXCLUDED.distributed_by,
             updated_at = NOW()
       RETURNING budget_id AS "budgetId",
                 allocated,
                 note,
                 distributed_at AS "distributedAt"`,
      [department.departmentId, fiscalYear, nextAllocated, nextNote, updatedBy],
    );

    const updated = upsertResult.rows[0];
    if (!updated) return null;

    if (!existing || existing.allocated !== nextAllocated || (existing.note ?? null) !== nextNote) {
      await tx.query(
        `INSERT INTO finance_department_budget_history (
            budget_id, department_id, fiscal_year, previous_allocated, new_allocated, note, changed_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          updated.budgetId,
          department.departmentId,
          fiscalYear,
          existing?.allocated ?? null,
          nextAllocated,
          nextNote,
          updatedBy,
        ],
      );
    }

    return {
      departmentSlug,
      allocated: clampMoney(updated.allocated),
      note: updated.note?.trim() || null,
      distributedAt: updated.distributedAt,
    };
  });
}

type CreateFinanceRequestInput = {
  departmentSlug: FinanceDepartmentSlug;
  title: string;
  description: string | null;
  amountRequested: number;
  currency: string;
  category: string;
  priority: FinanceRequestPriority;
  neededBy: string | null;
  requestedBy: number;
  requestedByName: string;
};

export async function createFinanceRequest(input: CreateFinanceRequestInput): Promise<FinancePurchaseRequest | null> {
  if (isMockMode()) {
    const requests = await getFinanceRequests();
    const requestId = requests.reduce((max, item) => Math.max(max, item.requestId), 0) + 1;
    const nextRequest: FinancePurchaseRequest = {
      requestId,
      departmentSlug: input.departmentSlug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      amountRequested: clampMoney(input.amountRequested),
      approvedAmount: null,
      currency: input.currency.trim().toUpperCase(),
      category: input.category.trim(),
      priority: input.priority,
      status: "pending",
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      requestedAt: new Date().toISOString(),
      neededBy: input.neededBy || null,
      assignedToName: null,
      assignedAt: null,
      financeNote: null,
      fulfilledAt: null,
    };
    await writeMockFinanceJson(REQUESTS_KEY, [nextRequest, ...requests]);
    return nextRequest;
  }

  const department = await resolveDepartmentMeta(input.departmentSlug);
  if (!department) return null;

  const { rows } = await query<{ requestId: number }>(
    `INSERT INTO finance_purchase_requests (
        department_id,
        title,
        description,
        amount_requested,
        currency,
        category,
        priority,
        requested_by,
        needed_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date)
     RETURNING request_id AS "requestId"`,
    [
      department.departmentId,
      input.title.trim(),
      input.description?.trim() || null,
      clampMoney(input.amountRequested),
      input.currency.trim().toUpperCase(),
      input.category.trim(),
      input.priority,
      input.requestedBy,
      input.neededBy,
    ],
  );

  const requestId = rows[0]?.requestId;
  if (!requestId) return null;
  return (await getFinanceRequests()).find((item) => item.requestId === requestId) ?? null;
}

type UpdateFinanceRequestInput = {
  status?: FinanceRequestStatus;
  approvedAmount?: number | null;
  assignedToName?: string | null;
  financeNote?: string | null;
};

export async function updateFinanceRequest(
  requestId: number,
  patch: UpdateFinanceRequestInput,
  updatedBy: number,
): Promise<FinancePurchaseRequest | null> {
  if (isMockMode()) {
    const requests = await getFinanceRequests();
    const index = requests.findIndex((item) => item.requestId === requestId);
    if (index === -1) return null;
    const current = requests[index];
    const nextStatus = patch.status ?? current.status;
    const nextAssignedToName =
      patch.assignedToName === undefined
        ? current.assignedToName
        : patch.assignedToName?.trim() || null;
    const now = new Date().toISOString();
    requests[index] = {
      ...current,
      status: nextStatus,
      approvedAmount:
        patch.approvedAmount === undefined
          ? current.approvedAmount
          : patch.approvedAmount === null
            ? null
            : clampMoney(patch.approvedAmount),
      assignedToName: nextAssignedToName,
      assignedAt:
        patch.assignedToName === undefined
          ? current.assignedAt
          : nextAssignedToName
            ? current.assignedAt ?? now
            : null,
      financeNote:
        patch.financeNote === undefined
          ? current.financeNote
          : patch.financeNote?.trim() || null,
      fulfilledAt: nextStatus === "fulfilled" ? current.fulfilledAt ?? now : null,
    };
    await writeMockFinanceJson(REQUESTS_KEY, requests);
    const updated = requests[index];
    const changed =
      nextStatus !== current.status ||
      updated.approvedAmount !== current.approvedAmount ||
      updated.assignedToName !== current.assignedToName ||
      updated.financeNote !== current.financeNote ||
      updated.fulfilledAt !== current.fulfilledAt;
    if (changed) {
      const history = await readMockFinanceJson<FinanceRequestHistoryEntry[]>(REQUEST_HISTORY_KEY, []);
      const department = departmentMetaForSlug(current.departmentSlug);
      history.unshift({
        historyId: history.reduce((max, entry) => Math.max(max, entry.historyId), 0) + 1,
        requestId: current.requestId,
        departmentSlug: department.slug,
        name: department.name,
        nameAr: department.nameAr,
        title: current.title,
        currentStatus: updated.status,
        requestedAt: current.requestedAt,
        fromStatus: current.status,
        toStatus: updated.status,
        previousApprovedAmount: current.approvedAmount,
        newApprovedAmount: updated.approvedAmount,
        previousAssignedToName: current.assignedToName,
        newAssignedToName: updated.assignedToName,
        financeNote: updated.financeNote,
        changedBy: updatedBy,
        changedByName: findMockMember(updatedBy)?.fullName ?? `Member ${updatedBy}`,
        changedAt: now,
      });
      await writeMockFinanceJson(REQUEST_HISTORY_KEY, history);
    }
    return updated;
  }

  return withTx(async (tx) => {
    const currentResult = await tx.query<FinanceRequestRow>(
      `SELECT r.request_id AS "requestId",
              d.slug::text AS "departmentSlug",
              r.title,
              r.description,
              r.amount_requested AS "amountRequested",
              r.approved_amount AS "approvedAmount",
              r.currency,
              r.category,
              r.priority,
              r.status,
              r.requested_by AS "requestedBy",
              COALESCE(p.full_name, u.email) AS "requestedByName",
              r.requested_at AS "requestedAt",
              r.needed_by::text AS "neededBy",
              r.assigned_to_name AS "assignedToName",
              r.assigned_at AS "assignedAt",
              r.finance_note AS "financeNote",
              r.fulfilled_at AS "fulfilledAt"
         FROM finance_purchase_requests r
         JOIN departments d ON d.department_id = r.department_id
         JOIN users u ON u.member_id = r.requested_by
         LEFT JOIN profiles p ON p.member_id = u.member_id
        WHERE r.request_id = $1`,
      [requestId],
    );

    const current = normalizeFinanceRequestRow(currentResult.rows[0] ?? {}, 0);
    if (!current) return null;

    const nextStatus = patch.status ?? current.status;
    const nextApprovedAmount =
      patch.approvedAmount === undefined
        ? current.approvedAmount
        : patch.approvedAmount === null
          ? null
          : clampMoney(patch.approvedAmount);
    const nextAssignedToName =
      patch.assignedToName === undefined
        ? current.assignedToName
        : patch.assignedToName?.trim() || null;
    const nextFinanceNote =
      patch.financeNote === undefined
        ? current.financeNote
        : patch.financeNote?.trim() || null;
    const now = new Date().toISOString();
    const nextAssignedAt =
      patch.assignedToName === undefined
        ? current.assignedAt
        : nextAssignedToName
          ? current.assignedAt ?? now
          : null;
    const nextFulfilledAt = nextStatus === "fulfilled" ? current.fulfilledAt ?? now : null;
    const changed =
      nextStatus !== current.status ||
      nextApprovedAmount !== current.approvedAmount ||
      nextAssignedToName !== current.assignedToName ||
      nextFinanceNote !== current.financeNote ||
      nextFulfilledAt !== current.fulfilledAt;

    await tx.query(
      `UPDATE finance_purchase_requests
          SET status = $2,
              approved_amount = $3,
              assigned_to_name = $4,
              assigned_at = $5::timestamptz,
              finance_note = $6,
              fulfilled_at = $7::timestamptz,
              decided_by = CASE WHEN $8 THEN $9 ELSE decided_by END,
              decided_at = CASE WHEN $8 THEN NOW() ELSE decided_at END,
              updated_at = NOW()
        WHERE request_id = $1`,
      [
        requestId,
        nextStatus,
        nextApprovedAmount,
        nextAssignedToName,
        nextAssignedAt,
        nextFinanceNote,
        nextFulfilledAt,
        changed,
        updatedBy,
      ],
    );

    if (changed) {
      await tx.query(
        `INSERT INTO finance_purchase_request_history (
            request_id,
            from_status,
            to_status,
            previous_approved_amount,
            new_approved_amount,
            previous_assigned_to_name,
            new_assigned_to_name,
            finance_note,
            changed_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          requestId,
          current.status,
          nextStatus,
          current.approvedAmount,
          nextApprovedAmount,
          current.assignedToName,
          nextAssignedToName,
          nextFinanceNote,
          updatedBy,
        ],
      );
    }

    const updatedResult = await tx.query<FinanceRequestRow>(
      `SELECT r.request_id AS "requestId",
              d.slug::text AS "departmentSlug",
              r.title,
              r.description,
              r.amount_requested AS "amountRequested",
              r.approved_amount AS "approvedAmount",
              r.currency,
              r.category,
              r.priority,
              r.status,
              r.requested_by AS "requestedBy",
              COALESCE(p.full_name, u.email) AS "requestedByName",
              r.requested_at AS "requestedAt",
              r.needed_by::text AS "neededBy",
              r.assigned_to_name AS "assignedToName",
              r.assigned_at AS "assignedAt",
              r.finance_note AS "financeNote",
              r.fulfilled_at AS "fulfilledAt"
         FROM finance_purchase_requests r
         JOIN departments d ON d.department_id = r.department_id
         JOIN users u ON u.member_id = r.requested_by
         LEFT JOIN profiles p ON p.member_id = u.member_id
        WHERE r.request_id = $1`,
      [requestId],
    );

    return normalizeFinanceRequestRow(updatedResult.rows[0] ?? {}, 0);
  });
}

export async function lookupMemberDisplayName(memberId: number): Promise<string> {
  if (isMockMode()) {
    return findMockMember(memberId)?.fullName ?? `Member ${memberId}`;
  }

  const row = await queryOne<{ fullName: string | null; email: string }>(
    `SELECT p.full_name AS "fullName", u.email
       FROM users u
       LEFT JOIN profiles p ON p.member_id = u.member_id
      WHERE u.member_id = $1`,
    [memberId],
  );
  return row?.fullName ?? row?.email ?? `Member ${memberId}`;
}

export function isFinanceManager(session: SessionUser) {
  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isFinanceLeader =
    (session.position === "dept_leader" || session.position === "dept_vice_leader") &&
    session.departmentSlug === "finance";
  return isAdmin || isFinanceLeader;
}

export function canCreateFinanceRequest(session: SessionUser) {
  if (isFinanceManager(session)) return true;
  return ["dept_leader", "dept_vice_leader", "sub_leader"].includes(session.position);
}

export function summarizeFinance(
  departments: FinanceDepartmentMeta[],
  allocations: FinanceBudgetAllocation[],
  requests: FinancePurchaseRequest[],
) {
  const summaries: FinanceDepartmentSummary[] = departments.map((department) => {
    const allocation = allocations.find((row) => row.departmentSlug === department.slug);
    const departmentRequests = requests.filter((request) => request.departmentSlug === department.slug);

    let spent = 0;
    let committed = 0;
    let pendingRequests = 0;
    let pendingAmount = 0;

    for (const request of departmentRequests) {
      const effectiveAmount = request.approvedAmount ?? request.amountRequested;
      if (request.status === "fulfilled") {
        spent += effectiveAmount;
      } else if (request.status === "approved" || request.status === "purchasing") {
        committed += effectiveAmount;
      } else if (request.status === "pending") {
        pendingRequests += 1;
        pendingAmount += request.amountRequested;
      }
    }

    const allocated = clampMoney(allocation?.allocated ?? DEFAULT_ALLOCATIONS[department.slug] ?? 0);
    return {
      ...department,
      allocated,
      spent: clampMoney(spent),
      committed: clampMoney(committed),
      remaining: clampMoney(allocated - spent - committed),
      pendingRequests,
      pendingAmount: clampMoney(pendingAmount),
      requestCount: departmentRequests.length,
    };
  });

  const totals = summaries.reduce<FinanceTotals>(
    (acc, department) => ({
      allocated: acc.allocated + department.allocated,
      spent: acc.spent + department.spent,
      committed: acc.committed + department.committed,
      remaining: acc.remaining + department.remaining,
      pendingRequests: acc.pendingRequests + department.pendingRequests,
    }),
    { allocated: 0, spent: 0, committed: 0, remaining: 0, pendingRequests: 0 },
  );

  return {
    departments: summaries,
    totals: {
      allocated: clampMoney(totals.allocated),
      spent: clampMoney(totals.spent),
      committed: clampMoney(totals.committed),
      remaining: clampMoney(totals.remaining),
      pendingRequests: totals.pendingRequests,
    },
  };
}
