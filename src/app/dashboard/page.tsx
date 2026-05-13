"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Calendar,
  Check,
  Clock3,
  ExternalLink,
  FolderKanban,
  HeartHandshake,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Send,
  Sparkles,
  Star,
  TimerReset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useEscape } from "@/lib/hooks/useEscape";
import { useApi } from "@/lib/hooks/useApi";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ImageUrlInput } from "@/components/dashboard/ImageUrlInput";
import { StatCard } from "@/components/dashboard/StatCard";
import { MemberLink } from "@/components/dashboard/MemberLink";
import { MemberCombobox } from "@/components/dashboard/MemberCombobox";
import { api } from "@/lib/client";
import { toExternalUrl } from "@/lib/url";
import { MadaratRegistrationModal } from "@/components/sections/MadaratRegistrationModal";

interface EventItem {
  eventId: number | string;
  title: string;
  description: string | null;
  startTime: string;
  location: string | null;
  registrationKind?: "madarat" | null;
  registrationOpen?: boolean | null;
  visibility?: "public" | "club_only" | null;
  seatsAvailable?: number | null;
}

interface TaskRow {
  taskId: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  artifactUrl: string | null;
  artifactNotes: string | null;
  submittedAt: string | null;
  dueDate: string | null;
  creditHours: number;
  projectTitle?: string | null;
  departmentSlug?: string | null;
}

interface HourRow {
  id: number;
  hours: number;
  title: string;
  participationDate: string;
  approvalStatus: "pending" | "approved" | "rejected";
  sourceType: "self_logged" | "task_credit" | "project_credit" | "event_credit" | "hour_task";
  sourceId?: number | null;
}

interface VolunteerHourTask {
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
  myRegistrationStatus: "pending" | "approved" | "rejected" | null;
  myRegistrationCount: number;
}

interface AnnouncementItem {
  announcementId: number;
  title: string;
  body: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  isPinned: boolean;
  createdAt: string;
}

interface UpcomingEventsResponse {
  upcoming: EventItem[];
  past: EventItem[];
}

interface EndorsementProjectOption {
  projectId: number;
  title: string;
}

interface EndorsementMemberOption {
  memberId: number;
  fullName: string;
  departmentName: string;
  position: string;
  sharedProjects: EndorsementProjectOption[];
}

interface EndorsementHistoryRow {
  endorsementId: string;
  endorserMemberId: number;
  endorserName: string;
  endorseeMemberId: number;
  endorseeName: string;
  endorseeDepartment: string;
  contextType: "worked_together" | "project_together";
  projectId: number | null;
  projectTitle: string | null;
  note: string | null;
  points: number;
  createdAt: string;
}

interface EndorsementResponse {
  members: EndorsementMemberOption[];
  summary: {
    endorsementPoints: number;
    endorsementsReceived: number;
    endorsementsGiven: number;
  };
  received: EndorsementHistoryRow[];
  given: EndorsementHistoryRow[];
}

const emptyEndorsementSummary: EndorsementResponse["summary"] = {
  endorsementPoints: 0,
  endorsementsReceived: 0,
  endorsementsGiven: 0,
};

const hourStatusClass: Record<HourRow["approvalStatus"], string> = {
  pending: "badge badge-warning",
  approved: "badge badge-success",
  rejected: "badge badge-error",
};

const sourceTypeClass: Record<HourRow["sourceType"], string> = {
  self_logged: "badge bg-surface-elevated text-muted border-border",
  task_credit: "badge bg-blue-500/10 text-blue-400 border-blue-500/20",
  project_credit: "badge bg-purple-500/10 text-purple-400 border-purple-500/20",
  event_credit: "badge bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  hour_task: "badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
};

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: TaskRow["status"], lang: string) {
  const labels = {
    todo: ["To do", "للإنجاز"],
    in_progress: ["In progress", "قيد التنفيذ"],
    review: ["In review", "قيد المراجعة"],
    done: ["Done", "مكتملة"],
  } satisfies Record<TaskRow["status"], [string, string]>;
  return lang === "ar" ? labels[status][1] : labels[status][0];
}

function hourStatusLabel(status: HourRow["approvalStatus"], lang: string) {
  const labels = {
    pending: ["Pending", "معلقة"],
    approved: ["Approved", "مقبولة"],
    rejected: ["Rejected", "مرفوضة"],
  } satisfies Record<HourRow["approvalStatus"], [string, string]>;
  return lang === "ar" ? labels[status][1] : labels[status][0];
}

function sourceTypeLabel(sourceType: HourRow["sourceType"], lang: string) {
  const labels = {
    self_logged: ["Self", "ذاتي"],
    task_credit: ["Task", "مهمة"],
    project_credit: ["Project", "مشروع"],
    event_credit: ["Event", "فعالية"],
    hour_task: ["Hour Task", "مهمة ساعات"],
  } satisfies Record<HourRow["sourceType"], [string, string]>;
  return lang === "ar" ? labels[sourceType][1] : labels[sourceType][0];
}

function priorityClass(priority: TaskRow["priority"]) {
  if (priority === "urgent") return "bg-red-400/12 text-red-300 border-red-400/20";
  if (priority === "high") return "bg-amber-400/12 text-amber-300 border-amber-400/20";
  if (priority === "medium") return "bg-primary/12 text-primary border-primary/20";
  return "bg-emerald-400/12 text-emerald-300 border-emerald-400/20";
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-border bg-surface/45 p-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  icon: Icon,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="panel-soft p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/75">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <Icon size={18} className="text-primary/75" />
        </div>
      </div>
      {children}
    </section>
  );
}

function LoadingPanel() {
  return (
    <div className="panel-soft p-6">
      <div className="h-4 w-28 animate-pulse rounded bg-surface-elevated" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-2xl bg-surface-elevated" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const { lang } = useLang();
  const tr = useCallback((en: string, ar: string) => (lang === "ar" ? ar : en), [lang]);

  const { data: eventsData, isLoading: loadingEvents, mutate: refreshEvents } = useApi<UpcomingEventsResponse>("/api/events/public");
  const { data: tasks = [], isLoading: loadingTasks, mutate: refreshTasks } = useApi<TaskRow[]>("/api/tasks?mine=1");
  const { data: hours = [], isLoading: loadingHours, mutate: refreshHours } = useApi<HourRow[]>("/api/volunteer-hours");
  const { data: hourTasks = [], isLoading: loadingHourTasks, mutate: refreshHourTasks } = useApi<VolunteerHourTask[]>("/api/volunteer-hour-tasks");
  const { data: announcements = [], isLoading: loadingAnnouncements, mutate: refreshAnnouncements } = useApi<AnnouncementItem[]>("/api/announcements");
  const { data: endorsementsData, isLoading: loadingEndorsements, mutate: refreshEndorsementsApi } = useApi<EndorsementResponse>("/api/endorsements");

  const events = eventsData?.upcoming ?? [];
  const endorsementMembers = endorsementsData?.members ?? [];
  const endorsementSummary = endorsementsData?.summary ?? emptyEndorsementSummary;
  const endorsementsReceived = endorsementsData?.received ?? [];
  const endorsementsGiven = endorsementsData?.given ?? [];
  const loading = loadingEvents || loadingTasks || loadingHours || loadingHourTasks || loadingAnnouncements || loadingEndorsements;
  const [error] = useState<string | null>(null);
  const [registerEvent, setRegisterEvent] = useState<EventItem | null>(null);

  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    hours: "",
    title: "",
    description: "",
    participationDate: new Date().toISOString().slice(0, 10),
  });
  const [logSaving, setLogSaving] = useState(false);
  const [registeringHourTaskId, setRegisteringHourTaskId] = useState<number | null>(null);
  const [submitFor, setSubmitFor] = useState<TaskRow | null>(null);
  const [submitArtifactUrl, setSubmitArtifactUrl] = useState("");
  const [submitArtifactNotes, setSubmitArtifactNotes] = useState("");
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);

  useEscape(submitFor !== null, () => setSubmitFor(null));
  const [endorsementSaving, setEndorsementSaving] = useState(false);
  const [endorsementError, setEndorsementError] = useState<string | null>(null);
  const [endorsementForm, setEndorsementForm] = useState({
    endorseeMemberId: "",
    contextType: "worked_together" as "worked_together" | "project_together",
    projectId: "",
    note: "",
  });

  const loadWorkspace = useCallback(() => {
    void refreshEvents();
    void refreshTasks();
    void refreshHours();
    void refreshHourTasks();
    void refreshAnnouncements();
    void refreshEndorsementsApi();
  }, [refreshEvents, refreshTasks, refreshHours, refreshHourTasks, refreshAnnouncements, refreshEndorsementsApi]);

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const reviewTasks = useMemo(() => tasks.filter((task) => task.status === "review"), [tasks]);
  const pendingHours = useMemo(() => hours.filter((item) => item.approvalStatus === "pending"), [hours]);
  const approvedHours = useMemo(
    () => hours.filter((item) => item.approvalStatus === "approved").reduce((sum, item) => sum + Number(item.hours), 0),
    [hours],
  );
  const pendingHourTotal = useMemo(
    () => pendingHours.reduce((sum, item) => sum + Number(item.hours), 0),
    [pendingHours],
  );
  const nextEvent = events[0] ?? null;
  const selectedEndorsee = endorsementMembers.find((member) => String(member.memberId) === endorsementForm.endorseeMemberId) ?? null;
  const selectedSharedProjects = selectedEndorsee?.sharedProjects ?? [];

  const actionItems = useMemo(() => {
    const items: Array<{ title: string; body: string; icon: LucideIcon; action?: () => void; href?: string }> = [];

    const nextTask = openTasks.find((task) => task.status !== "review") ?? openTasks[0];
    if (nextTask) {
      items.push({
        title: tr("Submit or update assigned work", "أرسل أو حدّث العمل المسند"),
        body: nextTask.title,
        icon: Send,
        action: () => {
          setSubmitFor(nextTask);
          setSubmitArtifactUrl(nextTask.artifactUrl ?? "");
          setSubmitArtifactNotes(nextTask.artifactNotes ?? "");
        },
      });
    }

    const availableHourTask = hourTasks.find((task) => !task.myRegistrationStatus);
    if (availableHourTask) {
      items.push({
        title: tr("Register for available hours", "سجّل في ساعات متاحة"),
        body: `${availableHourTask.title} · ${availableHourTask.hours}h`,
        icon: TimerReset,
        action: () => void handleRegisterHourTask(availableHourTask),
      });
    }

    items.push({
      title: tr("Log volunteer hours", "سجّل ساعات تطوعية"),
      body: tr("Add completed work for HR review.", "أضف عملًا مكتملًا لمراجعة الموارد."),
      icon: Clock3,
      action: () => setLogOpen(true),
    });

    if (nextEvent) {
      items.push({
        title: tr("Prepare for the next event", "استعد للفعالية التالية"),
        body: nextEvent.title,
        icon: Calendar,
        href: "/events",
      });
    }

    return items.slice(0, 4);
  }, [hourTasks, nextEvent, openTasks, tr]);

  const handleLogHours = async () => {
    if (!logForm.hours || !logForm.title || !logForm.participationDate) return;
    setLogSaving(true);
    try {
      const result = await api.post<{ id: number } | HourRow>("/api/volunteer-hours", {
        hours: Number(logForm.hours),
        title: logForm.title,
        description: logForm.description || undefined,
        participationDate: logForm.participationDate,
      });
      const row: HourRow = {
        id: Number(result.id),
        hours: Number(logForm.hours),
        title: logForm.title,
        participationDate: logForm.participationDate,
        approvalStatus: "pending",
        sourceType: "self_logged",
        sourceId: null,
      };
      void refreshHours();
      void row;
      setLogForm({ hours: "", title: "", description: "", participationDate: new Date().toISOString().slice(0, 10) });
      toast.success(tr("Hours logged", "تم تسجيل الساعات"));
      setLogOpen(false);
    } finally {
      setLogSaving(false);
    }
  };

  const handleRegisterHourTask = async (task: VolunteerHourTask) => {
    setRegisteringHourTaskId(task.opportunityId);
    try {
      await api.post<HourRow>(`/api/volunteer-hour-tasks/${task.opportunityId}/register`);
      void refreshHourTasks();
      void refreshHours();
    } finally {
      setRegisteringHourTaskId(null);
    }
  };

  const openSubmit = (task: TaskRow) => {
    setSubmitFor(task);
    setSubmitArtifactUrl(task.artifactUrl ?? "");
    setSubmitArtifactNotes(task.artifactNotes ?? "");
  };

  const handleTaskSubmit = async () => {
    if (!submitFor || !submitArtifactUrl) return;
    setSubmittingTaskId(submitFor.taskId);
    try {
      await api.patch(`/api/tasks/${submitFor.taskId}`, {
        artifactUrl: submitArtifactUrl,
        artifactNotes: submitArtifactNotes || undefined,
        status: "review",
      });
      void refreshTasks();
      setSubmitFor(null);
      setSubmitArtifactUrl("");
      setSubmitArtifactNotes("");
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const refreshEndorsements = async () => {
    await refreshEndorsementsApi();
  };

  const handleEndorse = async () => {
    if (!endorsementForm.endorseeMemberId) return;
    if (endorsementForm.contextType === "project_together" && !endorsementForm.projectId) return;
    setEndorsementSaving(true);
    setEndorsementError(null);
    try {
      await api.post("/api/endorsements", {
        endorseeMemberId: Number(endorsementForm.endorseeMemberId),
        contextType: endorsementForm.contextType,
        projectId: endorsementForm.contextType === "project_together" ? Number(endorsementForm.projectId) : undefined,
        note: endorsementForm.note || undefined,
      });
      await refreshEndorsements();
      setEndorsementForm({ endorseeMemberId: "", contextType: "worked_together", projectId: "", note: "" });
      toast.success(tr("Endorsement submitted", "تمت إضافة التزكية"));
    } catch (e) {
      setEndorsementError((e as { message?: string }).message ?? tr("Could not submit endorsement.", "تعذر إرسال التزكية."));
    } finally {
      setEndorsementSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <DashboardHeader
        title={tr(`My Workspace, ${user.name.split(" ")[0]}`, `مساحتي، ${user.name.split(" ")[0]}`)}
        description={tr(
          "Your daily hub for assigned work, volunteer hours, recognition, and the next action that needs attention.",
          "مركزك اليومي للمهام المسندة والساعات التطوعية والتقدير والخطوة التالية التي تحتاج انتباهك.",
        )}
      />

      {error ? (
        <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

      {/* Inline summary strip — replaces the old 4-card KPI row.
          Values stay visible but stop competing visually with the work below. */}
      <div className="mb-7 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border/60 bg-surface/25 px-4 py-3 text-sm sm:px-5">
        {[
          { label: tr("Open Tasks", "المهام المفتوحة"), value: openTasks.length },
          { label: tr("Pending Hours", "ساعات معلقة"), value: pendingHourTotal.toFixed(1) },
          { label: tr("Approved Hours", "ساعات مقبولة"), value: approvedHours.toFixed(1) },
          { label: tr("Endorsement Points", "نقاط التزكية"), value: endorsementSummary.endorsementPoints },
        ].map((item) => (
          <div key={item.label} className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">{item.label}</span>
            <span data-stat-value className="text-base font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <LoadingPanel />
          <LoadingPanel />
          <LoadingPanel />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
            <Panel eyebrow={tr("Next Best Action", "أفضل خطوة تالية")} title={tr("What needs your attention", "ما يحتاج انتباهك")} icon={Sparkles}>
              <div className="grid gap-3 sm:grid-cols-2">
                {actionItems.map((item) => {
                  const content = (
                    <>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <item.icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
                      </div>
                    </>
                  );

                  if (item.href) {
                    return (
                      <Link key={item.title} href={item.href} className="interactive-card flex min-h-24 items-start gap-3 rounded-[1.1rem] border border-border bg-surface/50 p-4 text-left">
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button key={item.title} type="button" onClick={item.action} className="interactive-card flex min-h-24 items-start gap-3 rounded-[1.1rem] border border-border bg-surface/50 p-4 text-left">
                      {content}
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel eyebrow={tr("Today", "اليوم")} title={tr("Event and announcements", "الفعالية والإعلانات")} icon={Megaphone}>
              <div className="space-y-4">
                <div className="rounded-[1.1rem] border border-primary/20 bg-primary/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                    {tr("Next Event", "الفعالية التالية")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-foreground">
                    {nextEvent ? nextEvent.title : tr("No upcoming event", "لا توجد فعالية قادمة")}
                  </h3>
                  {nextEvent ? (
                    <>
                      <p className="mt-2 text-sm leading-6 text-muted">{nextEvent.description || tr("Details will be shared soon.", "سيتم مشاركة التفاصيل قريبًا.")}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-border bg-background/55 px-3 py-1 text-xs text-muted">
                          {formatDateTime(nextEvent.startTime, lang)}
                        </span>
                        {nextEvent.location ? (
                          <span className="rounded-full border border-border bg-background/55 px-3 py-1 text-xs text-muted">{nextEvent.location}</span>
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {nextEvent.registrationKind === "madarat" && nextEvent.registrationOpen ? (
                          <button
                            type="button"
                            disabled={nextEvent.seatsAvailable === 0}
                            onClick={() => setRegisterEvent(nextEvent)}
                            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-50"
                          >
                            {nextEvent.seatsAvailable === 0 ? tr("Full", "مكتمل") : tr("Register", "سجّل")}
                          </button>
                        ) : null}
                        <Link href="/events" className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
                          {tr("View all events", "عرض كل الفعاليات")}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted">{tr("Use this space to move tasks or log recent work.", "استخدم هذه المساحة لتحريك المهام أو تسجيل العمل الأخير.")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  {announcements.slice(0, 3).map((announcement) => (
                    <div key={announcement.announcementId} className="rounded-[1rem] border border-border bg-surface/45 p-3">
                      <div className="flex items-start gap-3">
                        {announcement.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={announcement.imageUrl} alt={announcement.title} loading="lazy" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{announcement.title}</p>
                            {announcement.isPinned ? <span className="badge badge-primary text-[10px]">{tr("Pinned", "مثبت")}</span> : null}
                          </div>
                          {announcement.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{announcement.body}</p> : null}
                          {announcement.linkUrl ? (
                            <a href={toExternalUrl(announcement.linkUrl)} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                              {tr("Open link", "فتح الرابط")} <ExternalLink size={11} />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <Panel eyebrow={tr("Assigned Work", "العمل المسند")} title={tr("My Tasks", "مهامي")} icon={FolderKanban}>
              {openTasks.length === 0 ? (
                <EmptyPanel title={tr("No active tasks", "لا توجد مهام نشطة")} body={tr("Assigned work will appear here when your team routes tasks to you.", "سيظهر العمل المسند هنا عندما يوجه فريقك مهامًا لك.")} />
              ) : (
                <div className="space-y-3">
                  {openTasks.map((task) => (
                    <div key={task.taskId} className="rounded-[1.1rem] border border-border bg-surface/45 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{task.title}</p>
                          <p className="mt-1 text-xs text-muted">
                            {[task.projectTitle, task.departmentSlug, task.dueDate ? `${tr("Due", "الموعد")} ${formatDate(task.dueDate, lang)}` : null].filter(Boolean).join(" · ")}
                          </p>
                          {task.description ? <p className="mt-2 text-sm leading-6 text-muted">{task.description}</p> : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {task.creditHours > 0 ? <span className="badge bg-blue-500/10 text-blue-400 border-blue-500/20">{task.creditHours}h</span> : null}
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${priorityClass(task.priority)}`}>
                            {statusLabel(task.status, lang)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted">
                          {task.submittedAt
                            ? `${tr("Submitted", "تم الإرسال")} ${formatDate(task.submittedAt, lang)}`
                            : tr("No submission yet", "لا يوجد إرسال حتى الآن")}
                        </p>
                        {task.status !== "done" ? (
                          <button onClick={() => openSubmit(task)} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs">
                            <Send size={13} />
                            {task.status === "review" ? tr("Update Submission", "تحديث الإرسال") : tr("Submit Work", "إرسال العمل")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              eyebrow={tr("Volunteer Hours", "الساعات التطوعية")}
              title={tr("Hours and opportunities", "الساعات والفرص")}
              icon={Clock3}
              actions={
                <button onClick={() => setLogOpen((value) => !value)} className="btn-primary inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs">
                  <Plus size={13} />
                  {tr("Log Hours", "تسجيل ساعات")}
                </button>
              }
            >
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { label: tr("Approved", "مقبولة"), value: approvedHours, cls: "text-green-400" },
                  { label: tr("Pending", "معلقة"), value: pendingHourTotal, cls: "text-yellow-400" },
                  { label: tr("Entries", "المدخلات"), value: hours.length, cls: "text-primary" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="rounded-xl border border-border bg-surface-elevated/50 p-3 text-center">
                    <p className={`text-xl font-bold ${cls}`}>{typeof value === "number" ? value.toFixed(label === tr("Entries", "المدخلات") ? 0 : 1) : value}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{label}</p>
                  </div>
                ))}
              </div>

              {logOpen ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5 overflow-hidden rounded-[1.1rem] border border-primary/20 bg-surface/55 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {tr("Hours", "الساعات")}
                      <input type="number" min="0.5" step="0.5" value={logForm.hours} onChange={(event) => setLogForm((form) => ({ ...form, hours: event.target.value }))} className="dashboard-field min-h-11 w-full px-3 py-2 text-sm" placeholder={tr("e.g. 2.5", "مثال: 2.5")} />
                    </label>
                    <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {tr("Date", "التاريخ")}
                      <input type="date" value={logForm.participationDate} onChange={(event) => setLogForm((form) => ({ ...form, participationDate: event.target.value }))} className="dashboard-field min-h-11 w-full px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <label className="mt-3 block space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {tr("Activity", "النشاط")}
                    <input type="text" value={logForm.title} onChange={(event) => setLogForm((form) => ({ ...form, title: event.target.value }))} className="dashboard-field min-h-11 w-full px-3 py-2 text-sm" placeholder={tr("Workshop facilitation", "تنظيم ورشة")} />
                  </label>
                  <label className="mt-3 block space-y-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {tr("Description", "الوصف")}
                    <input type="text" value={logForm.description} onChange={(event) => setLogForm((form) => ({ ...form, description: event.target.value }))} className="dashboard-field min-h-11 w-full px-3 py-2 text-sm" placeholder={tr("Optional context", "سياق اختياري")} />
                  </label>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setLogOpen(false)} className="btn-secondary min-h-11 px-4 py-2 text-xs">{tr("Cancel", "إلغاء")}</button>
                    <button onClick={handleLogHours} disabled={logSaving || !logForm.hours || !logForm.title} className="btn-primary inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs disabled:opacity-50">
                      {logSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {tr("Submit", "إرسال")}
                    </button>
                  </div>
                </motion.div>
              ) : null}

              <div className="mb-5 rounded-[1.1rem] border border-border bg-surface/40 p-4">
                <h3 className="text-sm font-semibold text-foreground">{tr("Available Hour Tasks", "مهام الساعات المتاحة")}</h3>
                <div className="mt-3 space-y-3">
                  {hourTasks.length === 0 ? (
                    <p className="text-sm text-muted">{tr("No open hour tasks right now.", "ما فيه مهام ساعات مفتوحة حاليًا.")}</p>
                  ) : hourTasks.slice(0, 4).map((task) => {
                    // Repetitive tasks stay registrable even after prior logs.
                    const blockedByPrior = !task.isRepetitive && Boolean(task.myRegistrationStatus);
                    return (
                    <div key={task.opportunityId} className="rounded-xl border border-border bg-background/35 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            <span className="badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20">{task.hours}h</span>
                            {task.isRepetitive && (
                              <span className="badge bg-amber-500/10 text-amber-300 border-amber-500/20">
                                {tr("Repetitive", "متكررة")}
                              </span>
                            )}
                            {task.assignedDepartmentId && (
                              <span className="badge bg-primary/10 text-primary border-primary/20">
                                {task.assignedDepartmentName ?? task.assignedDepartmentSlug}
                              </span>
                            )}
                            {task.myRegistrationStatus && !task.isRepetitive ? <span className={hourStatusClass[task.myRegistrationStatus]}>{hourStatusLabel(task.myRegistrationStatus, lang)}</span> : null}
                            {task.isRepetitive && task.myRegistrationCount > 0 ? (
                              <span className="badge bg-surface-elevated text-muted border-border">
                                {tr(`Logged ${task.myRegistrationCount}×`, `سُجِّلت ${task.myRegistrationCount}×`)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted">{formatDate(task.participationDate, lang)}</p>
                          {task.description ? <p className="mt-2 text-xs leading-5 text-muted">{task.description}</p> : null}
                        </div>
                        <button onClick={() => handleRegisterHourTask(task)} disabled={blockedByPrior || registeringHourTaskId === task.opportunityId} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs disabled:opacity-50">
                          {registeringHourTaskId === task.opportunityId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          {blockedByPrior ? hourStatusLabel(task.myRegistrationStatus!, lang) : tr("Register", "تسجيل")}
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                {hours.length === 0 ? (
                  <EmptyPanel title={tr("No hours logged yet", "لا توجد ساعات مسجلة")} body={tr("Log hours or register for an available opportunity to start tracking your work.", "سجّل ساعات أو فرصة متاحة لبدء تتبع عملك.")} />
                ) : hours.slice(0, 6).map((hour) => (
                  <div key={hour.id} className="flex flex-col gap-2 border-b border-border/50 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{hour.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{formatDate(hour.participationDate, lang)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className={sourceTypeClass[hour.sourceType]}>{sourceTypeLabel(hour.sourceType, lang)}</span>
                      <span className="text-sm font-semibold text-foreground">{Number(hour.hours)}h</span>
                      <span className={hourStatusClass[hour.approvalStatus]}>{hourStatusLabel(hour.approvalStatus, lang)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel eyebrow={tr("Recognition", "التقدير")} title={tr("Endorsements and progress", "التزكيات والتقدم")} icon={Award}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div>
                <div className="mb-5 grid grid-cols-3 gap-3">
                  {[
                    { label: tr("Points", "النقاط"), value: endorsementSummary.endorsementPoints, cls: "text-primary" },
                    { label: tr("Received", "استلمتها"), value: endorsementSummary.endorsementsReceived, cls: "text-emerald-400" },
                    { label: tr("Given", "أرسلتها"), value: endorsementSummary.endorsementsGiven, cls: "text-amber-300" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="rounded-xl border border-border bg-surface-elevated/50 px-3 py-2.5 text-center">
                      <p className={`text-lg font-bold leading-tight ${cls}`}>{value}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.1rem] border border-primary/15 bg-surface/45 p-5 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="block">
                      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{tr("Member", "العضو")}</span>
                      <MemberCombobox
                        value={endorsementForm.endorseeMemberId}
                        members={endorsementMembers.map((m) => ({ memberId: m.memberId, fullName: m.fullName, departmentName: m.departmentName }))}
                        onChange={(memberId) => setEndorsementForm((form) => ({ ...form, endorseeMemberId: memberId, projectId: "" }))}
                        placeholder={tr("Type a name…", "ابحث عن عضو…")}
                        noResultsText={tr("No matches.", "لا نتائج.")}
                      />
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{tr("Reason", "السبب")}</span>
                      <select value={endorsementForm.contextType} onChange={(event) => setEndorsementForm((form) => ({ ...form, contextType: event.target.value as "worked_together" | "project_together", projectId: "" }))} className="dashboard-field min-h-11 w-full px-3 py-2 text-sm">
                        <option value="worked_together">{tr("We worked together", "اشتغلنا مع بعض")}</option>
                        <option value="project_together">{tr("Same project", "نفس المشروع")}</option>
                      </select>
                    </label>
                  </div>
                  {endorsementForm.contextType === "project_together" ? (
                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{tr("Shared Project", "المشروع المشترك")}</span>
                      <select value={endorsementForm.projectId} onChange={(event) => setEndorsementForm((form) => ({ ...form, projectId: event.target.value }))} disabled={!selectedEndorsee || selectedSharedProjects.length === 0} className="dashboard-field min-h-11 w-full px-3 py-2 text-sm disabled:opacity-50">
                        <option value="">{!selectedEndorsee ? tr("Choose a member first", "اختر عضو أولًا") : selectedSharedProjects.length === 0 ? tr("No shared projects found", "لا توجد مشاريع مشتركة") : tr("Choose a shared project", "اختر مشروع مشترك")}</option>
                        {selectedSharedProjects.map((project) => <option key={project.projectId} value={project.projectId}>{project.title}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{tr("Quick Note", "ملاحظة سريعة")}</span>
                    <textarea value={endorsementForm.note} onChange={(event) => setEndorsementForm((form) => ({ ...form, note: event.target.value.slice(0, 280) }))} rows={3} className="dashboard-field w-full resize-none px-3 py-2 text-sm" placeholder={tr("What did they contribute?", "وش كانت مساهمتهم؟")} />
                  </label>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted">
                      {selectedEndorsee ? tr(`Endorsing ${selectedEndorsee.fullName}`, `تزكية ${selectedEndorsee.fullName}`) : tr("Recognize collaboration while it is fresh.", "قدّر التعاون وهو حاضر.")}
                    </p>
                    <button onClick={handleEndorse} disabled={endorsementSaving || !endorsementForm.endorseeMemberId || (endorsementForm.contextType === "project_together" && !endorsementForm.projectId)} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs disabled:opacity-50">
                      {endorsementSaving ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
                      {tr("Submit Endorsement", "إرسال التزكية")}
                    </button>
                  </div>
                  {endorsementError ? <p className="mt-3 text-sm text-red-400">{endorsementError}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.1rem] border border-border bg-surface/35 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{tr("Recent Received", "آخر المستلمة")}</h3>
                  <div className="mt-3 space-y-3">
                    {endorsementsReceived.length === 0 ? (
                      <p className="text-sm text-muted">{tr("No endorsements received yet.", "ما وصلتك تزكيات حتى الآن.")}</p>
                    ) : endorsementsReceived.slice(0, 4).map((endorsement) => (
                      <div key={endorsement.endorsementId} className="rounded-xl border border-border/70 bg-background/35 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              <MemberLink memberId={endorsement.endorserMemberId} name={endorsement.endorserName} />
                            </p>
                            <p className="mt-0.5 text-xs text-muted">{endorsement.projectTitle || tr("Worked together", "اشتغلنا مع بعض")}</p>
                          </div>
                          <span className="badge badge-success">+{endorsement.points}</span>
                        </div>
                        {endorsement.note ? <p className="mt-2 text-xs leading-5 text-muted">{endorsement.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.1rem] border border-border bg-surface/35 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{tr("Recent Given", "آخر المرسلة")}</h3>
                  <div className="mt-3 space-y-3">
                    {endorsementsGiven.length === 0 ? (
                      <p className="text-sm text-muted">{tr("No endorsements submitted yet.", "ما أرسلت تزكيات حتى الآن.")}</p>
                    ) : endorsementsGiven.slice(0, 4).map((endorsement) => (
                      <div key={endorsement.endorsementId} className="rounded-xl border border-border/70 bg-background/35 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              <MemberLink memberId={endorsement.endorseeMemberId} name={endorsement.endorseeName} />
                            </p>
                            <p className="mt-0.5 text-xs text-muted">{endorsement.projectTitle || endorsement.endorseeDepartment}</p>
                          </div>
                          <span className="badge">{endorsement.contextType === "project_together" ? tr("Project", "مشروع") : tr("Collab", "تعاون")}</span>
                        </div>
                        {endorsement.note ? <p className="mt-2 text-xs leading-5 text-muted">{endorsement.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {reviewTasks.length > 0 ? (
            <Panel eyebrow={tr("In Review", "قيد المراجعة")} title={tr("Submitted work waiting on leaders", "أعمال مرسلة بانتظار القادة")} icon={HeartHandshake}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {reviewTasks.map((task) => (
                  <div key={task.taskId} className="rounded-[1.1rem] border border-border bg-surface/45 p-4">
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="mt-2 text-xs text-muted">{task.submittedAt ? formatDate(task.submittedAt, lang) : tr("Waiting for review", "بانتظار المراجعة")}</p>
                    {task.artifactUrl ? (
                      <a href={task.artifactUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-primary hover:text-primary-bright">
                        <ExternalLink size={12} />
                        {tr("Open artifact", "فتح المرفق")}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      )}

      {submitFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setSubmitFor(null); }}>
          <div className="w-full max-w-lg rounded-[1.1rem] border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
            <div>
              <p className="text-lg font-bold text-foreground">{tr("Submit Task Work", "إرسال عمل المهمة")}</p>
              <p className="mt-1 text-sm text-muted">{submitFor.title}</p>
            </div>
            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">{tr("Artifact URL", "رابط المرفق")}</label>
              <ImageUrlInput value={submitArtifactUrl} onChange={setSubmitArtifactUrl} />
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">{tr("Notes", "ملاحظات")}</label>
              <textarea value={submitArtifactNotes} onChange={(event) => setSubmitArtifactNotes(event.target.value)} rows={3} placeholder={tr("What should the reviewer know?", "وش يحتاج المراجع يعرف؟")} className="dashboard-field w-full resize-none px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setSubmitFor(null)} className="btn-secondary min-h-11 px-4 py-2 text-sm">{tr("Cancel", "إلغاء")}</button>
              <button onClick={handleTaskSubmit} disabled={!submitArtifactUrl || submittingTaskId === submitFor.taskId} className="btn-primary inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">
                {submittingTaskId === submitFor.taskId ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {tr("Send For Review", "إرسال للمراجعة")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {registerEvent ? (
        <MadaratRegistrationModal event={registerEvent} onClose={() => setRegisterEvent(null)} />
      ) : null}
    </div>
  );
}
