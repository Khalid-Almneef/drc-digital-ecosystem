"use client";

import { useMemo, useState } from "react";
import { Download, FileClock, Loader2, ReceiptText, Wallet } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FinanceNav } from "@/components/dashboard/FinanceNav";
import { ImportExportToolbar } from "@/components/dashboard/ImportExportToolbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { api } from "@/lib/client";
import { useApi } from "@/lib/hooks/useApi";
import { toCsv } from "@/lib/csv";
import type {
  FinanceBudgetHistoryEntry,
  FinancePurchaseRequest,
  FinanceRequestHistoryEntry,
  FinanceRequestReportSnapshot,
  FinanceRequestStatus,
} from "@/lib/finance";

type DepartmentFilter =
  | "all"
  | "hr"
  | "development"
  | "innovation"
  | "media"
  | "pr"
  | "finance"
  | "logistics"
  | "madarat";

interface FinanceReportsResponse {
  filters: {
    departmentSlug: DepartmentFilter | null;
    status: FinanceRequestStatus | null;
    fiscalYear: number | null;
  };
  years: number[];
  requests: FinancePurchaseRequest[];
  budgetHistory: FinanceBudgetHistoryEntry[];
  requestHistory: FinanceRequestHistoryEntry[];
  snapshot: FinanceRequestReportSnapshot;
}

const STATUS_TONE: Record<FinanceRequestStatus, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  purchasing: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  fulfilled: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  rejected: "bg-red-400/10 text-red-300 border-red-400/20",
};

const DEPARTMENT_OPTIONS: Array<{ value: DepartmentFilter; label: string }> = [
  { value: "all", label: "All departments" },
  { value: "development", label: "Development" },
  { value: "innovation", label: "Innovation" },
  { value: "media", label: "Media" },
  { value: "pr", label: "Public Relations" },
  { value: "hr", label: "Human Resources" },
  { value: "finance", label: "Finance" },
  { value: "logistics", label: "Logistics" },
  { value: "madarat", label: "Madarat" },
];

const STATUS_OPTIONS: Array<{ value: "all" | FinanceRequestStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "purchasing", label: "Purchasing" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "rejected", label: "Rejected" },
];

function formatMoney(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} SAR`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function buildQuery(filters: { department: DepartmentFilter; status: "all" | FinanceRequestStatus; fiscalYear: string }) {
  const params = new URLSearchParams();
  params.set("department", filters.department);
  params.set("status", filters.status);
  params.set("fiscalYear", filters.fiscalYear);
  return params.toString();
}

export default function FinanceReportsPage() {
  const currentYear = String(new Date().getFullYear());
  const [filters, setFilters] = useState<{ department: DepartmentFilter; status: "all" | FinanceRequestStatus; fiscalYear: string }>({
    department: "all",
    status: "all",
    fiscalYear: currentYear,
  });
  const { data: reports = null, isLoading: loading, error: reportError, mutate: refreshReports } = useApi<FinanceReportsResponse>(
    `/api/finance/reports?${buildQuery(filters)}`,
  );
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(reportError ? reportError.message : null);

  const yearOptions = useMemo(() => {
    const years = reports?.years ?? [Number(currentYear)];
    const unique = [...new Set(years)].sort((a, b) => b - a);
    return ["all", ...unique.map((year) => String(year))];
  }, [currentYear, reports?.years]);

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams(buildQuery(filters));
      params.set("format", "csv");
      const res = await fetch(`/api/finance/reports?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to export finance requests.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `finance-requests-${filters.department}-${filters.status}-${filters.fiscalYear}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to export finance requests.");
    } finally {
      setExporting(false);
    }
  }

  function getRequestCsv() {
    return toCsv(
      ["departmentSlug", "title", "description", "amountRequested", "currency", "category", "priority", "neededBy"],
      (reports?.requests ?? []).map((request) => [
        request.departmentSlug,
        request.title,
        request.description ?? "",
        request.amountRequested,
        request.currency,
        request.category,
        request.priority,
        request.neededBy ?? "",
      ]),
    );
  }

  function getRequestTemplateCsv() {
    return toCsv(
      ["departmentSlug", "title", "description", "amountRequested", "currency", "category", "priority", "neededBy"],
      [["innovation", "Prototype materials", "Short finance context", 1500, "SAR", "Equipment", "medium", ""]],
    );
  }

  async function importRequests(rows: Record<string, string>[]) {
    setErrorMessage(null);
    for (const row of rows) {
      if (!row.title?.trim()) continue;
      await api.post("/api/finance/requests", {
        departmentSlug: row.departmentSlug?.trim() || undefined,
        title: row.title.trim(),
        description: row.description?.trim() || undefined,
        amountRequested: Number(row.amountRequested || 0),
        currency: row.currency?.trim() || "SAR",
        category: row.category?.trim() || "General",
        priority: (row.priority?.trim() || "medium") as "low" | "medium" | "high",
        neededBy: row.neededBy?.trim() || undefined,
      });
    }
    void refreshReports();
  }

  const snapshot = reports?.snapshot ?? {
    requestCount: 0,
    requestedAmount: 0,
    pipelineAmount: 0,
    fulfilledAmount: 0,
    pendingCount: 0,
    approvedCount: 0,
    purchasingCount: 0,
    fulfilledCount: 0,
    rejectedCount: 0,
  };

  const selectCls = "dashboard-select";
  const cardCls = "rounded-3xl border border-border bg-surface/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]";

  return (
    <div>
      <DashboardHeader
        title="Finance Reporting"
        description="Audit budget shifts, inspect procurement history, and export filtered request lists for handoff or review."
      />
      <FinanceNav />

      <div className={`${cardCls} flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between`}>
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">Department</label>
            <select
              value={filters.department}
              onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value as DepartmentFilter }))}
              className={selectCls}
            >
              {DEPARTMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">Request status</label>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as "all" | FinanceRequestStatus }))}
              className={selectCls}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">Fiscal year</label>
            <select
              value={filters.fiscalYear}
              onChange={(event) => setFilters((current) => ({ ...current, fiscalYear: event.target.value }))}
              className={selectCls}
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All years" : option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void exportCsv()}
            disabled={loading || exporting}
            className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Export requests CSV
          </button>
          <ImportExportToolbar
            exportFilename={`finance-requests-${filters.department}-${filters.status}-${filters.fiscalYear}.csv`}
            templateFilename="finance-requests-template.csv"
            getExportCsv={getRequestCsv}
            getTemplateCsv={getRequestTemplateCsv}
            onImportRows={importRequests}
            exportLabel="Quick export"
            templateLabel="Request template"
            importLabel="Import requests"
          />
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">{errorMessage}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ReceiptText} label="Matching Requests" value={snapshot.requestCount} />
        <StatCard icon={Wallet} label="Requested Value" value={formatMoney(snapshot.requestedAmount)} />
        <StatCard icon={FileClock} label="Pipeline Value" value={formatMoney(snapshot.pipelineAmount)} />
        <StatCard icon={Download} label="Fulfilled Value" value={formatMoney(snapshot.fulfilledAmount)} />
      </div>

      <div className="mt-8 grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
        <section className={cardCls}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Filtered Requests</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Procurement view</h2>
              <p className="mt-2 text-sm text-muted">
                {snapshot.pendingCount} pending, {snapshot.approvedCount + snapshot.purchasingCount} in progress, {snapshot.fulfilledCount} fulfilled, {snapshot.rejectedCount} rejected.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              [0, 1, 2].map((item) => <div key={item} className="h-36 rounded-2xl border border-border bg-surface-elevated/60 animate-pulse" />)
            ) : reports?.requests.length ? (
              reports.requests.map((request) => (
                <div key={request.requestId} className="rounded-2xl border border-border bg-surface-elevated/50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{request.title}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[request.status]}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {request.departmentSlug} · {request.category} · Requested by {request.requestedByName}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-muted">
                        {request.description || "No additional context was provided with this request."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-foreground">{formatMoney(request.amountRequested)}</p>
                      <p className="mt-1 text-[11px] text-muted">Requested</p>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        {request.approvedAmount != null ? formatMoney(request.approvedAmount) : "Pending"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">Approved</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-muted md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="font-medium text-foreground">Requested at</p>
                      <p className="mt-1">{formatDate(request.requestedAt)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Need by</p>
                      <p className="mt-1">{formatDate(request.neededBy)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Assigned buyer</p>
                      <p className="mt-1">{request.assignedToName || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Finance note</p>
                      <p className="mt-1">{request.financeNote || "No finance note yet."}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface-elevated/40 px-4 py-10 text-center text-sm text-muted">
                No requests match the current report filters.
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className={cardCls}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Budget History</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">Allocation audit trail</h2>
              </div>
              <p className="text-sm text-muted">{reports?.budgetHistory.length ?? 0} changes</p>
            </div>

            <div className="mt-5 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
              {loading ? (
                [0, 1, 2].map((item) => <div key={item} className="h-24 rounded-2xl border border-border bg-surface-elevated/60 animate-pulse" />)
              ) : reports?.budgetHistory.length ? (
                reports.budgetHistory.map((entry) => (
                  <div key={entry.historyId} className="rounded-2xl border border-border bg-surface-elevated/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{entry.name}</h3>
                        <p className="mt-1 text-xs text-muted">
                          FY {entry.fiscalYear} · {formatDate(entry.changedAt)} · {entry.changedByName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatMoney(entry.newAllocated)}</p>
                        <p className="mt-1 text-[11px] text-muted">
                          Was {entry.previousAllocated != null ? formatMoney(entry.previousAllocated) : "not set"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted">{entry.note || "No note attached to this allocation update."}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface-elevated/40 px-4 py-8 text-center text-sm text-muted">
                  No budget changes were recorded for this filter set.
                </div>
              )}
            </div>
          </section>

          <section className={cardCls}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Request History</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">Decision log</h2>
              </div>
              <p className="text-sm text-muted">{reports?.requestHistory.length ?? 0} updates</p>
            </div>

            <div className="mt-5 space-y-3 max-h-[32rem] overflow-y-auto pr-1">
              {loading ? (
                [0, 1, 2].map((item) => <div key={item} className="h-28 rounded-2xl border border-border bg-surface-elevated/60 animate-pulse" />)
              ) : reports?.requestHistory.length ? (
                reports.requestHistory.map((entry) => (
                  <div key={entry.historyId} className="rounded-2xl border border-border bg-surface-elevated/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[entry.toStatus]}`}>
                        {entry.fromStatus} to {entry.toStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {entry.name} · {formatDate(entry.changedAt)} · {entry.changedByName}
                    </p>
                    <div className="mt-4 grid gap-3 text-xs text-muted sm:grid-cols-2">
                      <div>
                        <p className="font-medium text-foreground">Approval amount</p>
                        <p className="mt-1">
                          {entry.previousApprovedAmount != null ? formatMoney(entry.previousApprovedAmount) : "Not set"} to{" "}
                          {entry.newApprovedAmount != null ? formatMoney(entry.newApprovedAmount) : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Assigned buyer</p>
                        <p className="mt-1">{entry.previousAssignedToName || "Unassigned"} to {entry.newAssignedToName || "Unassigned"}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted">{entry.financeNote || "No finance note attached to this request update."}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface-elevated/40 px-4 py-8 text-center text-sm text-muted">
                  No request decisions were recorded for this filter set.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
