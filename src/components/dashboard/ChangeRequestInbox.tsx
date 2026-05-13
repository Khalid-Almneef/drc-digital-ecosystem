"use client";

import { useState } from "react";
import { Loader2, Check, X, AlertCircle, Clock, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApi } from "@/lib/hooks/useApi";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import { MemberLink } from "@/components/dashboard/MemberLink";

// Renders the change-request inbox visible to leaders. Drop into any
// department dashboard inside its own tab. Shows pending requests by default;
// status filter chips reveal decided ones.
//
// On approve/reject the row is mutated optimistically and the list is
// re-fetched. The server applies the underlying mutation on approval — see
// src/lib/change-request-handlers.ts.

interface ChangeRequestRow {
  requestId: number;
  requestType: string;
  departmentId: number;
  requesterId: number;
  requesterName: string | null;
  targetId: number | null;
  payload: Record<string, unknown>;
  summary: string;
  status: "pending" | "approved" | "rejected" | "applied" | "apply_failed";
  decidedBy: number | null;
  decidedAt: string | null;
  appliedAt: string | null;
  applyError: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  post_announcement: { en: "Announcement", ar: "إعلان" },
};

function formatRelative(iso: string, lang: "en" | "ar") {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return lang === "ar" ? "الآن" : "now";
  if (minutes < 60) return lang === "ar" ? `قبل ${minutes} د` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "ar" ? `قبل ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ar" ? `قبل ${days} ي` : `${days}d ago`;
}

const STATUS_LABELS: Record<ChangeRequestRow["status"], { en: string; ar: string; cls: string }> = {
  pending:       { en: "Pending",       ar: "قيد المراجعة",  cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  approved:      { en: "Approved",      ar: "معتمد",          cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  applied:       { en: "Applied",       ar: "مطبق",           cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  rejected:      { en: "Rejected",      ar: "مرفوض",          cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  apply_failed:  { en: "Apply failed",  ar: "فشل التطبيق",    cls: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export function ChangeRequestInbox() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [filter, setFilter] = useState<"pending" | "all" | "approved" | "rejected">("pending");
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const url = filter === "all"
    ? "/api/change-requests?scope=inbox&status=all"
    : filter === "pending"
      ? "/api/change-requests?scope=inbox"
      : `/api/change-requests?scope=inbox&status=${filter}`;
  const { data: rows = [], isLoading, mutate } = useApi<ChangeRequestRow[]>(url);

  async function decide(requestId: number, decision: "approved" | "rejected") {
    if (decision === "rejected") {
      const ok = window.confirm(tr("Reject this request? The requester will be notified with no reason.", "هل ترفض هذا الطلب؟ سيُخبَر المرسل بدون ذكر سبب."));
      if (!ok) return;
    }
    setDecidingId(requestId);
    try {
      await api.patch(`/api/change-requests/${requestId}`, { decision });
      toast.success(decision === "approved"
        ? tr("Approved and applied.", "تم الاعتماد والتطبيق.")
        : tr("Rejected.", "تم الرفض."));
      void mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Decision failed.", "فشل اتخاذ القرار."));
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            data-active={filter === f}
            className="filter-chip"
          >
            {tr(f.charAt(0).toUpperCase() + f.slice(1), STATUS_LABELS[f === "all" ? "pending" : f]?.ar ?? "الكل")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted">
          <FileText size={20} className="mx-auto mb-2 opacity-30" />
          {tr("No change requests in this view.", "لا توجد طلبات تغيير في هذا العرض.")}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => {
            const typeLabel = TYPE_LABELS[row.requestType]?.[lang === "ar" ? "ar" : "en"] ?? row.requestType;
            const statusLabel = STATUS_LABELS[row.status];
            return (
              <motion.div
                key={row.requestId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.03 }}
                className="glass-card p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        {typeLabel}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusLabel.cls}`}>
                        {tr(statusLabel.en, statusLabel.ar)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted">
                        <Clock size={11} />
                        {formatRelative(row.createdAt, lang)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{row.summary}</p>
                    <p className="mt-1 text-xs text-muted">
                      {tr("Requested by ", "مرسل من ")}
                      <MemberLink memberId={row.requesterId} name={row.requesterName ?? "—"} />
                    </p>
                    {row.applyError ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-300">
                        <AlertCircle size={12} className="mt-0.5 shrink-0" />
                        <span>{row.applyError}</span>
                      </div>
                    ) : null}
                  </div>
                  {row.status === "pending" ? (
                    <div className="flex gap-2 sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => decide(row.requestId, "approved")}
                        disabled={decidingId === row.requestId}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
                      >
                        {decidingId === row.requestId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        {tr("Approve", "اعتماد")}
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(row.requestId, "rejected")}
                        disabled={decidingId === row.requestId}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40"
                      >
                        <X size={12} />
                        {tr("Reject", "رفض")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
