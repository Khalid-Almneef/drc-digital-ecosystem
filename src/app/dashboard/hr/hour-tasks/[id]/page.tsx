"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { useLang } from "@/contexts/LanguageContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

interface HourTaskDetail {
  opportunityId: number;
  title: string;
  description: string | null;
  hours: number;
  participationDate: string;
  isActive: boolean;
  isRepetitive: boolean;
  assignedDepartmentId: number | null;
  assignedDepartmentSlug: string | null;
  assignedDepartmentName: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

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

export default function HourTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: task, isLoading, error } = useApi<HourTaskDetail>(`/api/volunteer-hour-tasks/${id}`);

  return (
    <div>
      <DashboardHeader
        title={tr("Volunteer Hour Task", "مهمة ساعات تطوّعية")}
        description={task ? task.title : tr("Hour task details", "تفاصيل المهمة")}
      />

      <div className="mb-4">
        <Link href="/dashboard/hr" className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <ArrowLeft size={12} />
          {tr("Back to HR", "العودة إلى الموارد البشرية")}
        </Link>
      </div>

      {isLoading ? (
        <div className="glass-card flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : error || !task ? (
        <div className="glass-card p-10 text-center text-sm text-muted">
          {tr("Hour task not found.", "المهمة غير موجودة.")}
        </div>
      ) : (
        <div className="glass-card p-6 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
              <span className={task.isActive ? "badge badge-success" : "badge"}>
                {task.isActive ? tr("Open", "مفتوحة") : tr("Closed", "مغلقة")}
              </span>
              <span className="badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                {task.hours}{tr("h", "س")}
              </span>
              {task.isRepetitive && (
                <span className="badge bg-amber-500/10 text-amber-300 border-amber-500/20">
                  {tr("Repetitive", "متكررة")}
                </span>
              )}
              {task.assignedDepartmentName && (
                <span className="badge bg-primary/10 text-primary border-primary/20">
                  {task.assignedDepartmentName}
                </span>
              )}
            </div>
            {task.description && (
              <p className="mt-3 whitespace-pre-line text-sm text-muted">{task.description}</p>
            )}
          </div>

          <dl className="grid gap-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Participation date", "تاريخ المشاركة")}</dt>
              <dd className="mt-1 text-sm text-foreground">{task.participationDate.slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Hours", "الساعات")}</dt>
              <dd className="mt-1 text-sm text-foreground">{task.hours}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Assigned to", "موجَّهة إلى")}</dt>
              <dd className="mt-1 text-sm text-foreground">
                {task.assignedDepartmentName ?? tr("Club-wide", "كل النادي")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Repetitive", "متكررة")}</dt>
              <dd className="mt-1 text-sm text-foreground">
                {task.isRepetitive ? tr("Yes", "نعم") : tr("No", "لا")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Created", "أُنشئت")}</dt>
              <dd className="mt-1 text-sm text-foreground">{fmtDate(task.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-muted">{tr("Last updated", "آخر تعديل")}</dt>
              <dd className="mt-1 text-sm text-foreground">{fmtDate(task.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
