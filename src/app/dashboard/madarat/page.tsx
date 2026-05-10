"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock3,
  GraduationCap,
  Loader2,
  Megaphone,
  Mic2,
  Plus,
  Radio,
  Trash2,
  Users,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useApi } from "@/lib/hooks/useApi";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DepartmentOperationsPanel } from "@/components/dashboard/DepartmentOperationsPanel";
import { ImportExportToolbar } from "@/components/dashboard/ImportExportToolbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChangeRequestInbox } from "@/components/dashboard/ChangeRequestInbox";
import { api } from "@/lib/client";
import { parseBoolean, toCsv } from "@/lib/csv";

type View = "sessions" | "audience" | "tasks" | "operations" | "changeRequests";
type ProgramType = "madarat" | "madariya_males" | "madariya_females";
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface MadaratSessionRow {
  sessionId: number;
  title: string;
  description: string | null;
  intervieweeName: string;
  interviewerName: string | null;
  intervieweeRole: string | null;
  programType: ProgramType;
  scheduledAt: string;
  durationMin: number | null;
  location: string | null;
  maxRegistrants: number | null;
  registrationOpen: boolean;
  isPublished: boolean;
  createdAt: string;
  registrationCount: number;
  maleCount: number;
  femaleCount: number;
  unspecifiedCount: number;
}

interface MadaratRegistration {
  registrationId: number;
  sessionId: number;
  fullName: string;
  email: string;
  gender?: "male" | "female" | null;
  universityId: string | null;
  phone: string | null;
  department: string | null;
  notes: string | null;
  registeredAt: string;
}

interface MemberOption {
  memberId: number;
  fullName: string;
  departmentSlug: string;
  position: string;
  profileStatus: string;
}

interface MadaratTaskRow {
  taskId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: number | null;
  assigneeName: string | null;
  dueDate: string | null;
  submittedAt: string | null;
  creditHours: number;
  departmentId: number | null;
  departmentSlug: "hr" | "pr" | "media" | null;
  departmentName: string | null;
}

const SESSION_FORM = {
  title: "",
  description: "",
  intervieweeName: "",
  interviewerName: "",
  intervieweeRole: "",
  programType: "madarat" as ProgramType,
  scheduledAt: "",
  durationMin: "",
  location: "",
  maxRegistrants: "",
  registrationOpen: false,
  isPublished: false,
};

const TASK_FORM = {
  title: "",
  description: "",
  departmentSlug: "hr" as "hr" | "pr" | "media",
  assignedTo: "",
  dueDate: "",
  priority: "medium" as TaskPriority,
};

const DEPARTMENT_OPTIONS = [
  { slug: "hr", label: "HR" },
  { slug: "pr", label: "PR" },
  { slug: "media", label: "Media" },
] as const;

const priorityClass: Record<TaskPriority, string> = {
  low: "badge bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  medium: "badge bg-primary/10 text-primary border-primary/20",
  high: "badge bg-amber-500/10 text-amber-300 border-amber-500/20",
  urgent: "badge bg-red-500/10 text-red-300 border-red-500/20",
};

const statusClass: Record<TaskStatus, string> = {
  todo: "badge",
  in_progress: "badge badge-primary",
  review: "badge badge-warning",
  done: "badge badge-success",
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative h-5 w-9 rounded-full border transition-colors ${
        checked ? "border-primary/40 bg-primary/20" : "border-border bg-surface-elevated"
      } disabled:opacity-50`}
    >
      <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition-all ${
        checked ? "translate-x-4 bg-primary" : "bg-muted/40"
      }`} />
    </button>
  );
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RegistrationsModal({ session, onClose }: { session: MadaratSessionRow; onClose: () => void }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data, isLoading: loading } = useApi<MadaratRegistration[]>(
    `/api/madarat/sessions/${session.sessionId}/registrations`,
  );
  const rows = data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="glass-card flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden"
      >
        <div className="border-b border-border p-5">
          <p className="text-sm font-semibold text-foreground">{session.title}</p>
          <p className="mt-1 text-xs text-muted">{tr("Registrations for", "تسجيلات لـ")} {session.intervieweeName}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">{tr("No registrations yet.", "لا توجد تسجيلات بعد.")}</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">{tr("Name", "الاسم")}</th>
                  <th className="px-4 py-3">{tr("Email", "البريد")}</th>
                  <th className="px-4 py-3">{tr("Gender", "الجنس")}</th>
                  <th className="px-4 py-3">{tr("Department", "القسم")}</th>
                  <th className="px-4 py-3">{tr("Registered", "تاريخ التسجيل")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.registrationId} className={index % 2 === 0 ? "" : "bg-surface-elevated/25"}>
                    <td className="px-4 py-3 text-foreground">{row.fullName}</td>
                    <td className="px-4 py-3 text-muted">{row.email}</td>
                    <td className="px-4 py-3 text-muted">{row.gender ? row.gender.replace(/_/g, " ") : "—"}</td>
                    <td className="px-4 py-3 text-muted">{row.department ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{fmtDateTime(row.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-border p-4 text-right">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">{tr("Close", "إغلاق")}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateSessionModal({
  form,
  saving,
  onClose,
  onChange,
  onToggle,
  onSubmit,
}: {
  form: typeof SESSION_FORM;
  saving: boolean;
  onClose: () => void;
  onChange: (patch: Partial<typeof SESSION_FORM>) => void;
  onToggle: (key: "registrationOpen" | "isPublished") => void;
  onSubmit: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const inputCls = "dashboard-field";
  const selectCls = "dashboard-select";
  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="glass-card w-full max-w-3xl p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{tr("Create Madarat Session", "إنشاء جلسة مدارات")}</h3>
            <p className="mt-1 text-sm text-muted">{tr("Use Madarat for standard interviews and Madariya for gender-specific alumni hosting sessions.", "استخدم مدارات للمقابلات العامة، ومدارية لجلسات استضافة الخريجين المخصصة حسب الجنس.")}</p>
          </div>
          <button onClick={onClose} className="btn-secondary px-3 py-2 text-xs">{tr("Close", "إغلاق")}</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <label className={labelCls}>{tr("Session Title", "عنوان الجلسة")}</label>
            <input value={form.title} onChange={(event) => onChange({ title: event.target.value })} className={inputCls} placeholder={tr("Career conversation with…", "حوار مهني مع…")} />
          </div>
          <div>
            <label className={labelCls}>{tr("Program Type", "نوع البرنامج")}</label>
            <select value={form.programType} onChange={(event) => onChange({ programType: event.target.value as ProgramType })} className={selectCls}>
              <option value="madarat">{tr("Madarat", "مدارات")}</option>
              <option value="madariya_males">{tr("Madariya (Males)", "مدارية (رجال)")}</option>
              <option value="madariya_females">{tr("Madariya (Females)", "مدارية (نساء)")}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{tr("Interviewee", "الضيف")}</label>
            <input value={form.intervieweeName} onChange={(event) => onChange({ intervieweeName: event.target.value })} className={inputCls} placeholder={tr("Guest name", "اسم الضيف")} />
          </div>
          <div>
            <label className={labelCls}>{tr("Interviewer", "المُحاوِر")}</label>
            <input value={form.interviewerName} onChange={(event) => onChange({ interviewerName: event.target.value })} className={inputCls} placeholder={tr("Host or interviewer name", "اسم المُقدِّم أو المُحاوِر")} />
          </div>
          <div>
            <label className={labelCls}>{tr("Interviewee Role", "دور الضيف")}</label>
            <input value={form.intervieweeRole} onChange={(event) => onChange({ intervieweeRole: event.target.value })} className={inputCls} placeholder={tr("Role, company, or alumni context", "المنصب، الشركة، أو خلفية الخريج")} />
          </div>
          <div>
            <label className={labelCls}>{tr("Date & Time", "التاريخ والوقت")}</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={(event) => onChange({ scheduledAt: event.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{tr("Duration (minutes)", "المدة (بالدقائق)")}</label>
            <input type="number" min="1" value={form.durationMin} onChange={(event) => onChange({ durationMin: event.target.value })} className={inputCls} placeholder="60" />
          </div>
          <div>
            <label className={labelCls}>{tr("Location", "المكان")}</label>
            <input value={form.location} onChange={(event) => onChange({ location: event.target.value })} className={inputCls} placeholder={tr("Hall or room (in-person only)", "القاعة أو الغرفة (حضوري فقط)")} />
          </div>
          <div>
            <label className={labelCls}>{tr("Max Registrants", "الحد الأقصى للمسجّلين")}</label>
            <input type="number" min="1" value={form.maxRegistrants} onChange={(event) => onChange({ maxRegistrants: event.target.value })} className={inputCls} placeholder={tr("Leave empty for unlimited", "اتركه فارغاً للسعة المفتوحة")} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{tr("Description", "الوصف")}</label>
            <textarea value={form.description} onChange={(event) => onChange({ description: event.target.value })} rows={3} className={`${inputCls} resize-none`} placeholder={tr("What is this session about?", "عن أي شيء هذه الجلسة؟")} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2.5 text-sm text-foreground">
            <Toggle checked={form.isPublished} onChange={() => onToggle("isPublished")} />
            {tr("Publish session", "نشر الجلسة")}
          </label>
          <label className="flex items-center gap-2.5 text-sm text-foreground">
            <Toggle checked={form.registrationOpen} onChange={() => onToggle("registrationOpen")} />
            {tr("Open registration", "تسجيل مفتوح")}
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onSubmit} disabled={saving} className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {tr("Create Session", "إنشاء الجلسة")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MadaratDashboard() {
  const { lang } = useLang();
  const [activeView, setActiveView] = useState<View>("sessions");
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: sessionsData, isLoading: sessionsLoading, mutate: loadSessions } = useApi<MadaratSessionRow[]>("/api/madarat/sessions");
  const { data: tasksData, isLoading: tasksLoading, mutate: loadTasks } = useApi<MadaratTaskRow[]>("/api/madarat/tasks");
  const { data: membersData } = useApi<MemberOption[]>("/api/members");
  const sessions = sessionsData ?? [];
  const tasks = tasksData ?? [];
  const members = membersData ?? [];
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionForm, setSessionForm] = useState(SESSION_FORM);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);
  const [viewRegsFor, setViewRegsFor] = useState<MadaratSessionRow | null>(null);

  const [taskForm, setTaskForm] = useState(TASK_FORM);
  const [taskSaving, setTaskSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  const inputCls = "dashboard-field";
  const selectCls = "dashboard-select";
  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted";

  // Loaders are provided by useApi above (loadSessions / loadTasks are mutate handles).

  const upcomingSessions = useMemo(
    () => sessions.filter((session) => new Date(session.scheduledAt) >= new Date()).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [sessions],
  );
  const pastSessions = useMemo(
    () => sessions.filter((session) => new Date(session.scheduledAt) < new Date()).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [sessions],
  );
  const totalRegistrations = useMemo(
    () => sessions.reduce((sum, session) => sum + session.registrationCount, 0),
    [sessions],
  );
  const madariyaCount = useMemo(
    () => sessions.filter((session) => session.programType !== "madarat").length,
    [sessions],
  );
  const audienceMaleCount = useMemo(() => sessions.reduce((sum, session) => sum + (session.maleCount ?? 0), 0), [sessions]);
  const audienceFemaleCount = useMemo(() => sessions.reduce((sum, session) => sum + (session.femaleCount ?? 0), 0), [sessions]);
  const audienceUnspecifiedCount = useMemo(() => sessions.reduce((sum, session) => sum + (session.unspecifiedCount ?? 0), 0), [sessions]);
  const openSupportTasks = useMemo(
    () => tasks.filter((task) => task.status !== "done").length,
    [tasks],
  );
  const departmentCounts = useMemo(() => ({
    hr: tasks.filter((task) => task.departmentSlug === "hr").length,
    pr: tasks.filter((task) => task.departmentSlug === "pr").length,
    media: tasks.filter((task) => task.departmentSlug === "media").length,
  }), [tasks]);
  const filteredAssignees = useMemo(
    () => members.filter((member) => member.departmentSlug === taskForm.departmentSlug && member.profileStatus !== "suspended"),
    [members, taskForm.departmentSlug],
  );

  async function createSession() {
    if (!sessionForm.title || !sessionForm.intervieweeName || !sessionForm.interviewerName || !sessionForm.scheduledAt) return;
    setSessionSaving(true);
    try {
      await api.post("/api/madarat/sessions", {
        title: sessionForm.title,
        description: sessionForm.description || undefined,
        intervieweeName: sessionForm.intervieweeName,
        interviewerName: sessionForm.interviewerName,
        intervieweeRole: sessionForm.intervieweeRole || undefined,
        programType: sessionForm.programType,
        scheduledAt: new Date(sessionForm.scheduledAt).toISOString(),
        durationMin: sessionForm.durationMin ? Number(sessionForm.durationMin) : undefined,
        location: sessionForm.location || undefined,
        maxRegistrants: sessionForm.maxRegistrants ? Number(sessionForm.maxRegistrants) : undefined,
        registrationOpen: sessionForm.registrationOpen,
        isPublished: sessionForm.isPublished,
      });
      setSessionForm(SESSION_FORM);
      setCreateSessionOpen(false);
      toast.success(tr("Session created", "تم إنشاء الجلسة"));
      loadSessions();
    } catch (error) {
      const message = (error as { message?: string } | null)?.message;
      toast.error(message || tr("Create failed. Please try again.", "فشل الإنشاء. حاول مرة أخرى."));
    } finally {
      setSessionSaving(false);
    }
  }

  function getSessionsCsv() {
    return toCsv(
      ["title", "description", "intervieweeName", "interviewerName", "intervieweeRole", "programType", "scheduledAt", "durationMin", "location", "maxRegistrants", "registrationOpen", "isPublished"],
      sessions.map((session) => [
        session.title,
        session.description ?? "",
        session.intervieweeName,
        session.interviewerName ?? "",
        session.intervieweeRole ?? "",
        session.programType,
        session.scheduledAt,
        session.durationMin ?? "",
        session.location ?? "",
        session.maxRegistrants ?? "",
        session.registrationOpen,
        session.isPublished,
      ]),
    );
  }

  function getSessionsTemplateCsv() {
    return toCsv(
      ["title", "description", "intervieweeName", "interviewerName", "intervieweeRole", "programType", "scheduledAt", "durationMin", "location", "maxRegistrants", "registrationOpen", "isPublished"],
      [["Career Conversation", "Session summary", "Guest Name", "Host Name", "Alumni, Product Lead", "madarat", new Date().toISOString(), 60, "Innovation Hall", 80, true, false]],
    );
  }

  async function importSessions(rows: Record<string, string>[]) {
    for (const row of rows) {
      if (!row.title?.trim()) continue;
      await api.post("/api/madarat/sessions", {
        title: row.title.trim(),
        description: row.description?.trim() || undefined,
        intervieweeName: row.intervieweeName?.trim() || "",
        interviewerName: row.interviewerName?.trim() || "",
        intervieweeRole: row.intervieweeRole?.trim() || undefined,
        programType: (row.programType?.trim() || "madarat") as ProgramType,
        scheduledAt: row.scheduledAt?.trim() || new Date().toISOString(),
        durationMin: row.durationMin ? Number(row.durationMin) : undefined,
        location: row.location?.trim() || undefined,
        maxRegistrants: row.maxRegistrants ? Number(row.maxRegistrants) : undefined,
        registrationOpen: parseBoolean(row.registrationOpen ?? ""),
        isPublished: parseBoolean(row.isPublished ?? ""),
      });
    }
    loadSessions();
  }

  async function patchSession(sessionId: number, patch: Partial<MadaratSessionRow>) {
    setUpdatingSessionId(sessionId);
    try {
      await api.patch(`/api/madarat/sessions/${sessionId}`, patch);
      loadSessions();
    } catch {
      toast.error(tr("Update failed. Please try again.", "فشل التحديث. حاول مرة أخرى."));
    } finally {
      setUpdatingSessionId(null);
    }
  }

  async function deleteSession(sessionId: number) {
    const session = sessions.find((s) => s.sessionId === sessionId);
    const confirmMsg = lang === "ar"
      ? `هل تريد حذف جلسة "${session?.title ?? ""}"؟`
      : `Delete Madarat session "${session?.title ?? ""}"?`;
    if (!window.confirm(confirmMsg)) return;
    setUpdatingSessionId(sessionId);
    try {
      await api.delete(`/api/madarat/sessions/${sessionId}`);
      loadSessions();
      toast.success(tr("Session deleted", "تم حذف الجلسة"));
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    } finally {
      setUpdatingSessionId(null);
    }
  }

  async function createTask() {
    if (!taskForm.title) return;
    setTaskSaving(true);
    try {
      const departmentIdMap: Record<string, number> = { hr: 2, pr: 6, media: 5 };
      await api.post("/api/madarat/tasks", {
        title: taskForm.title,
        description: taskForm.description || undefined,
        departmentId: departmentIdMap[taskForm.departmentSlug],
        assignedTo: taskForm.assignedTo ? Number(taskForm.assignedTo) : undefined,
        dueDate: taskForm.dueDate || undefined,
        priority: taskForm.priority,
      });
      setTaskForm(TASK_FORM);
      toast.success(tr("Task created", "تم إنشاء المهمة"));
      loadTasks();
    } catch {
      toast.error(tr("Create failed. Please try again.", "فشل الإنشاء. حاول مرة أخرى."));
    } finally {
      setTaskSaving(false);
    }
  }

  async function updateTaskStatus(taskId: number, status: TaskStatus) {
    setUpdatingTaskId(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status });
      loadTasks();
    } catch {
      toast.error(tr("Update failed. Please try again.", "فشل التحديث. حاول مرة أخرى."));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <div>
      <DashboardHeader
        title={tr("Madarat", "مدارات")}
        description={tr("Track interviewees, audience registration for Madarat sessions, and cross-department delivery work.", "تابع الضيوف، تسجيل الجمهور لجلسات مدارات، ومهام التنفيذ بين الأقسام.")}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard icon={Mic2} label={tr("Upcoming Interviewees", "الضيوف القادمين")} value={upcomingSessions.length} />
        <StatCard icon={CalendarDays} label={tr("Previous Sessions", "الجلسات السابقة")} value={pastSessions.length} />
        <StatCard icon={Users} label={tr("Audience Registrations", "تسجيلات الجمهور")} value={totalRegistrations} color="text-cyan-300" />
        <StatCard icon={Megaphone} label={tr("Open Support Tasks", "مهام الدعم المفتوحة")} value={openSupportTasks} color="text-amber-300" />
      </div>

      <div className="tab-rail mb-6 w-fit">
        {([
          { key: "sessions", label: "Sessions" },
          { key: "audience", label: "Audience" },
          { key: "tasks", label: "Support Tasks" },
          { key: "operations", label: "Operations" },
          { key: "changeRequests", label: tr("Change Requests", "طلبات التغيير") },
        ] as { key: View; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            data-active={activeView === key}
            className="tab-pill"
          >
            {label}
          </button>
        ))}
      </div>

      {activeView === "sessions" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">
          <div className="glass-card p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <GraduationCap size={16} className="mt-0.5 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{tr("Session Control", "إدارة الجلسات")}</h3>
                  <p className="mt-1 text-xs text-muted">{tr("Create Madarat and Madariya sessions from a focused modal instead of filling the whole page inline.", "أنشئ جلسات مدارات ومدارية من نافذة مخصّصة بدلاً من ملء الصفحة بالكامل.")}</p>
                </div>
              </div>
              <button onClick={() => setCreateSessionOpen(true)} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
                <Plus size={11} />
                {tr("Create Session", "إنشاء جلسة")}
              </button>
            </div>
            <div className="mt-4">
              <ImportExportToolbar
                exportFilename="madarat-sessions.csv"
                templateFilename="madarat-sessions-template.csv"
                getExportCsv={getSessionsCsv}
                getTemplateCsv={getSessionsTemplateCsv}
                onImportRows={importSessions}
                exportLabel="Export sessions"
                templateLabel="Session template"
                importLabel="Import sessions"
              />
            </div>
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {[{ label: "Upcoming", rows: upcomingSessions }, { label: "Previous", rows: pastSessions }].map((group) => (
                <div key={group.label} className="glass-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{group.label} Interviewees</h3>
                    <span className="badge bg-surface-elevated text-muted border-border">{group.rows.length}</span>
                  </div>
                  {group.rows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">No {group.label.toLowerCase()} Madarat sessions.</p>
                  ) : (
                    <div className="space-y-3">
                      {group.rows.map((session) => (
                        <div key={session.sessionId} className="rounded-xl border border-border bg-surface-elevated/30 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{session.title}</p>
                                <span className={
                                  session.programType === "madarat"
                                    ? "badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                                    : "badge bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20"
                                }>
                                  {session.programType === "madarat"
                                    ? "Madarat"
                                    : session.programType === "madariya_males"
                                      ? "Madariya (Males)"
                                      : "Madariya (Females)"}
                                </span>
                                <span className={session.isPublished ? "badge badge-success" : "badge"}>{session.isPublished ? "Published" : "Draft"}</span>
                              </div>
                              <p className="mt-1 text-sm text-foreground">{session.intervieweeName}</p>
                              {session.interviewerName && <p className="text-xs text-muted mt-0.5">Interviewer: {session.interviewerName}</p>}
                              {session.intervieweeRole && <p className="text-xs text-muted mt-0.5">{session.intervieweeRole}</p>}
                              <p className="mt-2 text-xs text-muted">{fmtDateTime(session.scheduledAt)}{session.location ? ` · ${session.location}` : ""}</p>
                              {session.description && <p className="mt-2 text-sm text-muted">{session.description}</p>}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <button onClick={() => setViewRegsFor(session)} className="text-xs text-primary hover:underline">
                                {session.registrationCount} registrations
                              </button>
                              <label className="flex items-center gap-2 text-[11px] text-muted">
                                Reg
                                <Toggle
                                  checked={session.registrationOpen}
                                  onChange={() => patchSession(session.sessionId, { registrationOpen: !session.registrationOpen })}
                                  disabled={updatingSessionId === session.sessionId}
                                />
                              </label>
                              <label className="flex items-center gap-2 text-[11px] text-muted">
                                Pub
                                <Toggle
                                  checked={session.isPublished}
                                  onChange={() => patchSession(session.sessionId, { isPublished: !session.isPublished })}
                                  disabled={updatingSessionId === session.sessionId}
                                />
                              </label>
                              <button onClick={() => deleteSession(session.sessionId)} disabled={updatingSessionId === session.sessionId} className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-300">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeView === "audience" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Total Registered Audience" value={totalRegistrations} color="text-cyan-300" />
            <StatCard icon={Radio} label="Published Sessions" value={sessions.filter((session) => session.isPublished).length} color="text-primary" />
            <StatCard icon={Mic2} label="Madariya Sessions" value={madariyaCount} color="text-fuchsia-300" />
            <StatCard icon={Clock3} label="Avg. Registration / Session" value={sessions.length ? (totalRegistrations / sessions.length).toFixed(1) : "0.0"} color="text-emerald-300" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={Users} label="Male Audience" value={audienceMaleCount} color="text-sky-300" />
            <StatCard icon={Users} label="Female Audience" value={audienceFemaleCount} color="text-rose-300" />
            <StatCard icon={Users} label="Unspecified Audience" value={audienceUnspecifiedCount} color="text-muted" />
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground">{tr("Registration Performance", "أداء التسجيل")}</h3>
            <div className="mt-4 space-y-3">
              {[...sessions].sort((a, b) => b.registrationCount - a.registrationCount).map((session) => (
                <div key={session.sessionId} className="rounded-xl border border-border bg-surface-elevated/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{session.title}</p>
                      <p className="mt-1 text-xs text-muted">{session.intervieweeName} · {session.interviewerName ? `Interviewer: ${session.interviewerName} · ` : ""}{fmtDateTime(session.scheduledAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                        {session.registrationCount}{session.maxRegistrants ? `/${session.maxRegistrants}` : ""} registered
                      </span>
                      <span className="badge bg-surface-elevated text-muted border-border">
                        M {session.maleCount} · F {session.femaleCount}
                      </span>
                      <button onClick={() => setViewRegsFor(session)} className="text-xs text-primary hover:underline">View audience</button>
                    </div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <p className="py-8 text-center text-sm text-muted">No audience data yet.</p>}
            </div>
          </div>
        </motion.div>
      )}

      {activeView === "tasks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={Users} label="HR Tasks" value={departmentCounts.hr} color="text-green-300" />
            <StatCard icon={Megaphone} label="PR Tasks" value={departmentCounts.pr} color="text-sky-300" />
            <StatCard icon={Radio} label={tr("Media Tasks", "مهام الإعلام")} value={departmentCounts.media} color="text-purple-300" />
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground">{tr("Create Support Task", "إنشاء مهمة دعم")}</h3>
            <p className="mt-1 text-xs text-muted">{tr("Distribute work from Madarat to HR, PR, or Media and track status back here.", "وزّع العمل من مدارات إلى HR أو العلاقات العامة أو الإعلام وتابع الحالة من هنا.")}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelCls}>{tr("Task Title", "عنوان المهمة")}</label>
                <input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} className={inputCls} placeholder={tr("Prepare audience RSVP reminder", "تذكير الجمهور بالحضور")} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>{tr("Description", "الوصف")}</label>
                <textarea value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} rows={3} className={`${inputCls} resize-none`} placeholder={tr("What does this department need to deliver?", "ماذا يجب أن يسلّم هذا القسم؟")} />
              </div>
              <div>
                <label className={labelCls}>{tr("Department", "القسم")}</label>
                <select
                  value={taskForm.departmentSlug}
                  onChange={(event) => setTaskForm((current) => ({ ...current, departmentSlug: event.target.value as "hr" | "pr" | "media", assignedTo: "" }))}
                  className={selectCls}
                >
                  {DEPARTMENT_OPTIONS.map((option) => (
                    <option key={option.slug} value={option.slug}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{tr("Assignee", "المسؤول")}</label>
                <select value={taskForm.assignedTo} onChange={(event) => setTaskForm((current) => ({ ...current, assignedTo: event.target.value }))} className={selectCls}>
                  <option value="">{tr("Unassigned", "غير معيَّن")}</option>
                  {filteredAssignees.map((member) => (
                    <option key={member.memberId} value={member.memberId}>{member.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{tr("Due Date", "تاريخ الاستحقاق")}</label>
                <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{tr("Priority", "الأولوية")}</label>
                <select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))} className={selectCls}>
                  <option value="low">{tr("Low", "منخفضة")}</option>
                  <option value="medium">{tr("Medium", "متوسطة")}</option>
                  <option value="high">{tr("High", "مرتفعة")}</option>
                  <option value="urgent">{tr("Urgent", "عاجلة")}</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button onClick={createTask} disabled={taskSaving} className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5">
                {taskSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                {tr("Create Task", "إنشاء المهمة")}
              </button>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground">{tr("Distribution and Tracking", "التوزيع والتتبّع")}</h3>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-muted" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">{tr("No Madarat support tasks created yet.", "لا توجد مهام دعم مدارات بعد.")}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {tasks.map((task) => (
                  <div key={task.taskId} className="rounded-xl border border-border bg-surface-elevated/30 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <span className={priorityClass[task.priority]}>{task.priority}</span>
                          <span className={statusClass[task.status]}>{task.status.replace("_", " ")}</span>
                          {task.departmentName && <span className="badge bg-surface-elevated text-muted border-border">{task.departmentName}</span>}
                        </div>
                        {task.description && <p className="mt-2 text-sm text-muted">{task.description}</p>}
                        <p className="mt-2 text-xs text-muted">
                          {task.assigneeName ? `${tr("Assigned to", "مُسنَدة إلى")} ${task.assigneeName}` : tr("Unassigned", "غير معيَّنة")}
                          {task.dueDate ? ` · ${tr("Due", "موعد")} ${task.dueDate}` : ""}
                          {task.submittedAt ? ` · ${tr("Submitted", "أُرسلت")} ${fmtDateTime(task.submittedAt)}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(event) => updateTaskStatus(task.taskId, event.target.value as TaskStatus)}
                          disabled={updatingTaskId === task.taskId}
                          className="dashboard-select text-xs"
                        >
                          <option value="todo">{tr("To Do", "قائمة المهام")}</option>
                          <option value="in_progress">{tr("In Progress", "قيد التنفيذ")}</option>
                          <option value="review">{tr("Review", "للمراجعة")}</option>
                          <option value="done">{tr("Done", "تم")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeView === "operations" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <DepartmentOperationsPanel departmentSlug="madarat" title={tr("Madarat budget, procurement, and department requests", "ميزانية مدارات والمشتريات وطلبات القسم")} />
        </motion.div>
      )}

      {activeView === "changeRequests" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <ChangeRequestInbox />
        </motion.div>
      )}

      <AnimatePresence>
        {viewRegsFor && <RegistrationsModal session={viewRegsFor} onClose={() => setViewRegsFor(null)} />}
        {createSessionOpen && (
          <CreateSessionModal
            form={sessionForm}
            saving={sessionSaving}
            onClose={() => setCreateSessionOpen(false)}
            onChange={(patch) => setSessionForm((current) => ({ ...current, ...patch }))}
            onToggle={(key) => setSessionForm((current) => ({ ...current, [key]: !current[key] }))}
            onSubmit={createSession}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
