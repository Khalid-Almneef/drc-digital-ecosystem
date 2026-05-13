"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Clock3,
  GraduationCap,
  Loader2,
  Megaphone,
  Mic2,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Users,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useApi } from "@/lib/hooks/useApi";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ImageUrlInput } from "@/components/dashboard/ImageUrlInput";
import { useEscape } from "@/lib/hooks/useEscape";
import { api } from "@/lib/client";

type View = "sessions" | "audience" | "tasks";
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
  visibility: "public" | "club_only";
  imageUrl: string | null;
  attendanceCount: number | null;
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
  imageUrl: "",
  registrationOpen: false,
  isPublished: false,
  visibility: "public" as "public" | "club_only",
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
      type="button"
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
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
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-surface-elevated/40 animate-pulse" />)}
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
  isEditing = false,
  onClose,
  onChange,
  onToggle,
  onSubmit,
}: {
  form: typeof SESSION_FORM;
  saving: boolean;
  isEditing?: boolean;
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
            <h3 className="text-lg font-semibold text-foreground">
              {isEditing
                ? tr("Edit Madarat session", "تعديل جلسة مدارات")
                : tr("Create Madarat Session", "إنشاء جلسة مدارات")}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {isEditing
                ? tr("Update the session details and save. Changes apply immediately.", "حدّث بيانات الجلسة واحفظ. يتم تطبيق التغييرات فورًا.")
                : tr("Use Madarat for standard interviews and Madariya for gender-specific alumni hosting sessions.", "استخدم مدارات للمقابلات العامة، ومدارية لجلسات استضافة الخريجين المخصصة حسب الجنس.")}
            </p>
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
          <div>
            <label className={labelCls}>{tr("Who Can Register?", "من يمكنه التسجيل؟")}</label>
            <select
              value={form.visibility}
              onChange={(event) => onChange({ visibility: event.target.value as "public" | "club_only" })}
              className={selectCls}
            >
              <option value="public">{tr("Anyone (public)", "أي شخص (عام)")}</option>
              <option value="club_only">{tr("Club members only", "أعضاء النادي فقط")}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{tr("Cover Image", "صورة الغلاف")}</label>
            <ImageUrlInput
              value={form.imageUrl}
              onChange={(value) => onChange({ imageUrl: value })}
              placeholder={tr("Upload, paste a URL, or pick from the library", "ارفع صورة أو ضع رابطًا أو اختر من المكتبة")}
              uploadLabel="madarat-session"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{tr("Description", "الوصف")}</label>
            <textarea value={form.description} onChange={(event) => onChange({ description: event.target.value })} rows={3} className={`${inputCls} resize-none`} placeholder={tr("What is this session about?", "عن أي شيء هذه الجلسة؟")} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <label className="inline-flex items-center gap-2.5 text-sm text-foreground">
            <Toggle checked={form.isPublished} onChange={() => onToggle("isPublished")} />
            {tr("Publish session", "نشر الجلسة")}
          </label>
          <label className="inline-flex items-center gap-2.5 text-sm text-foreground">
            <Toggle checked={form.registrationOpen} onChange={() => onToggle("registrationOpen")} />
            {tr("Open registration", "تسجيل مفتوح")}
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onSubmit} disabled={saving} className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={11} className="animate-spin" /> : isEditing ? <Pencil size={11} /> : <Plus size={11} />}
            {isEditing ? tr("Save changes", "حفظ التغييرات") : tr("Create Session", "إنشاء الجلسة")}
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
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [logPastOpen, setLogPastOpen] = useState(false);
  useEscape(logPastOpen, () => setLogPastOpen(false));
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
      const payload = {
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
        visibility: sessionForm.visibility,
        imageUrl: sessionForm.imageUrl || undefined,
      };
      if (editingSessionId != null) {
        await api.patch(`/api/madarat/sessions/${editingSessionId}`, payload);
        toast.success(tr("Session updated", "تم تحديث الجلسة"));
      } else {
        await api.post("/api/madarat/sessions", payload);
        toast.success(tr("Session created", "تم إنشاء الجلسة"));
      }
      setSessionForm(SESSION_FORM);
      setEditingSessionId(null);
      setCreateSessionOpen(false);
      loadSessions();
    } catch (error) {
      const message = (error as { message?: string } | null)?.message;
      toast.error(message || tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setSessionSaving(false);
    }
  }

  function startEditingSession(session: MadaratSessionRow) {
    setEditingSessionId(session.sessionId);
    setSessionForm({
      title: session.title,
      description: session.description ?? "",
      intervieweeName: session.intervieweeName ?? "",
      interviewerName: session.interviewerName ?? "",
      intervieweeRole: session.intervieweeRole ?? "",
      programType: session.programType,
      scheduledAt: session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "",
      durationMin: session.durationMin != null ? String(session.durationMin) : "",
      location: session.location ?? "",
      maxRegistrants: session.maxRegistrants != null ? String(session.maxRegistrants) : "",
      imageUrl: session.imageUrl ?? "",
      registrationOpen: session.registrationOpen,
      isPublished: session.isPublished,
      visibility: session.visibility,
    });
    setCreateSessionOpen(true);
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

      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard icon={Mic2} label={tr("Upcoming Interviewees", "الضيوف القادمين")} value={upcomingSessions.length} />
        <StatCard icon={Users} label={tr("Audience Registrations", "تسجيلات الجمهور")} value={totalRegistrations} />
        <StatCard icon={Megaphone} label={tr("Open Support Tasks", "مهام الدعم المفتوحة")} value={openSupportTasks} tone={openSupportTasks > 0 ? "warning" : "neutral"} />
      </div>

      <div className="tab-rail mb-6 w-fit">
        {([
          { key: "sessions", label: "Sessions" },
          { key: "audience", label: "Audience" },
          { key: "tasks", label: "Support Tasks" },
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
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setLogPastOpen(true)} className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
                  <Plus size={11} />
                  {tr("Log past session", "تسجيل جلسة سابقة")}
                </button>
                <button onClick={() => setCreateSessionOpen(true)} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
                  <Plus size={11} />
                  {tr("Create Session", "إنشاء جلسة")}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              {tr(
                "Use “Log past session” to record a session that already happened — title and program type are enough; everything else (interviewee, date, cover image, attendance) is optional.",
                "استخدم “تسجيل جلسة سابقة” لتوثيق جلسة انتهت — العنوان ونوع البرنامج كافيان؛ كل الباقي (الضيف، التاريخ، صورة الغلاف، الحضور) اختياري.",
              )}
            </p>
          </div>

          {sessionsLoading ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {[0, 1].map((i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {[
                { key: "upcoming", label: tr("Upcoming Interviewees", "الضيوف القادمون"), empty: tr("No upcoming Madarat sessions.", "لا توجد جلسات قادمة."), rows: upcomingSessions },
                { key: "previous", label: tr("Previous Interviewees", "الضيوف السابقون"), empty: tr("No previous Madarat sessions.", "لا توجد جلسات سابقة."), rows: pastSessions },
              ].map((group) => (
                <div key={group.key} className="glass-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                    <span className="badge bg-surface-elevated text-muted border-border">{group.rows.length}</span>
                  </div>
                  {group.rows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">{group.empty}</p>
                  ) : (
                    <div className="space-y-3 max-h-[calc(100dvh-22rem)] overflow-y-auto pr-1">
                      {group.rows.map((session) => (
                        <div key={session.sessionId} className="rounded-xl border border-border bg-surface-elevated/30 p-4">
                          <div className="flex items-start gap-3">
                            {session.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={session.imageUrl} alt={session.title} loading="lazy" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover" />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="min-w-0 truncate text-sm font-semibold text-foreground">{session.title}</p>
                                <span className={
                                  session.programType === "madarat"
                                    ? "badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                                    : "badge bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20"
                                }>
                                  {session.programType === "madarat"
                                    ? tr("Madarat", "مدارات")
                                    : session.programType === "madariya_males"
                                      ? tr("Madariya (Males)", "مدارية (رجال)")
                                      : tr("Madariya (Females)", "مدارية (نساء)")}
                                </span>
                                <span className={session.isPublished ? "badge badge-success" : "badge"}>
                                  {session.isPublished ? tr("Published", "منشور") : tr("Draft", "مسودة")}
                                </span>
                                {typeof session.attendanceCount === "number" ? (
                                  <span className="badge bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                                    {session.attendanceCount} {tr("attended", "حضروا")}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-muted sm:grid-cols-2">
                            {session.intervieweeName ? <div className="flex gap-2"><dt className="shrink-0 text-muted/70">{tr("Guest", "الضيف")}:</dt><dd className="text-foreground">{session.intervieweeName}</dd></div> : null}
                            {session.interviewerName ? <div className="flex gap-2"><dt className="shrink-0 text-muted/70">{tr("Interviewer", "المُحاوِر")}:</dt><dd className="text-foreground">{session.interviewerName}</dd></div> : null}
                            {session.intervieweeRole ? <div className="flex gap-2 sm:col-span-2"><dt className="shrink-0 text-muted/70">{tr("Role", "الدور")}:</dt><dd>{session.intervieweeRole}</dd></div> : null}
                            <div className="flex gap-2"><dt className="shrink-0 text-muted/70">{tr("When", "الموعد")}:</dt><dd>{fmtDateTime(session.scheduledAt)}</dd></div>
                            {session.location ? <div className="flex gap-2"><dt className="shrink-0 text-muted/70">{tr("Where", "المكان")}:</dt><dd>{session.location}</dd></div> : null}
                          </dl>
                          {session.description ? <p className="mt-3 text-sm leading-6 text-muted">{session.description}</p> : null}

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                            <button onClick={() => setViewRegsFor(session)} className="text-xs font-medium text-primary hover:underline">
                              {session.registrationCount}{session.maxRegistrants ? `/${session.maxRegistrants}` : ""} {tr("registered", "مسجّل")}
                            </button>
                            <div className="flex flex-wrap items-center gap-4">
                              <label className="inline-flex items-center gap-2 text-[11px] text-muted">
                                {tr("Registration", "التسجيل")}
                                <Toggle
                                  checked={session.registrationOpen}
                                  onChange={() => patchSession(session.sessionId, { registrationOpen: !session.registrationOpen })}
                                  disabled={updatingSessionId === session.sessionId}
                                />
                              </label>
                              <label className="inline-flex items-center gap-2 text-[11px] text-muted">
                                {tr("Publish", "النشر")}
                                <Toggle
                                  checked={session.isPublished}
                                  onChange={() => patchSession(session.sessionId, { isPublished: !session.isPublished })}
                                  disabled={updatingSessionId === session.sessionId}
                                />
                              </label>
                              <button
                                onClick={() => startEditingSession(session)}
                                disabled={updatingSessionId === session.sessionId}
                                aria-label={tr("Edit session", "تعديل الجلسة")}
                                className="rounded-lg p-1.5 text-muted hover:bg-surface-elevated hover:text-foreground"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => deleteSession(session.sessionId)}
                                disabled={updatingSessionId === session.sessionId}
                                aria-label={tr("Delete session", "حذف الجلسة")}
                                className="rounded-lg p-1.5 text-muted hover:bg-red-500/10 hover:text-red-300"
                              >
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard icon={Users} label="Total Registered Audience" value={totalRegistrations} />
            <StatCard icon={Radio} label="Published Sessions" value={sessions.filter((session) => session.isPublished).length} />
            <StatCard icon={Clock3} label="Avg. Registration / Session" value={sessions.length ? (totalRegistrations / sessions.length).toFixed(1) : "0.0"} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard icon={Users} label="Male Audience" value={audienceMaleCount} />
            <StatCard icon={Users} label="Female Audience" value={audienceFemaleCount} />
            <StatCard icon={Users} label="Unspecified Audience" value={audienceUnspecifiedCount} />
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
              <div className="mt-4 space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-surface-elevated/40 animate-pulse" />)}
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

      <AnimatePresence>
        {viewRegsFor && <RegistrationsModal session={viewRegsFor} onClose={() => setViewRegsFor(null)} />}
        {createSessionOpen && (
          <CreateSessionModal
            form={sessionForm}
            saving={sessionSaving}
            isEditing={editingSessionId != null}
            onClose={() => { setCreateSessionOpen(false); setEditingSessionId(null); setSessionForm(SESSION_FORM); }}
            onChange={(patch) => setSessionForm((current) => ({ ...current, ...patch }))}
            onToggle={(key) => setSessionForm((current) => ({ ...current, [key]: !current[key] }))}
            onSubmit={createSession}
          />
        )}
        {logPastOpen && (
          <LogPastSessionModal
            onClose={() => setLogPastOpen(false)}
            onCreated={() => { setLogPastOpen(false); void loadSessions(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LogPastSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [form, setForm] = useState({
    title: "",
    programType: "madarat" as ProgramType,
    intervieweeName: "",
    interviewerName: "",
    intervieweeRole: "",
    scheduledAt: "",
    location: "",
    description: "",
    attendanceCount: "",
    imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!form.title.trim()) {
      setMessage(tr("Title is required.", "العنوان مطلوب."));
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/api/madarat/sessions", {
        title: form.title.trim(),
        programType: form.programType,
        intervieweeName: form.intervieweeName.trim() || undefined,
        interviewerName: form.interviewerName.trim() || undefined,
        intervieweeRole: form.intervieweeRole.trim() || undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        attendanceCount: form.attendanceCount.trim() === "" ? undefined : Number(form.attendanceCount),
        imageUrl: form.imageUrl.trim() || undefined,
        isPublished: true,
        visibility: "public" as const,
      });
      onCreated();
    } catch (error) {
      const errorMsg = (error as { message?: string } | null)?.message;
      setMessage(errorMsg || tr("Could not log session. Please try again.", "تعذّر تسجيل الجلسة. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  }

  const fieldCls = "w-full rounded-lg border border-border bg-surface-elevated/40 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary/40";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        onClick={(event) => event.stopPropagation()}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-xl sm:rounded-2xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">{tr("Log past Madarat session", "تسجيل جلسة مدارات سابقة")}</h3>
          <p className="mt-1 text-xs text-muted">
            {tr(
              "For a session that already happened. Title + program type are the only required fields — fill in whatever else you remember.",
              "للجلسات التي تمّت. الحقل المطلوب الوحيد هو العنوان ونوع البرنامج — املأ ما تتذكره من الباقي.",
            )}
          </p>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <label className="text-xs text-muted sm:col-span-2">
            <span className="block">{tr("Session title", "عنوان الجلسة")} <span className="text-primary">*</span></span>
            <input className={fieldCls} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={tr("e.g. Career conversation with …", "مثال: حوار مهني مع …")} />
          </label>
          <label className="text-xs text-muted">
            <span className="block">{tr("Program type", "نوع البرنامج")} <span className="text-primary">*</span></span>
            <select className={fieldCls} value={form.programType} onChange={(event) => setForm({ ...form, programType: event.target.value as ProgramType })}>
              <option value="madarat">{tr("Madarat", "مدارات")}</option>
              <option value="madariya_males">{tr("Madariya (Males)", "مدارية (رجال)")}</option>
              <option value="madariya_females">{tr("Madariya (Females)", "مدارية (نساء)")}</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            <span className="block">{tr("Date & time (optional)", "التاريخ والوقت (اختياري)")}</span>
            <input type="datetime-local" className={fieldCls} value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
          </label>
          <label className="text-xs text-muted">
            <span className="block">{tr("Interviewee (optional)", "الضيف (اختياري)")}</span>
            <input className={fieldCls} value={form.intervieweeName} onChange={(event) => setForm({ ...form, intervieweeName: event.target.value })} placeholder={tr("Guest name", "اسم الضيف")} />
          </label>
          <label className="text-xs text-muted">
            <span className="block">{tr("Interviewer (optional)", "المُحاوِر (اختياري)")}</span>
            <input className={fieldCls} value={form.interviewerName} onChange={(event) => setForm({ ...form, interviewerName: event.target.value })} placeholder={tr("Host or interviewer", "اسم المُقدِّم")} />
          </label>
          <label className="text-xs text-muted">
            <span className="block">{tr("Interviewee role (optional)", "دور الضيف (اختياري)")}</span>
            <input className={fieldCls} value={form.intervieweeRole} onChange={(event) => setForm({ ...form, intervieweeRole: event.target.value })} placeholder={tr("Role / company / alumni context", "المنصب / الشركة / خلفية الخريج")} />
          </label>
          <label className="text-xs text-muted">
            <span className="block">{tr("Location (optional)", "المكان (اختياري)")}</span>
            <input className={fieldCls} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder={tr("Hall or room", "القاعة أو الغرفة")} />
          </label>
          <label className="text-xs text-muted">
            <span className="block">{tr("Audience attended (optional)", "عدد الحضور (اختياري)")}</span>
            <input
              type="number"
              min="0"
              className={fieldCls}
              value={form.attendanceCount}
              onChange={(event) => setForm({ ...form, attendanceCount: event.target.value })}
              placeholder={tr("How many attended?", "كم عدد الحاضرين؟")}
            />
          </label>
          <div className="text-xs text-muted sm:col-span-2">
            <span className="block">{tr("Cover image (PNG / JPG, optional)", "صورة الغلاف (PNG / JPG، اختياري)")}</span>
            <div className="mt-1">
              <ImageUrlInput
                value={form.imageUrl}
                onChange={(value) => setForm({ ...form, imageUrl: value })}
                placeholder={tr("Upload, paste a URL, or pick from the library", "ارفع صورة أو ضع رابطًا أو اختر من المكتبة")}
                uploadLabel="madarat-past-session"
              />
            </div>
          </div>
          <label className="text-xs text-muted sm:col-span-2">
            <span className="block">{tr("Description (optional)", "الوصف (اختياري)")}</span>
            <textarea rows={3} className={`${fieldCls} resize-none`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={tr("Short summary or context", "ملخص أو سياق قصير")} />
          </label>
        </div>
        {message && (
          <div className="mx-5 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{message}</div>
        )}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="btn-secondary inline-flex items-center px-4 py-2 text-xs">{tr("Cancel", "إلغاء")}</button>
          <button type="button" onClick={submit} disabled={saving} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-50">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {tr("Log session", "تسجيل الجلسة")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
