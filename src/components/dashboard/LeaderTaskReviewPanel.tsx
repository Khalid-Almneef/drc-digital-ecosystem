"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  RotateCcw,
  Video,
  ListChecks,
  CircleCheck,
  CircleDot,
  Filter,
} from "lucide-react";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface Task {
  taskId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: number | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
  artifactUrl: string | null;
  artifactNotes: string | null;
  submittedAt: string | null;
  creditHours: number;
  completedAt: string | null;
  createdAt: string;
}

interface LeaderTaskReviewPanelProps {
  /** Department slug — e.g. "development". Required: panel is dept-scoped. */
  department: string;
  /** Optional title override; defaults to "Member Submissions" / equivalent. */
  title?: string;
  titleAr?: string;
  /** When true, only shows the review queue (no full task list). */
  reviewOnly?: boolean;
  /** Compact header tone (used inside crowded dashboards). */
  compact?: boolean;
}

const PRIORITY_TONE: Record<TaskPriority, string> = {
  urgent: "bg-red-400/10 text-red-300 border-red-400/20",
  high: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted/10 text-muted border-muted/20",
};

const STATUS_TONE: Record<TaskStatus, string> = {
  todo: "bg-muted/10 text-muted border-muted/20",
  in_progress: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  review: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  done: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
};

function fmtDate(iso: string, lang: "en" | "ar") {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function isImageUrl(url: string | null) {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url);
}

export function LeaderTaskReviewPanel({
  department,
  title,
  titleAr,
  reviewOnly = false,
  compact = false,
}: LeaderTaskReviewPanelProps) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Task[]>(`/api/tasks?department=${department}`);
      setTasks(data ?? []);
    } catch {
      toast.error(tr("Couldn't load tasks. Please try again.", "تعذّر تحميل المهام. حاول مرة أخرى."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const submissions = useMemo(() => tasks.filter((t) => t.status === "review"), [tasks]);

  const counts = useMemo(() => {
    return {
      review: tasks.filter((t) => t.status === "review").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      todo: tasks.filter((t) => t.status === "todo").length,
      done: tasks.filter((t) => t.status === "done").length,
      total: tasks.length,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  async function approve(taskId: number) {
    setActing(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status: "done" });
      toast.success(tr("Submission approved · credit granted", "تم اعتماد التسليم · تم منح الساعات"));
      void loadTasks();
    } catch {
      toast.error(tr("Approval failed. Please try again.", "فشل الاعتماد. حاول مرة أخرى."));
    } finally {
      setActing(null);
    }
  }

  async function sendBack(taskId: number) {
    setActing(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status: "in_progress" });
      toast.success(tr("Sent back for revision", "أُعيد للتعديل"));
      void loadTasks();
    } catch {
      toast.error(tr("Action failed. Please try again.", "فشل تنفيذ الإجراء. حاول مرة أخرى."));
    } finally {
      setActing(null);
    }
  }

  const headerTitle = lang === "ar"
    ? (titleAr ?? "تسليمات الأعضاء")
    : (title ?? "Member Submissions");

  return (
    <section className="space-y-6">
      {/* Stat strip */}
      <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 md:grid-cols-4"}`}>
        <StatPill icon={Inbox} tone="amber"
          label={tr("Awaiting review", "قيد المراجعة")} value={counts.review} />
        <StatPill icon={CircleDot} tone="blue"
          label={tr("In progress", "قيد التنفيذ")} value={counts.in_progress} />
        <StatPill icon={ListChecks} tone="muted"
          label={tr("Backlog", "قيد الانتظار")} value={counts.todo} />
        <StatPill icon={CircleCheck} tone="emerald"
          label={tr("Done", "مكتمل")} value={counts.done} />
      </div>

      {/* Review queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{headerTitle}</h3>
          <span className="text-[10px] text-muted">
            {tr(`${counts.review} pending`, `${counts.review} قيد المراجعة`)}
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          {tr(
            "Tasks submitted for your review. Approve to mark done and grant credit hours.",
            "مهام مرسلة للمراجعة. اعتمدها لتسجيلها كمكتملة ومنح ساعات الاعتماد.",
          )}
        </p>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-border bg-surface-elevated/40 animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="glass-card p-10 text-center text-sm text-muted">
            {tr("No submissions pending review.", "لا توجد تسليمات قيد المراجعة.")}
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((t, i) => (
              <motion.div
                key={t.taskId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center"
              >
                {t.artifactUrl ? (
                  <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border bg-surface-elevated">
                    {isImageUrl(t.artifactUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.artifactUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={20} className="text-primary/60" />
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{t.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_TONE[t.priority]}`}>
                      {tr(t.priority, t.priority)}
                    </span>
                    {t.creditHours > 0 ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                        {tr(`${t.creditHours}h credit`, `${t.creditHours} ساعة`)}
                      </span>
                    ) : null}
                  </div>
                  {t.artifactNotes ? (
                    <p className="text-xs text-muted mb-1 line-clamp-2">{t.artifactNotes}</p>
                  ) : null}
                  <p className="text-[10px] text-muted">
                    {tr("By", "بواسطة")}{" "}
                    <span className="text-foreground">{t.assigneeName ?? tr("Unknown", "غير معروف")}</span>
                    {t.submittedAt ? ` · ${tr("submitted", "أُرسل")} ${fmtDate(t.submittedAt, lang)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.artifactUrl ? (
                    <a
                      href={t.artifactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
                      title={tr("Open artifact", "فتح المرفق")}
                    >
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                  <button
                    onClick={() => sendBack(t.taskId)}
                    disabled={acting === t.taskId}
                    className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                    title={tr("Send back for revision", "إعادة للتعديل")}
                  >
                    {acting === t.taskId ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                    {tr("Send back", "إعادة")}
                  </button>
                  <button
                    onClick={() => approve(t.taskId)}
                    disabled={acting === t.taskId}
                    className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                  >
                    {acting === t.taskId ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    {tr("Approve", "اعتماد")}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* All tasks (compact) */}
      {!reviewOnly ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {tr("All tasks in this department", "جميع المهام في القسم")}
            </h3>
            <div className="flex items-center gap-1 text-[11px]">
              <Filter size={11} className="text-muted" />
              {(["all", "todo", "in_progress", "review", "done"] as const).map((status) => {
                const labels: Record<typeof status, [string, string]> = {
                  all: ["All", "الكل"],
                  todo: ["Todo", "للقيام"],
                  in_progress: ["Doing", "جارٍ"],
                  review: ["Review", "مراجعة"],
                  done: ["Done", "مكتمل"],
                };
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2 py-1 rounded-lg border transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                    aria-pressed={active}
                  >
                    {tr(labels[status][0], labels[status][1])}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? null : visibleTasks.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-muted">
              {tr("No tasks match this filter.", "لا توجد مهام تطابق هذا الفلتر.")}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface/40 divide-y divide-border">
              {visibleTasks.map((t) => (
                <div key={t.taskId} className="px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{t.title}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_TONE[t.status]}`}>
                        {tr(t.status.replace("_", " "), t.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5 truncate">
                      {t.assigneeName ?? tr("Unassigned", "غير مُكلَّف")}
                      {t.dueDate ? ` · ${tr("due", "ينتهي")} ${fmtDate(t.dueDate, lang)}` : ""}
                      {t.creditHours > 0 ? ` · ${t.creditHours}h` : ""}
                    </p>
                  </div>
                  {t.status === "in_progress" || t.status === "todo" ? (
                    <span className="text-[10px] text-muted inline-flex items-center gap-1">
                      <Clock size={10} />
                      {tr("created", "أُنشئت")} {fmtDate(t.createdAt, lang)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function StatPill({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ElementType;
  tone: "amber" | "blue" | "muted" | "emerald";
  label: string;
  value: number;
}) {
  const toneCls: Record<typeof tone, string> = {
    amber: "border-amber-400/20 bg-amber-400/5 text-amber-300",
    blue: "border-blue-400/20 bg-blue-400/5 text-blue-300",
    muted: "border-border bg-surface-elevated/40 text-muted",
    emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
  };
  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneCls[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
