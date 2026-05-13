"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  Lightbulb, Wrench, Cpu, Box, Plus, Star, Trash2, Loader2, X, ExternalLink,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEscape } from "@/lib/hooks/useEscape";
import { useApi } from "@/lib/hooks/useApi";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ArchiveManager } from "@/components/dashboard/ArchiveManager";
import { BulkUploadCard } from "@/components/dashboard/BulkUploadCard";
import { LeaderTaskReviewPanel } from "@/components/dashboard/LeaderTaskReviewPanel";
import { MemberPerformancePanel } from "@/components/dashboard/MemberPerformancePanel";
import { MemberLink } from "@/components/dashboard/MemberLink";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { api } from "@/lib/client";

// ─── Types (Projects) ─────────────────────────────────────────────────────────

type ProjectStatus = "planning" | "in_progress" | "testing" | "completed" | "archived";

interface Project {
  projectId: number;
  title: string;
  description: string | null;
  category: string | null;
  status: ProjectStatus;
  isFeatured: boolean;
  departmentSlug: string | null;
  departmentName: string | null;
  leadName: string | null;
  applicationsEnabled: boolean;
  applicationRoles: string[];
}

// ─── Status / badge helpers ───────────────────────────────────────────────────

const statusBadge: Record<ProjectStatus, { label: string; color: string }> = {
  planning:    { label: "Planning",     color: "text-blue-400 bg-blue-400/10" },
  in_progress: { label: "In Progress",  color: "text-yellow-400 bg-yellow-400/10" },
  testing:     { label: "Testing",      color: "text-primary bg-primary/10" },
  completed:   { label: "Completed",    color: "text-green-400 bg-green-400/10" },
  archived:    { label: "Archived",     color: "text-muted bg-surface-elevated" },
};

// ─── Create Project modal ─────────────────────────────────────────────────────

const EMPTY_PROJECT_FORM = {
  title: "",
  description: "",
  category: "",
  status: "planning" as ProjectStatus,
  techStack: "",
  creditHours: "",
  cost: "",
  applicationsEnabled: false,
  applicationRoles: "",
  createMediaRequest: false,
  mediaRequestBrief: "",
};

interface CreateProjectModalProps { onClose: () => void; onCreated: () => void }

function CreateProjectModal({ onClose, onCreated }: CreateProjectModalProps) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [f, setF] = useState(EMPTY_PROJECT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEscape(true, onClose);

  const set = (k: keyof typeof EMPTY_PROJECT_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const parsedRoles = Array.from(new Set(
      f.applicationRoles
        .split(/\n|,/)
        .map((role) => role.trim())
        .filter(Boolean),
    ));
    try {
      const projectPayload = {
        title: f.title,
        description: f.description || undefined,
        category: f.category || undefined,
        status: f.status,
        techStack: f.techStack
          ? f.techStack.split(",").map(s => s.trim()).filter(Boolean)
          : undefined,
        creditHours: f.creditHours ? Number(f.creditHours) : undefined,
        cost: f.cost ? Number(f.cost) : undefined,
        applicationsEnabled: f.applicationsEnabled,
        applicationRoles: f.applicationsEnabled ? parsedRoles : undefined,
      };
      await api.post("/api/projects", projectPayload);

      if (f.createMediaRequest) {
        const fallbackBrief = f.description?.trim()
          ? `Project summary: ${f.description.trim()}`
          : "Need Media to capture and upload polished project photos for the archive and future public-facing updates.";
        await api.post("/api/service-requests", {
          requestType: "project_media",
          targetDepartmentSlug: "media",
          title: `Project media coverage — ${f.title.trim()}`,
          description: `${f.mediaRequestBrief.trim() || fallbackBrief}\n\nProject: ${f.title.trim()}`,
          priority: "medium",
          attachmentUrls: [],
        });
      }
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "dashboard-field";
  const selectCls = "dashboard-select";
  const labelCls = "block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg glass-card p-8 relative max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors">
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-foreground mb-6">{tr("Create Project", "إنشاء مشروع")}</h2>

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>{tr("Title *", "العنوان *")}</label>
            <input required value={f.title} onChange={set("title")} placeholder={tr("Project title", "عنوان المشروع")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{tr("Description", "الوصف")}</label>
            <textarea value={f.description} onChange={set("description")} rows={3} placeholder={tr("What is this project about?", "عن أي شيء هذا المشروع؟")} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{tr("Category", "التصنيف")}</label>
              <input value={f.category} onChange={set("category")} placeholder={tr("e.g. Robotics, AI", "مثل: روبوتات، ذكاء اصطناعي")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Status", "الحالة")}</label>
              <select value={f.status} onChange={set("status")} className={selectCls}>
                <option value="planning">{tr("Planning", "تخطيط")}</option>
                <option value="in_progress">{tr("In Progress", "قيد التنفيذ")}</option>
                <option value="testing">{tr("Testing", "تجريب")}</option>
                <option value="completed">{tr("Completed", "مكتمل")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>{tr("Tech Stack (comma-separated)", "التقنيات المستخدمة (مفصولة بفاصلة)")}</label>
            <input value={f.techStack} onChange={set("techStack")} placeholder={tr("e.g. ROS2, Python, OpenCV", "مثل: ROS2، Python، OpenCV")} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{tr("Credit Hours", "الساعات المعتمدة")}</label>
              <input type="number" min="0" step="0.5" value={f.creditHours} onChange={set("creditHours")} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Budget (SAR)", "الميزانية (ر.س)")}</label>
              <input type="number" min="0" step="0.01" value={f.cost} onChange={set("cost")} placeholder={tr("optional", "اختياري")} className={inputCls} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface/40 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={f.applicationsEnabled}
                onChange={(e) => setF((prev) => ({ ...prev, applicationsEnabled: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-border bg-surface-elevated text-primary focus:ring-primary/30"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{tr("Accept member applications for this project", "قبول طلبات الأعضاء لهذا المشروع")}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {tr("When enabled, signed-in members will see the open roles on the Projects page and can apply there.", "عند التفعيل، يرى الأعضاء المسجَّلون الأدوار المفتوحة في صفحة المشاريع ويمكنهم التقديم.")}
                </p>
              </div>
            </label>

            {f.applicationsEnabled && (
              <div className="mt-4">
                <label className={labelCls}>{tr("Application Roles", "أدوار الطلب")}</label>
                <textarea
                  value={f.applicationRoles}
                  onChange={set("applicationRoles")}
                  rows={4}
                  placeholder={tr("One role per line\nFlight Controls\nComputer Vision\nField Testing", "دور واحد في كل سطر\nFlight Controls\nComputer Vision\nField Testing")}
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  {tr("Add every role members can apply for. These roles will appear individually in the member application form.", "أضف كل دور يستطيع الأعضاء التقديم له. ستظهر الأدوار منفصلة في نموذج تقديم العضو.")}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface/40 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={f.createMediaRequest}
                onChange={(e) => setF((prev) => ({ ...prev, createMediaRequest: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-border bg-surface-elevated text-primary focus:ring-primary/30"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{tr("Create linked Media photo request", "إنشاء طلب تصوير مرتبط بفريق الإعلام")}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {tr("Sends a project-media request to the Media team so they can capture and upload photos for this project.", "يرسل طلب إعلامي لفريق الإعلام لالتقاط ورفع صور المشروع.")}
                </p>
              </div>
            </label>

            {f.createMediaRequest && (
              <div className="mt-4">
                <label className={labelCls}>{tr("Media Request Brief", "ملخّص طلب الإعلام")}</label>
                <textarea
                  value={f.mediaRequestBrief}
                  onChange={set("mediaRequestBrief")}
                  rows={4}
                  placeholder={tr("What kind of photos or coverage does the project need?", "ما نوع الصور أو التغطية التي يحتاجها المشروع؟")}
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  {tr("If left blank, the project description will be used as the base brief.", "إذا تُرك فارغاً، سيُستخدم وصف المشروع كملخّص أساسي.")}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm flex-1">{tr("Cancel", "إلغاء")}</button>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" /> {tr("Creating…", "جارٍ الإنشاء…")}</> : tr("Create Project", "إنشاء المشروع")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── View type ────────────────────────────────────────────────────────────────

type View = "projects" | "tasks" | "team" | "applications";

// ─── Applications Inbox ───────────────────────────────────────────────────────

interface ProjectApplicationRow {
  applicationId: number;
  projectId: number;
  projectTitle: string;
  memberId: number;
  memberName: string;
  memberAvatarUrl: string | null;
  role: string;
  note: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

function ApplicationsInbox() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [statusFilter, setStatusFilter] = useState<"pending" | "accepted" | "rejected">("pending");
  const [actingId, setActingId] = useState<number | null>(null);

  const { data, isLoading: loading, mutate: load } = useApi<ProjectApplicationRow[]>(
    `/api/project-applications?status=${statusFilter}&department=innovation`,
  );
  const rows = data ?? [];

  async function decide(application: ProjectApplicationRow, status: "accepted" | "rejected") {
    if (status === "rejected") {
      const confirmMsg = lang === "ar"
        ? `رفض طلب "${application.memberName}" للدور "${application.role}"؟`
        : `Reject ${application.memberName}'s application for "${application.role}"?`;
      if (!window.confirm(confirmMsg)) return;
    }
    setActingId(application.applicationId);
    try {
      await api.patch(`/api/project-applications/${application.applicationId}`, { status });
      toast.success(status === "accepted"
        ? tr("Application accepted", "تم قبول الطلب")
        : tr("Application rejected", "تم رفض الطلب"));
      load();
    } catch {
      toast.error(tr("Action failed. Please try again.", "فشل الإجراء. حاول مرة أخرى."));
    } finally {
      setActingId(null);
    }
  }

  const filterButtons: { key: typeof statusFilter; label: string }[] = [
    { key: "pending",  label: tr("Pending",  "قيد المراجعة") },
    { key: "accepted", label: tr("Accepted", "مقبول") },
    { key: "rejected", label: tr("Rejected", "مرفوض") },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {tr("Project Applications", "طلبات المشاريع")}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {tr(
              "Members applying to join Innovation projects. Accept to add them to the project team.",
              "الأعضاء المتقدّمون للانضمام إلى مشاريع الابتكار. القبول يضيفهم إلى فريق المشروع.",
            )}
          </p>
        </div>
        <div className="tab-rail" role="tablist" aria-label={tr("Application status", "حالة الطلب")}>
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              data-active={statusFilter === key}
              role="tab"
              aria-selected={statusFilter === key}
              className="tab-pill"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={
            statusFilter === "pending"
              ? tr("No pending applications", "لا توجد طلبات قيد المراجعة")
              : statusFilter === "accepted"
                ? tr("No accepted applications yet", "لم يُقبل أي طلب بعد")
                : tr("No rejected applications", "لا توجد طلبات مرفوضة")
          }
          body={tr("Project applications appear here when members request to join.", "تظهر طلبات الانضمام للمشاريع هنا عندما يطلب الأعضاء الانضمام.")}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((app) => (
            <div key={app.applicationId} className="glass-card p-4">
              <div className="flex items-start gap-3">
                {app.memberAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.memberAvatarUrl} alt={app.memberName} loading="lazy" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-surface-elevated grid place-items-center text-xs text-muted">
                    {app.memberName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      <MemberLink memberId={app.memberId} name={app.memberName} />
                    </p>
                    <span className="text-xs text-muted">→</span>
                    <Link href={`/dashboard/innovation/projects/${app.projectId}`} className="text-xs text-primary hover:underline">
                      {app.projectTitle}
                    </Link>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                    {app.role}
                  </div>
                  {app.note && (
                    <p className="mt-2 text-xs leading-5 text-muted whitespace-pre-wrap">{app.note}</p>
                  )}
                  <p className="mt-2 text-[11px] text-muted/60">
                    {tr("Submitted", "مُقدَّم")}: {new Date(app.createdAt).toLocaleDateString(lang === "ar" ? "ar" : "en-US")}
                  </p>
                </div>
                {statusFilter === "pending" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => decide(app, "rejected")}
                      disabled={actingId === app.applicationId}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-error hover:border-error/30 hover:bg-error/10 text-xs transition-colors disabled:opacity-40"
                    >
                      {tr("Reject", "رفض")}
                    </button>
                    <button
                      onClick={() => decide(app, "accepted")}
                      disabled={actingId === app.applicationId}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {actingId === app.applicationId ? <Loader2 size={11} className="animate-spin" /> : null}
                      {tr("Accept", "قبول")}
                    </button>
                  </div>
                )}
                {statusFilter !== "pending" && (
                  <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full ${
                    app.status === "accepted"
                      ? "text-green-400 bg-green-400/10"
                      : "text-red-400 bg-red-400/10"
                  }`}>
                    {app.status === "accepted" ? tr("Accepted", "مقبول") : tr("Rejected", "مرفوض")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InnovationDashboard() {
  const { lang } = useLang();
  const [activeView, setActiveView] = useState<View>("projects");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [archiveKey, setArchiveKey] = useState(0);
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { data: innovationProjects = [], mutate: refreshInnovationProjects } = useApi<{ projectId: number; status: string; departmentSlug: string | null }[]>(
    "/api/projects?scope=all",
  );
  const innoProjects = innovationProjects.filter((p) => p.departmentSlug === "innovation");
  const activeProjects = innoProjects.filter((p) => p.status === "active" || p.status === "in_progress").length;
  const completedProjects = innoProjects.filter((p) => p.status === "completed").length;

  const { data: innovationApplications = [], mutate: refreshInnovationApplications } = useApi<ProjectApplicationRow[]>(
    "/api/innovation/applications?scope=open",
  );
  const openApplications = innovationApplications.length;

  return (
    <div>
      <DashboardHeader
        title={tr("Innovation", "الابتكار")}
        description={tr("Hardware builds, archive publishing, competitions, events, and lab operations.", "البناءات التقنية، نشر الأرشيف، المسابقات، الفعاليات، وتشغيل المعمل.")}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard icon={Lightbulb} label={tr("Active Projects", "المشاريع النشطة")} value={activeProjects} onClick={() => setActiveView("projects")} />
        <StatCard icon={Wrench}    label={tr("Completed Projects", "المشاريع المكتملة")} value={completedProjects} onClick={() => setActiveView("projects")} />
        <StatCard icon={Cpu}       label={tr("Open Applications", "الطلبات المفتوحة")} value={openApplications} onClick={() => setActiveView("applications")} />
        <StatCard icon={Box}       label={tr("Total Projects", "إجمالي المشاريع")} value={innoProjects.length} onClick={() => setActiveView("projects")} />
      </div>

      {/* Bulk-import past events / activities */}
      <div className="mb-8">
        <BulkUploadCard
          title="Bulk-import past events"
          titleAr="استيراد فعاليات سابقة بالجملة"
          description="Download a CSV pre-filled with example rows, list each past competition / workshop / visit with date and credit hours, then re-upload. Imported events go in as drafts — media leadership publishes them."
          descriptionAr="حمّل ملف CSV معبأ بأمثلة، أضف كل فعالية أو ورشة أو زيارة سابقة مع التاريخ والساعات المعتمدة، ثم أعد الرفع. الفعاليات المستوردة تكون كمسودات إلى أن ينشرها فريق الإعلام."
          templateUrl="/api/events/bulk/template"
          uploadUrl="/api/events/bulk"
          templateFilename="events-bulk-template.csv"
          onComplete={() => { setArchiveKey(k => k + 1); }}
        />
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="tab-rail w-fit" role="tablist" aria-label={tr("Innovation sections", "أقسام الابتكار")}>
          {([
            { key: "projects",     label: tr("Projects & Events", "المشاريع والفعاليات") },
            { key: "tasks",        label: tr("Task Review", "مراجعة المهام") },
            { key: "team",         label: tr("Team Performance", "أداء الفريق") },
            { key: "applications", label: tr("Applications", "الطلبات") },
          ] as { key: View; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              data-active={activeView === key}
              role="tab"
              aria-selected={activeView === key}
              className="tab-pill"
            >
              {label}
              {key === "applications" && openApplications > 0 ? (
                <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">{openApplications}</span>
              ) : null}
            </button>
          ))}
        </div>
        {activeView === "projects" && (
          <button
            onClick={() => setShowCreateProject(true)}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
          >
            <Plus size={14} />
            {tr("New Project", "مشروع جديد")}
          </button>
        )}
      </div>

      {/* Projects tab */}
      {activeView === "projects" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <ArchiveManager key={archiveKey} />
        </motion.div>
      )}

      {/* Tasks tab */}
      {activeView === "tasks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <LeaderTaskReviewPanel
            department="innovation"
            title="Innovation task review"
            titleAr="مراجعة مهام الابتكار"
          />
        </motion.div>
      )}

      {/* Team tab */}
      {activeView === "team" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <MemberPerformancePanel defaultDepartment="innovation" showDepartmentFilter={false} />
        </motion.div>
      )}

      {/* Applications tab */}
      {activeView === "applications" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <ApplicationsInbox />
        </motion.div>
      )}

      <AnimatePresence>
        {showCreateProject && (
          <CreateProjectModal
            onClose={() => setShowCreateProject(false)}
            onCreated={() => {
              setShowCreateProject(false);
              setArchiveKey(k => k + 1);
              void refreshInnovationProjects();
              void refreshInnovationApplications();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
