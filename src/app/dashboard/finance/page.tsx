"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApi } from "@/lib/hooks/useApi";
import {
  Check,
  CheckCircle2,
  Clock3,
  DollarSign,
  Loader2,
  ReceiptText,
  Save,
  ShoppingBag,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useLang } from "@/contexts/LanguageContext";
import { FinanceNav } from "@/components/dashboard/FinanceNav";
import { StatCard } from "@/components/dashboard/StatCard";
import { api } from "@/lib/client";
import type { FinanceDepartmentSummary, FinancePurchaseRequest } from "@/lib/finance";

interface FinanceOverviewResponse {
  departments: FinanceDepartmentSummary[];
  requests: FinancePurchaseRequest[];
  totals: {
    allocated: number;
    spent: number;
    committed: number;
    remaining: number;
    pendingRequests: number;
  };
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  purchasing: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  fulfilled: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  rejected: "bg-red-400/10 text-red-300 border-red-400/20",
};

function formatMoney(value: number, lang: "en" | "ar" = "en") {
  const formatted = value.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });
  return `${formatted} ${lang === "ar" ? "ر.س" : "SAR"}`;
}

export default function FinanceDashboard() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: overview, isLoading: loading, mutate: refresh } = useApi<FinanceOverviewResponse>("/api/finance/overview");
  const departments = overview?.departments ?? [];
  const requests = overview?.requests ?? [];
  const totals = overview?.totals ?? null;
  const [savingAllocation, setSavingAllocation] = useState<Record<string, boolean>>({});
  const [savingRequest, setSavingRequest] = useState<Record<number, boolean>>({});
  const [allocationDrafts, setAllocationDrafts] = useState<Record<string, { allocated: string; note: string }>>({});
  const [requestDrafts, setRequestDrafts] = useState<Record<number, { status: string; approvedAmount: string; assignedToName: string; financeNote: string }>>({});

  // Reseed editable drafts whenever the server payload changes (initial load + refetches).
  useEffect(() => {
    if (!overview) return;
    setAllocationDrafts(
      Object.fromEntries(
        (overview.departments ?? []).map((department) => [
          department.slug,
          { allocated: String(department.allocated), note: "" },
        ]),
      ),
    );
    setRequestDrafts(
      Object.fromEntries(
        (overview.requests ?? []).map((request) => [
          request.requestId,
          {
            status: request.status,
            approvedAmount: request.approvedAmount != null ? String(request.approvedAmount) : String(request.amountRequested),
            assignedToName: request.assignedToName ?? "",
            financeNote: request.financeNote ?? "",
          },
        ]),
      ),
    );
  }, [overview]);

  const load = async () => { await refresh(); };

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending" || request.status === "approved" || request.status === "purchasing"),
    [requests],
  );

  async function saveAllocation(slug: string) {
    const draft = allocationDrafts[slug];
    if (!draft) return;
    setSavingAllocation((current) => ({ ...current, [slug]: true }));
    try {
      await api.patch(`/api/finance/allocations/${slug}`, {
        allocated: Number(draft.allocated || 0),
        note: draft.note.trim() || null,
      });
      toast.success(tr("Allocation saved", "تم حفظ التخصيص"));
      await load();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setSavingAllocation((current) => ({ ...current, [slug]: false }));
    }
  }

  async function saveRequest(requestId: number) {
    const draft = requestDrafts[requestId];
    if (!draft) return;
    setSavingRequest((current) => ({ ...current, [requestId]: true }));
    try {
      await api.patch(`/api/finance/requests/${requestId}`, {
        status: draft.status,
        approvedAmount: Number(draft.approvedAmount || 0),
        assignedToName: draft.assignedToName.trim() || null,
        financeNote: draft.financeNote.trim() || null,
      });
      toast.success(tr("Request updated", "تم تحديث الطلب"));
      await load();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setSavingRequest((current) => ({ ...current, [requestId]: false }));
    }
  }

  const inputCls = "w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20";
  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted";

  return (
    <div>
      <DashboardHeader
        title={tr("Finance & Procurement", "المالية والمشتريات")}
        description={tr("Distribute department budgets, approve purchase requests, and assign buying work from one queue.", "وزّع ميزانيات الأقسام، واعتمد طلبات الشراء، ووزع مهام الشراء من مكان واحد.")}
      />
      <FinanceNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={DollarSign} label={tr("Allocated Budget", "الميزانية المعتمدة")} value={totals ? formatMoney(totals.allocated) : "—"} href="/dashboard/finance/reports" />
        <StatCard icon={Clock3} label={tr("Committed", "المحجوز")} value={totals ? formatMoney(totals.committed) : "—"} href="/dashboard/finance/reports" />
        <StatCard icon={CheckCircle2} label={tr("Spent", "المصروف")} value={totals ? formatMoney(totals.spent) : "—"} href="/dashboard/finance/reports" />
        <StatCard icon={ReceiptText} label={tr("Open Requests", "الطلبات المفتوحة")} value={totals?.pendingRequests ?? "—"} href="/dashboard/finance/tasks" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{tr("Budget Distribution", "توزيع الميزانية")}</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">{tr("Department allocations", "تخصيصات الأقسام")}</h3>
            </div>
            <p className="text-sm text-muted">{lang === "ar" ? `${departments.length} أقسام` : `${departments.length} departments`}</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="glass-card h-32 animate-pulse" />
              ))}
            </div>
          ) : (
            departments.map((department, index) => (
              <motion.div
                key={department.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass-card p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">{department.name}</h4>
                    <p className="mt-1 text-sm text-muted">
                      {tr("Remaining", "المتبقّي")} {formatMoney(department.remaining, lang)} · {tr("Pending", "قيد الانتظار")} {department.pendingRequests}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
                      <span className="rounded-full border border-border px-3 py-1">{tr("Spent", "المصروف")} {formatMoney(department.spent, lang)}</span>
                      <span className="rounded-full border border-border px-3 py-1">{tr("Committed", "ملتزَم به")} {formatMoney(department.committed, lang)}</span>
                      <span className="rounded-full border border-border px-3 py-1">{tr("Pending", "قيد الانتظار")} {formatMoney(department.pendingAmount, lang)}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:min-w-[18rem] sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>{tr("Allocated budget", "الميزانية المخصّصة")}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={allocationDrafts[department.slug]?.allocated ?? ""}
                        onChange={(event) =>
                          setAllocationDrafts((current) => ({
                            ...current,
                            [department.slug]: {
                              ...(current[department.slug] ?? { allocated: "", note: "" }),
                              allocated: event.target.value,
                            },
                          }))
                        }
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>{tr("Distribution note", "ملاحظة التوزيع")}</label>
                      <input
                        value={allocationDrafts[department.slug]?.note ?? ""}
                        onChange={(event) =>
                          setAllocationDrafts((current) => ({
                            ...current,
                            [department.slug]: {
                              ...(current[department.slug] ?? { allocated: "", note: "" }),
                              note: event.target.value,
                            },
                          }))
                        }
                        placeholder={tr("Optional note for why the budget changed", "ملاحظة اختيارية لسبب التغيير")}
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        onClick={() => void saveAllocation(department.slug)}
                        disabled={savingAllocation[department.slug]}
                        className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-60"
                      >
                        {savingAllocation[department.slug] ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        {tr("Save allocation", "حفظ التخصيص")}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{tr("Procurement Queue", "قائمة المشتريات")}</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">{tr("Assign and approve requests", "إسناد الطلبات واعتمادها")}</h3>
            </div>
            <p className="text-sm text-muted">{pendingRequests.length} {tr("active", "نشطة")}</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((item) => (
                <div key={item} className="glass-card h-48 animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="glass-card p-5 text-sm text-muted">{tr("No purchase requests have been submitted yet.", "لا توجد طلبات شراء مقدّمة بعد.")}</div>
          ) : (
            requests.map((request, index) => (
              <motion.div
                key={request.requestId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-foreground">{request.title}</h4>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[request.status]}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {request.description || tr("No extra request context was provided.", "لم تُضف ملاحظات إضافية للطلب.")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface/40 px-3 py-2 text-right">
                    <p className="text-sm font-semibold text-foreground">{formatMoney(request.approvedAmount ?? request.amountRequested, lang)}</p>
                    <p className="mt-1 text-[11px] text-muted">{request.category}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                  <span>{request.departmentSlug}</span>
                  <span>{tr("Requested by", "تقدّم به")} {request.requestedByName}</span>
                  <span>{tr("Need by", "الموعد")} {request.neededBy || tr("No deadline", "بدون موعد محدّد")}</span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>{tr("Status", "الحالة")}</label>
                    <select
                      value={requestDrafts[request.requestId]?.status ?? request.status}
                      onChange={(event) =>
                        setRequestDrafts((current) => ({
                          ...current,
                          [request.requestId]: {
                            ...(current[request.requestId] ?? {
                              status: request.status,
                              approvedAmount: String(request.approvedAmount ?? request.amountRequested),
                              assignedToName: request.assignedToName ?? "",
                              financeNote: request.financeNote ?? "",
                            }),
                            status: event.target.value,
                          },
                        }))
                      }
                      className={inputCls}
                    >
                      <option value="pending">{tr("Pending", "قيد الانتظار")}</option>
                      <option value="approved">{tr("Approved", "معتمد")}</option>
                      <option value="purchasing">{tr("Purchasing", "قيد الشراء")}</option>
                      <option value="fulfilled">{tr("Fulfilled", "تم التسليم")}</option>
                      <option value="rejected">{tr("Rejected", "مرفوض")}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{tr("Approved amount", "المبلغ المعتمد")}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={requestDrafts[request.requestId]?.approvedAmount ?? ""}
                      onChange={(event) =>
                        setRequestDrafts((current) => ({
                          ...current,
                          [request.requestId]: {
                            ...(current[request.requestId] ?? {
                              status: request.status,
                              approvedAmount: String(request.approvedAmount ?? request.amountRequested),
                              assignedToName: request.assignedToName ?? "",
                              financeNote: request.financeNote ?? "",
                            }),
                            approvedAmount: event.target.value,
                          },
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{tr("Assigned buyer", "المسؤول عن الشراء")}</label>
                    <input
                      value={requestDrafts[request.requestId]?.assignedToName ?? ""}
                      onChange={(event) =>
                        setRequestDrafts((current) => ({
                          ...current,
                          [request.requestId]: {
                            ...(current[request.requestId] ?? {
                              status: request.status,
                              approvedAmount: String(request.approvedAmount ?? request.amountRequested),
                              assignedToName: request.assignedToName ?? "",
                              financeNote: request.financeNote ?? "",
                            }),
                            assignedToName: event.target.value,
                          },
                        }))
                      }
                      placeholder={tr("Who is handling the purchase?", "من سيتولّى الشراء؟")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{tr("Finance note", "ملاحظة مالية")}</label>
                    <input
                      value={requestDrafts[request.requestId]?.financeNote ?? ""}
                      onChange={(event) =>
                        setRequestDrafts((current) => ({
                          ...current,
                          [request.requestId]: {
                            ...(current[request.requestId] ?? {
                              status: request.status,
                              approvedAmount: String(request.approvedAmount ?? request.amountRequested),
                              assignedToName: request.assignedToName ?? "",
                              financeNote: request.financeNote ?? "",
                            }),
                            financeNote: event.target.value,
                          },
                        }))
                      }
                      placeholder={tr("Optional finance context", "ملاحظة مالية اختيارية")}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => void saveRequest(request.requestId)}
                    disabled={savingRequest[request.requestId]}
                    className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-60"
                  >
                    {savingRequest[request.requestId] ? <Loader2 size={13} className="animate-spin" /> : <ShoppingBag size={13} />}
                    {tr("Update request", "تحديث الطلب")}
                  </button>
                  {request.assignedToName ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Check size={12} className="text-primary" />
                      {tr("Assigned to", "مُسنَد إلى")} {request.assignedToName}
                    </span>
                  ) : null}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
