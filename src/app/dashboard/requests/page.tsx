"use client";

import { useMemo, useState } from "react";
import { Inbox, Send, Plus, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/hooks/useApi";
import { api } from "@/lib/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  ServiceRequestRow,
  ServiceRequestType,
  ServiceRequestTarget,
  ServiceRequestPriority,
  SERVICE_REQUEST_TYPE_LABEL,
  SERVICE_REQUEST_TYPE_LABEL_AR,
  SERVICE_REQUEST_STATUS_TONE,
  SERVICE_REQUEST_PRIORITY_TONE,
  VALID_TARGETS_BY_TYPE,
} from "@/lib/service-requests";

type Scope = "inbox" | "outbox" | "related";

const REQUEST_TYPES: ServiceRequestType[] = [
  "design",
  "workshop",
  "project_media",
  "company_visit",
  "event_creation",
  "media_request",
  "content_modification",
  "other",
];

const DEPT_LABEL_EN: Record<ServiceRequestTarget, string> = {
  executive: "Executive",
  hr: "HR",
  development: "Development",
  innovation: "Innovation",
  media: "Media",
  pr: "Public Relations",
  finance: "Finance",
  logistics: "Logistics",
  madarat: "Madarat",
};
const DEPT_LABEL_AR: Record<ServiceRequestTarget, string> = {
  executive: "الرئاسة",
  hr: "الموارد البشرية",
  development: "التطوير",
  innovation: "الابتكار",
  media: "الإعلام",
  pr: "العلاقات العامة",
  finance: "المالية",
  logistics: "اللوجستيات",
  madarat: "مدارات",
};

export default function RequestsPage() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { user, isAnyLeader } = useAuth();
  const sourceDept = user?.department ?? null;
  const isAdmin = user?.position === "president" || user?.position === "vice_president";

  const [scope, setScope] = useState<Scope>("inbox");
  const { data: rows = [], isLoading, mutate } = useApi<ServiceRequestRow[]>(`/api/service-requests?scope=${scope}`);

  if (!isAnyLeader) {
    return (
      <div className="space-y-6">
        <DashboardHeader title={tr("Requests", "الطلبات")} description={tr("Cross-department requests.", "طلبات بين اللجان.")} />
        <p className="glass-card p-6 text-sm text-muted">
          {tr("Only department leaders can use the cross-team request system.", "فقط قادة اللجان يمكنهم استخدام نظام الطلبات.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={tr("Cross-Department Requests", "طلبات بين اللجان")}
        description={tr(
          "Send a request to another committee, or review requests sent to yours.",
          "أرسل طلبًا إلى لجنة أخرى، أو راجع الطلبات المرسلة إلى لجنتك.",
        )}
      />

      <Composer onCreated={() => mutate()} />

      <Tabs scope={scope} setScope={setScope} isAdmin={isAdmin} />

      <RequestsList rows={rows} isLoading={isLoading} sourceDept={sourceDept} onChanged={() => mutate()} scope={scope} />
    </div>
  );
}

// ─── Composer ──────────────────────────────────────────────────────────────

function Composer({ onCreated }: { onCreated: () => void }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [requestType, setRequestType] = useState<ServiceRequestType>("other");
  // Cascade: when requestType changes, reset target to the first valid one.
  const validTargets = VALID_TARGETS_BY_TYPE[requestType];
  const [target, setTarget] = useState<ServiceRequestTarget>(validTargets[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ServiceRequestPriority>("medium");
  const [submitting, setSubmitting] = useState(false);

  function onTypeChange(next: ServiceRequestType) {
    setRequestType(next);
    // Snap target to a valid option for the new type.
    const nextTargets = VALID_TARGETS_BY_TYPE[next];
    if (!nextTargets.includes(target)) setTarget(nextTargets[0]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/api/service-requests", {
        requestType,
        targetDepartmentSlug: target,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      toast.success(tr("Request sent.", "تم إرسال الطلب."));
      setTitle("");
      setDescription("");
      onCreated();
    } catch (err) {
      const msg = (err as Error).message ?? "Failed to send request.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Plus size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {tr("New Request", "طلب جديد")}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {tr("Request type", "نوع الطلب")}
          </label>
          <select
            value={requestType}
            onChange={(e) => onTypeChange(e.target.value as ServiceRequestType)}
            className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
          >
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {lang === "ar" ? SERVICE_REQUEST_TYPE_LABEL_AR[type] : SERVICE_REQUEST_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {tr("Target department", "اللجنة المستهدفة")}
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as ServiceRequestTarget)}
            className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
          >
            {validTargets.map((slug) => (
              <option key={slug} value={slug}>
                {lang === "ar" ? DEPT_LABEL_AR[slug] : DEPT_LABEL_EN[slug]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-muted/70">
            {requestType === "other"
              ? tr("Other → any department.", "أخرى ← أي لجنة.")
              : tr(`${validTargets.length} valid target${validTargets.length === 1 ? "" : "s"} for this type.`, `${validTargets.length} لجنة مؤهلة لهذا النوع.`)}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {tr("Title", "العنوان")}
        </label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr("Short summary", "ملخص قصير")}
          className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {tr("Details", "التفاصيل")}
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={tr("What do you need? When? Any context the receiving team should know.", "ماذا تحتاج؟ متى؟ السياق المهم للجنة المستلمة.")}
          className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none resize-none"
        />
      </div>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {tr("Priority", "الأولوية")}
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ServiceRequestPriority)}
            className="rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
          >
            <option value="low">{tr("Low", "منخفضة")}</option>
            <option value="medium">{tr("Medium", "متوسطة")}</option>
            <option value="high">{tr("High", "عالية")}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {tr("Send Request", "إرسال الطلب")}
        </button>
      </div>
    </form>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function Tabs({ scope, setScope, isAdmin }: { scope: Scope; setScope: (s: Scope) => void; isAdmin: boolean }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const tabs: { key: Scope; label: string; labelAr: string; icon: React.ElementType }[] = [
    { key: "inbox", label: "Inbox", labelAr: "الواردة", icon: Inbox },
    { key: "outbox", label: "Sent", labelAr: "المرسلة", icon: Send },
    { key: "related", label: "All related", labelAr: "كل ما يخصني", icon: Clock },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((t) => {
        const active = scope === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setScope(t.key)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              active ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-surface-elevated text-muted hover:text-foreground"
            }`}
          >
            <t.icon size={13} />
            {lang === "ar" ? t.labelAr : t.label}
          </button>
        );
      })}
      {isAdmin && (
        <span className="text-[10px] text-muted/70 ms-2">
          {tr("Tip: Admins see every request across the club.", "ملاحظة: الإدارة ترى كل الطلبات.")}
        </span>
      )}
    </div>
  );
}

// ─── List ──────────────────────────────────────────────────────────────────

function RequestsList({
  rows,
  isLoading,
  sourceDept,
  onChanged,
  scope,
}: {
  rows: ServiceRequestRow[];
  isLoading: boolean;
  sourceDept: string | null;
  onChanged: () => void;
  scope: Scope;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ap = priorityOrder(a.priority);
      const bp = priorityOrder(b.priority);
      if (ap !== bp) return bp - ap;
      return b.requestedAt.localeCompare(a.requestedAt);
    });
  }, [rows]);

  if (isLoading) {
    return <div className="glass-card p-6 text-sm text-muted">{tr("Loading…", "جاري التحميل…")}</div>;
  }
  if (sortedRows.length === 0) {
    return (
      <div className="glass-card p-6 text-sm text-muted text-center">
        {scope === "inbox"
          ? tr("Nothing in your inbox yet.", "لا يوجد شيء في الوارد حتى الآن.")
          : scope === "outbox"
            ? tr("You haven't sent any requests yet.", "لم ترسل أي طلب حتى الآن.")
            : tr("No related requests.", "لا توجد طلبات مرتبطة.")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedRows.map((row) => (
        <RequestCard key={row.requestId} row={row} sourceDept={sourceDept} onChanged={onChanged} />
      ))}
    </div>
  );
}

function priorityOrder(p: ServiceRequestPriority) {
  return p === "high" ? 3 : p === "medium" ? 2 : 1;
}

function RequestCard({
  row,
  sourceDept,
  onChanged,
}: {
  row: ServiceRequestRow;
  sourceDept: string | null;
  onChanged: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [busy, setBusy] = useState(false);
  const isInbox = sourceDept === row.targetDepartmentSlug;

  async function setStatus(status: "in_progress" | "completed" | "rejected") {
    setBusy(true);
    try {
      await api.patch(`/api/service-requests/${row.requestId}`, { status });
      toast.success(tr("Updated.", "تم التحديث."));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${SERVICE_REQUEST_PRIORITY_TONE[row.priority]}`}>
              {row.priority}
            </span>
            <span className={SERVICE_REQUEST_STATUS_TONE[row.status]}>{row.status.replace("_", " ")}</span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
              {lang === "ar" ? SERVICE_REQUEST_TYPE_LABEL_AR[row.requestType] : SERVICE_REQUEST_TYPE_LABEL[row.requestType]}
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">{row.title}</h4>
          {row.description && (
            <p className="mt-1.5 text-xs leading-6 text-muted whitespace-pre-wrap">{row.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span>
              {tr("From", "من")}:{" "}
              <span className="text-foreground">
                {row.sourceDepartmentName ?? row.sourceDepartmentSlug}
              </span>
            </span>
            <span>
              {tr("To", "إلى")}:{" "}
              <span className="text-foreground">
                {row.targetDepartmentName ?? row.targetDepartmentSlug}
              </span>
            </span>
            <span>
              {tr("Requested by", "مقدم الطلب")}:{" "}
              <span className="text-foreground">{row.requestedByName ?? `#${row.requestedBy}`}</span>
            </span>
            <span>
              {new Date(row.requestedAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
        </div>

        {isInbox && row.status !== "completed" && row.status !== "rejected" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {row.status === "pending" && (
              <button
                type="button"
                onClick={() => setStatus("in_progress")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
              >
                <Clock size={12} />
                {tr("Start", "بدء")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatus("completed")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/15 disabled:opacity-60"
            >
              <CheckCircle2 size={12} />
              {tr("Complete", "اكتمل")}
            </button>
            <button
              type="button"
              onClick={() => setStatus("rejected")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/10 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/15 disabled:opacity-60"
            >
              <AlertCircle size={12} />
              {tr("Reject", "رفض")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
