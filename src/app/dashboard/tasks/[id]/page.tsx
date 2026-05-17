"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { useLang } from "@/contexts/LanguageContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

interface TaskDetail {
  taskId: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo: number | null;
  assigneeName: string | null;
  createdBy: number | null;
  creatorName: string | null;
  dueDate: string | null;
  artifactUrl: string | null;
  artifactNotes: string | null;
  submittedAt: string | null;
  creditHours: number;
  completedAt: string | null;
  createdAt: string;
  projectId: number | null;
  projectTitle: string | null;
  departmentId: number | null;
  departmentName: string | null;
  departmentSlug: string | null;
  parentTaskId: number | null;
  parentTaskTitle: string | null;
  subtasks: Array<{
    taskId: number;
    title: string;
    status: "todo" | "in_progress" | "review" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    assigneeName: string | null;
  }>;
}

const STATUS_LABEL: Record<TaskDetail["status"], [string, string]> = {
  todo: ["To Do", "قائمة المهام"],
  in_progress: ["In Progress", "قيد التنفيذ"],
  review: ["Review", "للمراجعة"],
  done: ["Done", "تم"],
};

const PRIORITY_CLASS: Record<TaskDetail["priority"], string> = {
  low: "badge bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  medium: "badge bg-primary/10 text-primary border-primary/20",
  high: "badge bg-amber-500/10 text-amber-300 border-amber-500/20",
  urgent: "badge bg-red-500/10 text-red-300 border-red-500/20",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function backLinkFor(task: TaskDetail | null, lang: "en" | "ar"): { href: string; label: string } {
  if (!task) {
    return {
      href: "/dashboard",
      label: lang === "ar" ? "العودة إلى لوحة التحكم" : "Back to dashboard",
    };
  }
  if (task.projectId) {
    return {
      href: `/dashboard/innovation/projects/${task.projectId}`,
      label: lang === "ar"
        ? `العودة إلى ${task.projectTitle ?? "المشروع"}`
        : `Back to ${task.projectTitle ?? "project"}`,
    };
  }
  switch (task.departmentSlug) {
    case "madarat":
      return { href: "/dashboard/madarat", label: lang === "ar" ? "العودة إلى مدارات" : "Back to Madarat" };
    case "media":
      return { href: "/dashboard/media", label: lang === "ar" ? "العودة إلى الإعلام" : "Back to Media" };
    case "hr":
      return { href: "/dashboard/hr", label: lang === "ar" ? "العودة إلى الموارد البشرية" : "Back to HR" };
    case "pr":
      return { href: "/dashboard/pr", label: lang === "ar" ? "العودة إلى العلاقات العامة" : "Back to PR" };
    case "development":
      return { href: "/dashboard/development", label: lang === "ar" ? "العودة إلى التطوير" : "Back to Development" };
    case "innovation":
      return { href: "/dashboard/innovation", label: lang === "ar" ? "العودة إلى الابتكار" : "Back to Innovation" };
    case "content":
      return { href: "/dashboard/content", label: lang === "ar" ? "العودة إلى المحتوى" : "Back to Content" };
    case "finance":
      return { href: "/dashboard/finance", label: lang === "ar" ? "العودة إلى المالية" : "Back to Finance" };
    default:
      return { href: "/dashboard", label: lang === "ar" ? "العودة إلى لوحة التحكم" : "Back to dashboard" };
  }
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: task, isLoading, error } = useApi<TaskDetail>(`/api/tasks/${id}`);

  const back = backLinkFor(task ?? null, lang);

  return (
    <div>
      <DashboardHeader
        title={tr("Task", "مهمة")}
        description={task ? task.title : tr("Task details", "تفاصيل المهمة")}
      />

      <div className="mb-4">
        <Link href={back.href} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <ArrowLeft size={12} />
          {back.label}
        </Link>
      </div>

      {isLoading ? (
        <div className="glass-card flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : error || !task ? (
        <div className="glass-card p-10 text-center text-sm text-muted">
          {tr("Task not found.", "المهمة غير موجودة.")}
        </div>
      ) : (
        <div className="glass-card p-6 space-y-6">
          <div>
            {task.parentTaskId && (
              <Link
                href={`/dashboard/tasks/${task.parentTaskId}`}
                className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated/60 px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-primary/25 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/40"
              >
                <ArrowLeft size={11} />
                <span className="uppercase tracking-wider">{tr("Subtask of", "مهمة فرعية لـ")}</span>
                <span className="text-foreground">{task.parentTaskTitle ?? `#${task.parentTaskId}`}</span>
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
              <span className={PRIORITY_CLASS[task.priority]}>{task.priority}</span>
              <span className="badge">{tr(...STATUS_LABEL[task.status])}</span>
              {task.departmentName && (
                <span className="badge bg-surface-elevated text-muted border-border">{task.departmentName}</span>
              )}
              {task.projectTitle && (
                <span className="badge bg-primary/10 text-primary border-primary/20">{task.projectTitle}</span>
              )}
            </div>
            {task.description && <p className="mt-3 whitespace-pre-line text-sm text-muted">{task.description}</p>}
          </div>

          <dl className="grid gap-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Assigned to", "مُسنَدة إلى")}</dt>
              <dd className="mt-1 text-sm text-foreground">{task.assigneeName ?? tr("Unassigned", "غير معيَّنة")}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Created by", "أنشأها")}</dt>
              <dd className="mt-1 text-sm text-foreground">{task.creatorName ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Due date", "تاريخ الاستحقاق")}</dt>
              <dd className="mt-1 text-sm text-foreground">{task.dueDate ? task.dueDate.slice(0, 10) : "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Credit hours", "ساعات الاعتماد")}</dt>
              <dd className="mt-1 text-sm text-foreground">{task.creditHours}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Submitted", "أُرسلت")}</dt>
              <dd className="mt-1 text-sm text-foreground">{fmtDate(task.submittedAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Completed", "اكتملت")}</dt>
              <dd className="mt-1 text-sm text-foreground">{fmtDate(task.completedAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Created", "أُنشئت")}</dt>
              <dd className="mt-1 text-sm text-foreground">{fmtDate(task.createdAt)}</dd>
            </div>
          </dl>

          {(task.artifactUrl || task.artifactNotes) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{tr("Submission", "التسليم")}</h3>
              <div className="mt-2 space-y-2 rounded-xl border border-border bg-surface-elevated/30 p-4 text-sm">
                {task.artifactUrl && (
                  <a
                    href={task.artifactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
                  >
                    <ExternalLink size={12} />
                    {task.artifactUrl}
                  </a>
                )}
                {task.artifactNotes && <p className="whitespace-pre-line text-muted">{task.artifactNotes}</p>}
              </div>
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {tr("Subtasks", "المهام الفرعية")}
                <span className="rounded-full border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  {task.subtasks.length}
                </span>
              </h3>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface-elevated/20 overflow-hidden">
                {task.subtasks.map((st) => (
                  <li key={st.taskId}>
                    <Link
                      href={`/dashboard/tasks/${st.taskId}`}
                      className="group flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated/55 focus-visible:bg-surface-elevated/55 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{st.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {st.assigneeName ?? tr("Unassigned", "غير معيَّنة")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={PRIORITY_CLASS[st.priority]}>{st.priority}</span>
                        <span className="badge">{tr(...STATUS_LABEL[st.status])}</span>
                        <ExternalLink size={12} className="text-muted/60 transition-colors group-hover:text-primary" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
