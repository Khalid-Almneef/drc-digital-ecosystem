"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCircle2, Clock3, DollarSign, Loader2, Plus, ReceiptText } from "lucide-react";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";
import type { FinanceDepartmentSlug, FinancePurchaseRequest } from "@/lib/finance";

interface FinanceDepartmentSummary {
  slug: FinanceDepartmentSlug;
  name: string;
  nameAr: string;
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  pendingRequests: number;
  pendingAmount: number;
  requestCount: number;
}

interface DepartmentOverviewResponse {
  department: FinanceDepartmentSummary;
  requests: FinancePurchaseRequest[];
}

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  high: "bg-amber-400/10 text-amber-300 border-amber-400/20",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  purchasing: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  fulfilled: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  rejected: "bg-red-400/10 text-red-300 border-red-400/20",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} SAR`;
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DepartmentBudgetPanel({
  departmentSlug,
  title,
}: {
  departmentSlug: FinanceDepartmentSlug;
  title?: string;
}) {
  const { lang } = useLang();
  const [summary, setSummary] = useState<FinanceDepartmentSummary | null>(null);
  const [requests, setRequests] = useState<FinancePurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "",
    amountRequested: "",
    neededBy: "",
    priority: "medium" as "low" | "medium" | "high",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<DepartmentOverviewResponse>(`/api/finance/overview?department=${departmentSlug}`);
      setSummary(data.department);
      setRequests(data.requests ?? []);
    } catch {
      setSummary(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [departmentSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitRequest() {
    if (!form.title.trim() || !form.category.trim() || !form.amountRequested) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/finance/requests", {
        departmentSlug,
        title: form.title.trim(),
        category: form.category.trim(),
        amountRequested: Number(form.amountRequested),
        neededBy: form.neededBy || undefined,
        priority: form.priority,
        description: form.description.trim() || undefined,
      });
      setForm({
        title: "",
        category: "",
        amountRequested: "",
        neededBy: "",
        priority: "medium",
        description: "",
      });
      setShowForm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? (lang === "ar" ? "تعذر إرسال الطلب." : "Failed to submit request"));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "dashboard-field";
  const selectCls = "dashboard-select";
  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            {lang === "ar" ? "الميزانية والمشتريات" : "Budget & Procurement"}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{title ?? (lang === "ar" ? "ميزانية القسم" : "Department budget")}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {lang === "ar"
              ? "متابعة الميزانية وطلبات الشراء صارت مربوطة مباشرة مع المالية."
              : "Budget visibility and purchase requests are now linked directly to finance."}
          </p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="btn-primary inline-flex items-center gap-2 self-start px-4 py-2 text-xs"
        >
          <Plus size={13} />
          {showForm ? (lang === "ar" ? "إغلاق نموذج الطلب" : "Close request form") : (lang === "ar" ? "طلب شراء" : "Request a purchase")}
        </button>
      </div>

      <AnimatePresence>
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card p-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>{lang === "ar" ? "العنصر أو الطلب" : "Item or request"}</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder={lang === "ar" ? "مثال: عدة Jetson Nano" : "e.g. Jetson Nano kit"}
                  className={selectCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === "ar" ? "التصنيف" : "Category"}</label>
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder={lang === "ar" ? "مثال: معدات، دعم فعالية" : "e.g. Equipment, Event support"}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === "ar" ? "المبلغ المطلوب" : "Requested amount"}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountRequested}
                  onChange={(event) => setForm((current) => ({ ...current, amountRequested: event.target.value }))}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === "ar" ? "مطلوب قبل" : "Needed by"}</label>
                <input
                  type="date"
                  value={form.neededBy}
                  onChange={(event) => setForm((current) => ({ ...current, neededBy: event.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{lang === "ar" ? "الأولوية" : "Priority"}</label>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as "low" | "medium" | "high" }))}
                  className={inputCls}
                >
                  <option value="low">{lang === "ar" ? "منخفضة" : "Low"}</option>
                  <option value="medium">{lang === "ar" ? "متوسطة" : "Medium"}</option>
                  <option value="high">{lang === "ar" ? "عالية" : "High"}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>{lang === "ar" ? "التفاصيل للمالية" : "Context for finance"}</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder={lang === "ar" ? "اشرح ليش تحتاجونه، وش اللي بيدعمه، وهل التوقيت مهم." : "Why this is needed, what it supports, and whether timing matters."}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void submitRequest()}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <ReceiptText size={13} />}
                {saving ? (lang === "ar" ? "جالس نرسل..." : "Submitting…") : saved ? (lang === "ar" ? "تم الإرسال" : "Submitted") : (lang === "ar" ? "إرسال للمالية" : "Send to finance")}
              </button>
              <p className="text-xs text-muted">
                {lang === "ar"
                  ? "المالية تقدر توافق أو توزع أو ترفض الطلب من لوحة المالية."
                  : "Finance can approve, assign, or reject the request from the finance dashboard."}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <div className="glass-card grid gap-4 p-5 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-surface-elevated" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted">{lang === "ar" ? "المعتمد" : "Allocated"}</p>
                <DollarSign size={15} className="text-primary/80" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{formatMoney(summary.allocated)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted">{lang === "ar" ? "المحجوز" : "Committed"}</p>
                <Clock3 size={15} className="text-amber-300" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{formatMoney(summary.committed)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted">{lang === "ar" ? "المصروف" : "Spent"}</p>
                <CheckCircle2 size={15} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{formatMoney(summary.spent)}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted">{lang === "ar" ? "المتبقي" : "Remaining"}</p>
                <ReceiptText size={15} className="text-cyan-300" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{formatMoney(summary.remaining)}</p>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">{lang === "ar" ? "قائمة الطلبات" : "Request queue"}</h4>
                <p className="mt-1 text-xs text-muted">
                  {lang === "ar"
                    ? `${summary.pendingRequests} طلب معلّق · القيمة المعلقة ${formatMoney(summary.pendingAmount)}`
                    : `${summary.pendingRequests} pending request${summary.pendingRequests === 1 ? "" : "s"} · Pending value ${formatMoney(summary.pendingAmount)}`}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface/30 p-5 text-sm text-muted">
                  {lang === "ar" ? "ما فيه طلبات ميزانية لهذا القسم إلى الآن." : "No budget requests yet for this department."}
                </div>
              ) : (
                requests.slice(0, 5).map((request) => (
                  <div key={request.requestId} className="rounded-2xl border border-border bg-surface/30 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{request.title}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[request.status]}`}>
                            {request.status}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_TONE[request.priority]}`}>
                            {request.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-6 text-muted">
                          {request.description || (lang === "ar" ? "ما فيه تفاصيل إضافية." : "No extra context provided.")}
                        </p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatMoney(request.approvedAmount ?? request.amountRequested)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {lang === "ar" ? `${request.category} · مطلوب ${formatDate(request.neededBy)}` : `${request.category} · Needed ${formatDate(request.neededBy)}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                      <span>{lang === "ar" ? `مطلوب بواسطة ${request.requestedByName}` : `Requested by ${request.requestedByName}`}</span>
                      <span>{formatDate(request.requestedAt)}</span>
                      <span>{request.assignedToName ? (lang === "ar" ? `مُسند إلى ${request.assignedToName}` : `Assigned to ${request.assignedToName}`) : (lang === "ar" ? "ما تسند لأحد إلى الآن" : "Not assigned yet")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-5 text-sm text-muted">{lang === "ar" ? "بيانات الميزانية لهذا القسم مو جاهزة إلى الآن." : "Budget data is not available for this department yet."}</div>
      )}
    </div>
  );
}
