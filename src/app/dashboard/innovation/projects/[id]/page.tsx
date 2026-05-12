"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Edit2, Users, Plus, Trash2, Check, Loader2, X,
  CheckCircle2, Circle, Calendar, DollarSign, Clock, ExternalLink,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ImageUrlInput } from "@/components/dashboard/ImageUrlInput";
import { MemberLink } from "@/components/dashboard/MemberLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import { toExternalUrl } from "@/lib/url";
import { useApi } from "@/lib/hooks/useApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "planning" | "in_progress" | "testing" | "completed" | "archived";

interface ProjectMember {
  memberId: number;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
}

interface Project {
  projectId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  githubUrl: string | null;
  category: string | null;
  status: ProjectStatus;
  isFeatured: boolean;
  departmentSlug: string | null;
  creditHours: number;
  cost: number | null;
  techStack: string[] | null;
  startDate: string | null;
  targetEndDate: string | null;
  completedDate: string | null;
  members: ProjectMember[];
}

interface Deliverable {
  deliverableId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  orderIndex: number;
}

interface Task {
  taskId: number;
  title: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  assigneeName: string | null;
}

interface AllMember {
  memberId: number;
  fullName: string;
  departmentName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge: Record<ProjectStatus, { label: string; cls: string }> = {
  planning:    { label: "Planning",    cls: "bg-blue-400/10 text-blue-400" },
  in_progress: { label: "In Progress", cls: "bg-yellow-400/10 text-yellow-400" },
  testing:     { label: "Testing",     cls: "bg-primary/10 text-primary" },
  completed:   { label: "Completed",   cls: "bg-green-400/10 text-green-400" },
  archived:    { label: "Archived",    cls: "bg-surface-elevated text-muted" },
};

const priorityCls: Record<Task["priority"], string> = {
  low:    "bg-green-400/10 text-green-400",
  medium: "bg-yellow-400/10 text-yellow-400",
  high:   "bg-orange-400/10 text-orange-400",
  urgent: "bg-red-400/10 text-red-400",
};

const taskStatusCls: Record<Task["status"], string> = {
  todo:        "badge bg-surface-elevated text-muted",
  in_progress: "badge badge-warning",
  review:      "badge badge-info",
  done:        "badge badge-success",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 transition-all";
const labelCls = "block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5";

// ─── Edit Project Modal ───────────────────────────────────────────────────────

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: (updated: Partial<Project>) => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [f, setF] = useState({
    title: project.title,
    description: project.description ?? "",
    category: project.category ?? "",
    status: project.status,
    imageUrl: project.imageUrl ?? "",
    githubUrl: project.githubUrl ?? "",
    techStack: (project.techStack ?? []).join(", "),
    creditHours: String(project.creditHours ?? 0),
    cost: project.cost != null ? String(project.cost) : "",
    startDate: project.startDate?.slice(0, 10) ?? "",
    targetEndDate: project.targetEndDate?.slice(0, 10) ?? "",
    completedDate: project.completedDate?.slice(0, 10) ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: f.title,
        description: f.description || undefined,
        category: f.category || undefined,
        status: f.status as ProjectStatus,
        imageUrl: f.imageUrl || undefined,
        githubUrl: f.githubUrl || undefined,
        techStack: f.techStack ? f.techStack.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        creditHours: f.creditHours ? Number(f.creditHours) : undefined,
        cost: f.cost ? Number(f.cost) : null,
        startDate: f.startDate || undefined,
        targetEndDate: f.targetEndDate || undefined,
        completedDate: f.completedDate || undefined,
      };
      await api.patch(`/api/projects/${project.projectId}`, payload);
      onSaved(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-lg glass-card p-8 relative max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground">
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-foreground mb-6">{tr("Edit Project", "تعديل المشروع")}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>{tr("Title *", "العنوان *")}</label>
            <input required value={f.title} onChange={set("title")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{tr("Description", "الوصف")}</label>
            <textarea value={f.description} onChange={set("description")} rows={3} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{tr("Category", "التصنيف")}</label>
              <input value={f.category} onChange={set("category")} placeholder={tr("e.g. Robotics, AI", "مثل: روبوتات، ذكاء اصطناعي")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Status", "الحالة")}</label>
              <select value={f.status} onChange={set("status")} className={inputCls}>
                {(["planning","in_progress","testing","completed","archived"] as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>{statusBadge[s].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{tr("Credit Hours", "الساعات المعتمدة")}</label>
              <input type="number" min="0" step="0.5" value={f.creditHours} onChange={set("creditHours")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Budget (SAR)", "الميزانية (ر.س)")}</label>
              <input type="number" min="0" step="0.01" value={f.cost} onChange={set("cost")} placeholder={tr("optional", "اختياري")} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{tr("Tech Stack (comma-separated)", "التقنيات المستخدمة (مفصولة بفاصلة)")}</label>
            <input value={f.techStack} onChange={set("techStack")} placeholder={tr("e.g. ROS2, Python, OpenCV", "مثل: ROS2، Python، OpenCV")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{tr("Image URL", "رابط الصورة")}</label>
            <ImageUrlInput
              value={f.imageUrl}
              onChange={(v) => setF((p) => ({ ...p, imageUrl: v }))}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className={labelCls}>{tr("GitHub URL", "رابط GitHub")}</label>
            <input value={f.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/…" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{tr("Start Date", "تاريخ البدء")}</label>
              <input type="date" value={f.startDate} onChange={set("startDate")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Target Date", "التاريخ المستهدف")}</label>
              <input type="date" value={f.targetEndDate} onChange={set("targetEndDate")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Completed Date", "تاريخ الإنجاز")}</label>
              <input type="date" value={f.completedDate} onChange={set("completedDate")} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm flex-1">{tr("Cancel", "إلغاء")}</button>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" /> {tr("Saving…", "جارٍ الحفظ…")}</> : tr("Save Changes", "حفظ التغييرات")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Assign Member Modal ──────────────────────────────────────────────────────

function AssignMemberModal({
  projectId,
  currentMemberIds,
  onClose,
  onAssigned,
}: {
  projectId: number;
  currentMemberIds: Set<number>;
  onClose: () => void;
  onAssigned: (member: ProjectMember) => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: allMembers = [] } = useApi<AllMember[]>("/api/members");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("contributor");
  const [assigning, setAssigning] = useState<number | null>(null);

  const filtered = allMembers.filter(
    (m) =>
      !currentMemberIds.has(m.memberId) &&
      (m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.departmentName.toLowerCase().includes(search.toLowerCase()))
  );

  const assign = async (m: AllMember) => {
    setAssigning(m.memberId);
    try {
      await api.post(`/api/projects/${projectId}/members`, { memberId: m.memberId, role });
      onAssigned({ memberId: m.memberId, fullName: m.fullName, role });
    } finally {
      setAssigning(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-md glass-card p-6 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground"><X size={18} /></button>
        <h2 className="text-base font-bold text-foreground mb-4">{tr("Assign Member", "تعيين عضو")}</h2>

        <div className="mb-3">
          <label className={labelCls}>{tr("Role", "الدور")}</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            <option value="lead">{tr("Lead", "قائد")}</option>
            <option value="contributor">{tr("Contributor", "مساهم")}</option>
            <option value="reviewer">{tr("Reviewer", "مراجع")}</option>
          </select>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr("Search members…", "ابحث عن عضو…")}
          className={`${inputCls} mb-3`}
        />

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted text-center py-4">{tr("No members found.", "لم يتم العثور على أعضاء.")}</p>
          )}
          {filtered.map((m) => (
            <button
              key={m.memberId}
              onClick={() => assign(m)}
              disabled={assigning === m.memberId}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors text-start"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{m.fullName}</p>
                <p className="text-[11px] text-muted">{m.departmentName}</p>
              </div>
              {assigning === m.memberId
                ? <Loader2 size={14} className="animate-spin text-muted" />
                : <Plus size={14} className="text-muted" />
              }
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

function NewTaskModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [f, setF] = useState({ title: "", priority: "medium", assignedTo: "", dueDate: "", creditHours: "" });
  const [saving, setSaving] = useState(false);
  const { data: allMembers = [] } = useApi<AllMember[]>("/api/members");

  const set = (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/projects/${projectId}/tasks`, {
        title: f.title,
        priority: f.priority,
        assignedTo: f.assignedTo ? Number(f.assignedTo) : undefined,
        dueDate: f.dueDate || undefined,
        creditHours: f.creditHours ? Number(f.creditHours) : undefined,
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-md glass-card p-6 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground"><X size={18} /></button>
        <h2 className="text-base font-bold text-foreground mb-4">{tr("New Task", "مهمة جديدة")}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>{tr("Title *", "العنوان *")}</label>
            <input required value={f.title} onChange={set("title")} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{tr("Priority", "الأولوية")}</label>
              <select value={f.priority} onChange={set("priority")} className={inputCls}>
                <option value="low">{tr("Low", "منخفضة")}</option>
                <option value="medium">{tr("Medium", "متوسطة")}</option>
                <option value="high">{tr("High", "مرتفعة")}</option>
                <option value="urgent">{tr("Urgent", "عاجلة")}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{tr("Credit Hours", "الساعات المعتمدة")}</label>
              <input type="number" min="0" step="0.5" value={f.creditHours} onChange={set("creditHours")} placeholder="0" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{tr("Assign To", "تعيين إلى")}</label>
              <select value={f.assignedTo} onChange={set("assignedTo")} className={inputCls}>
                <option value="">{tr("Club-wide / unassigned", "للنادي / غير مخصص")}</option>
                {allMembers.map((m) => (
                  <option key={m.memberId} value={m.memberId}>{m.fullName} · {m.departmentName}</option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-muted">{tr("Any club member can be assigned, not only current project members.", "يمكن تعيين أي عضو في النادي، ليس فقط أعضاء المشروع الحاليين.")}</p>
            </div>
            <div>
              <label className={labelCls}>{tr("Due Date", "تاريخ الاستحقاق")}</label>
              <input type="date" value={f.dueDate} onChange={set("dueDate")} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm flex-1">{tr("Cancel", "إلغاء")}</button>
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null} {tr("Create", "إنشاء")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectTrackPage() {
  const params = useParams();
  const router = useRouter();
  const { canAccessDept, isClubLeader } = useAuth();
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const projectId = Number(params.id);

  const allowed = canAccessDept("innovation") || isClubLeader;
  const projectKey = allowed && projectId ? `/api/projects/${projectId}` : null;
  const deliverablesKey = allowed && projectId ? `/api/projects/${projectId}/deliverables` : null;
  const tasksKey = allowed && projectId ? `/api/projects/${projectId}/tasks` : null;
  const { data: project = null, isLoading: projectLoading, mutate: loadProject } = useApi<Project>(projectKey);
  const { data: deliverables = [], isLoading: deliverablesLoading, mutate: loadDeliverables } = useApi<Deliverable[]>(deliverablesKey);
  const { data: tasks = [], isLoading: tasksLoading, mutate: loadTasks } = useApi<Task[]>(tasksKey);
  const loading = projectLoading || deliverablesLoading || tasksLoading;

  const [activeTab, setActiveTab] = useState<"deliverables" | "tasks" | "overview">("deliverables");
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  // Deliverable add form
  const [addTitle, setAddTitle] = useState("");
  const [addDue, setAddDue] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);

  // Per-deliverable toggle tracking
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    if (!allowed) router.push("/dashboard");
  }, [allowed, router]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function toggleDeliverable(d: Deliverable) {
    setTogglingId(d.deliverableId);
    const next = !d.completed;
    void loadDeliverables(
      (prev = []) => prev.map((x) => x.deliverableId === d.deliverableId ? { ...x, completed: next } : x),
      false,
    );
    try {
      await api.patch(`/api/deliverables/${d.deliverableId}`, { completed: next });
      void loadDeliverables();
    } catch {
      void loadDeliverables();
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteDeliverable(id: number) {
    if (!confirm(tr("Delete this deliverable?", "حذف هذا المخرَج؟"))) return;
    await api.delete(`/api/deliverables/${id}`).catch(() => {});
    void loadDeliverables();
  }

  async function addDeliverable() {
    if (!addTitle.trim()) return;
    setAddingSaving(true);
    try {
      const res = await api.post<{ deliverableId: number }>(`/api/projects/${projectId}/deliverables`, {
        title: addTitle.trim(),
        dueDate: addDue || undefined,
      });
      if (res) {
        void loadDeliverables();
        setAddTitle("");
        setAddDue("");
      }
    } finally {
      setAddingSaving(false);
    }
  }

  async function removeMember(memberId: number) {
    if (!confirm(tr("Remove this member from the project?", "إزالة هذا العضو من المشروع؟"))) return;
    await api.delete(`/api/projects/${projectId}/members`, { memberId }).catch(() => {});
    void loadProject();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-32 text-muted">
        <p>Project not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary text-sm hover:underline">← Back</button>
      </div>
    );
  }

  const completedDeliverables = deliverables.filter((d) => d.completed).length;
  const totalDeliverables = deliverables.length;
  const progressPct = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const memberIds = new Set(project.members.map((m) => m.memberId));
  const badge = statusBadge[project.status];

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={13} /> Back to Projects
        </button>
        <DashboardHeader
          title={project.title}
          description={[project.category, project.departmentSlug].filter(Boolean).join(" · ") || "Innovation Project"}
        />
      </div>

      {/* Status + meta row */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
        {project.creditHours > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Clock size={11} /> {project.creditHours}h credit pool
          </span>
        )}
        {project.cost != null && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <DollarSign size={11} /> SAR {project.cost.toLocaleString()}
          </span>
        )}
        {project.githubUrl && (
          <a href={toExternalUrl(project.githubUrl)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors">
            GitHub <ExternalLink size={11} />
          </a>
        )}
        <button
          onClick={() => setEditOpen(true)}
          className="ml-auto btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
        >
          <Edit2 size={12} /> Edit
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Members panel ── */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Users size={13} /> Team Members
              </h3>
              <button
                onClick={() => setAssignOpen(true)}
                className="btn-primary px-2.5 py-1 text-xs flex items-center gap-1"
              >
                <Plus size={11} /> Assign
              </button>
            </div>

            {project.members.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No members assigned.</p>
            ) : (
              <div className="space-y-2">
                {project.members.map((m) => (
                  <div key={m.memberId} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-medium text-muted shrink-0">
                      {initials(m.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        <MemberLink memberId={m.memberId} name={m.fullName} />
                      </p>
                      <p className="text-[10px] text-muted capitalize">{m.role}</p>
                    </div>
                    <button
                      onClick={() => removeMember(m.memberId)}
                      className="text-muted hover:text-red-400 transition-colors p-1 shrink-0"
                      title="Remove from project"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: tabs ── */}
        <div className="lg:col-span-2">
          {/* Tab bar */}
          <div className="tab-rail mb-5 w-fit">
            {(["deliverables", "tasks", "overview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                data-active={activeTab === tab}
                className="tab-pill capitalize"
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Deliverables tab ── */}
          {activeTab === "deliverables" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Progress bar */}
              {totalDeliverables > 0 && (
                <div className="glass-card p-4 mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-foreground">{tr("Progress", "التقدّم")}</span>
                    <span className="text-muted">{completedDeliverables}/{totalDeliverables} · {progressPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-gradient-to-r from-primary to-primary-dim rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="glass-card p-5 space-y-3 mb-4">
                {deliverables.length === 0 && (
                  <p className="text-xs text-muted text-center py-4">{tr("No deliverables yet. Add one below.", "لا توجد مخرجات بعد. أضف واحدة أدناه.")}</p>
                )}
                {deliverables.map((d) => (
                  <div key={d.deliverableId} className="flex items-start gap-3 group">
                    <button
                      onClick={() => toggleDeliverable(d)}
                      disabled={togglingId === d.deliverableId}
                      className="mt-0.5 shrink-0 text-muted hover:text-primary transition-colors disabled:opacity-40"
                    >
                      {togglingId === d.deliverableId
                        ? <Loader2 size={16} className="animate-spin" />
                        : d.completed
                          ? <CheckCircle2 size={16} className="text-green-400" />
                          : <Circle size={16} />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${d.completed ? "line-through text-muted" : "text-foreground"}`}>
                        {d.title}
                      </p>
                      {d.dueDate && (
                        <p className="text-[10px] text-muted mt-0.5 flex items-center gap-1">
                          <Calendar size={9} /> {new Date(d.dueDate).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteDeliverable(d.deliverableId)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all p-1 shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add deliverable */}
              <div className="glass-card p-4 flex gap-3 items-end">
                <div className="flex-1">
                  <label className={labelCls}>{tr("Add Deliverable", "إضافة مخرَج")}</label>
                  <input
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addDeliverable(); }}
                    placeholder={tr("Deliverable title…", "عنوان المخرَج…")}
                    className={inputCls}
                  />
                </div>
                <div className="w-36">
                  <label className={labelCls}>{tr("Due Date", "تاريخ الاستحقاق")}</label>
                  <input
                    type="date"
                    value={addDue}
                    onChange={(e) => setAddDue(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={addDeliverable}
                  disabled={addingSaving || !addTitle.trim()}
                  className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {addingSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {tr("Add", "إضافة")}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Tasks tab ── */}
          {activeTab === "tasks" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted">{completedTasks}/{tasks.length} {tr("tasks completed", "مهام منجزة")}</p>
                <button onClick={() => setNewTaskOpen(true)} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <Plus size={12} /> {tr("New Task", "مهمة جديدة")}
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="glass-card p-10 text-center text-sm text-muted">{tr("No tasks yet.", "لا توجد مهام بعد.")}</div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Title", "العنوان")}</th>
                        <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Assignee", "المسؤول")}</th>
                        <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Priority", "الأولوية")}</th>
                        <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Status", "الحالة")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t) => (
                        <tr key={t.taskId} className="border-b border-border/50 hover:bg-surface-elevated/50 transition-colors">
                          <td className="px-5 py-3 text-sm text-foreground">{t.title}</td>
                          <td className="px-5 py-3 text-xs text-muted">{t.assigneeName ?? "—"}</td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${priorityCls[t.priority]}`}>{t.priority}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={taskStatusCls[t.status]}>{t.status.replace("_", " ")}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Overview tab ── */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Deliverables",  value: `${completedDeliverables} / ${totalDeliverables}` },
                  { label: "Tasks",         value: `${completedTasks} / ${tasks.length}` },
                  { label: "Credit Hours",  value: project.creditHours > 0 ? `${project.creditHours}h` : "—" },
                  { label: "Budget (SAR)",  value: project.cost != null ? project.cost.toLocaleString() : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-elevated rounded-lg p-4 border border-border">
                    <p className="text-xs text-muted mb-1">{label}</p>
                    <p className="text-lg font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  { label: "Start Date",     value: project.startDate?.slice(0, 10) },
                  { label: "Target Date",    value: project.targetEndDate?.slice(0, 10) },
                  { label: "Completed Date", value: project.completedDate?.slice(0, 10) },
                  { label: "Tech Stack",     value: project.techStack?.join(", ") },
                ].filter(({ value }) => value).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted">{label}</span>
                    <span className="text-xs font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {editOpen && (
          <EditProjectModal
            project={project}
            onClose={() => setEditOpen(false)}
            onSaved={() => { void loadProject(); }}
          />
        )}
        {assignOpen && (
          <AssignMemberModal
            projectId={projectId}
            currentMemberIds={memberIds}
            onClose={() => setAssignOpen(false)}
            onAssigned={() => {
              void loadProject();
              setAssignOpen(false);
            }}
          />
        )}
        {newTaskOpen && (
          <NewTaskModal
            projectId={projectId}
            onClose={() => setNewTaskOpen(false)}
            onCreated={loadTasks}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
