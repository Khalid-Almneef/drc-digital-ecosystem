"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Check, ExternalLink, Loader2, Paperclip, RotateCcw, Send, Upload, UserRoundPlus } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import { DepartmentBudgetPanel } from "@/components/dashboard/DepartmentBudgetPanel";
import { type FinanceDepartmentSlug } from "@/lib/finance";
import {
  canCreateServiceRequest,
  SERVICE_REQUEST_PRIORITY_TONE,
  SERVICE_REQUEST_STATUS_TONE,
  SERVICE_REQUEST_TYPE_LABEL,
  type ServiceRequestPriority,
  type ServiceRequestRow,
  type ServiceRequestStatus,
  type ServiceRequestTarget,
  type ServiceRequestType,
} from "@/lib/service-requests";

interface MemberOption {
  memberId: number;
  fullName: string;
  departmentSlug: string | null;
  position?: string;
}

interface TaskRow {
  taskId: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo: number | null;
  assigneeName: string | null;
  dueDate: string | null;
  artifactUrl: string | null;
  artifactNotes: string | null;
  submittedAt: string | null;
  creditHours: number;
}

const REQUEST_OPTIONS: { requestType: ServiceRequestType; targetDepartmentSlug: ServiceRequestTarget; label: string; labelAr: string; helper: string; helperAr: string }[] = [
  {
    requestType: "design",
    targetDepartmentSlug: "media",
    label: "Media design request",
    labelAr: "طلب تصميم من الإعلام",
    helper: "Send a design brief to Media with optional attached references.",
    helperAr: "أرسل موجزًا تصميميًا للإعلام مع مرفقات اختيارية.",
  },
  {
    requestType: "project_media",
    targetDepartmentSlug: "media",
    label: "Project media request",
    labelAr: "طلب تغطية إعلامية لمشروع",
    helper: "Ask Media to capture, upload, and organize project photos for archive and social use.",
    helperAr: "اطلب من الإعلام التقاط صور المشروع ورفعها وتنظيمها للأرشيف والاستخدام الاجتماعي.",
  },
  {
    requestType: "workshop",
    targetDepartmentSlug: "development",
    label: "Development workshop request",
    labelAr: "طلب ورشة من التطوير",
    helper: "Innovation can request a workshop such as 3D printing, CAD, or tooling onboarding.",
    helperAr: "يمكن للابتكار طلب ورشة مثل الطباعة ثلاثية الأبعاد أو CAD أو التدريب على الأدوات.",
  },
  {
    requestType: "company_visit",
    targetDepartmentSlug: "pr",
    label: "Company visit request",
    labelAr: "طلب زيارة شركة",
    helper: "Ask Public Relations to coordinate a visit with a potential technical partner or employer.",
    helperAr: "اطلب من العلاقات العامة تنسيق زيارة مع شريك تقني محتمل أو جهة توظيف.",
  },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TASK_STATUS_TONE: Record<TaskRow["status"], string> = {
  todo: "badge bg-surface-elevated text-muted border-border",
  in_progress: "badge badge-primary",
  review: "badge badge-warning",
  done: "badge badge-success",
};

function CommitteeTaskPanel({ departmentSlug }: { departmentSlug: FinanceDepartmentSlug }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => lang === "ar" ? ar : en;
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium" as TaskRow["priority"],
    creditHours: "0",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memberRows, taskRows] = await Promise.all([
        api.get<MemberOption[]>(`/api/members?department=${departmentSlug}`),
        api.get<TaskRow[]>(`/api/tasks?department=${departmentSlug}`),
      ]);
      setMembers((memberRows ?? []).filter((member) => member.departmentSlug === departmentSlug));
      setTasks(taskRows ?? []);
    } catch {
      setMembers([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [departmentSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const reviewTasks = useMemo(() => tasks.filter((task) => task.status === "review"), [tasks]);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);

  async function createTask() {
    if (!form.title.trim() || !form.assignedTo) return;
    setSaving(true);
    try {
      await api.post("/api/tasks", {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        departmentSlug,
        assignedTo: Number(form.assignedTo),
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        creditHours: Number(form.creditHours) || 0,
      });
      setForm({ title: "", description: "", assignedTo: "", dueDate: "", priority: "medium", creditHours: "0" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(taskId: number, status: TaskRow["status"]) {
    setReviewingId(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status });
      await load();
    } finally {
      setReviewingId(null);
    }
  }

  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted";

  return (
    <div className="glass-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <UserRoundPlus size={16} className="mt-0.5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tr("Committee Member Tasks", "مهام أعضاء اللجنة")}</h3>
            <p className="mt-1 text-xs text-muted">{tr("Assign tasks to members in this committee. Their submissions appear here for leader review.", "أسند مهام للأعضاء في هذه اللجنة. تظهر تسليماتهم هنا لمراجعة المسؤول.")}</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="badge bg-surface-elevated text-muted border-border">{members.length} {tr("members", "عضو")}</span>
          <span className="badge badge-warning">{reviewTasks.length} {tr("in review", "بانتظار المراجعة")}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-border bg-surface/25 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{tr("Assign Member Work", "إسناد عمل لعضو")}</h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelCls}>{tr("Task Title", "عنوان المهمة")}</label>
              <input className="dashboard-field" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={tr("e.g. Prepare workshop attendance report", "مثال: إعداد تقرير حضور الورشة")} />
            </div>
            <div>
              <label className={labelCls}>{tr("Member", "العضو")}</label>
              <select className="dashboard-select" value={form.assignedTo} onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}>
                <option value="">{tr("Select member", "اختر عضوًا")}</option>
                {members.map((member) => (
                  <option key={member.memberId} value={member.memberId}>{member.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{tr("Priority", "الأولوية")}</label>
              <select className="dashboard-select" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskRow["priority"] }))}>
                <option value="low">{tr("Low", "منخفضة")}</option>
                <option value="medium">{tr("Medium", "متوسطة")}</option>
                <option value="high">{tr("High", "عالية")}</option>
                <option value="urgent">{tr("Urgent", "عاجلة")}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{tr("Due Date", "تاريخ التسليم")}</label>
              <input className="dashboard-field" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>{tr("Credit Hours", "ساعات الاعتماد")}</label>
              <input className="dashboard-field" type="number" min="0" step="0.5" value={form.creditHours} onChange={(event) => setForm((current) => ({ ...current, creditHours: event.target.value }))} />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelCls}>{tr("Instructions", "التعليمات")}</label>
              <textarea className="dashboard-field min-h-24 resize-y" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder={tr("What should the member submit for review?", "ماذا يجب على العضو تسليمه للمراجعة؟")} />
            </div>
          </div>
          <button onClick={createTask} disabled={saving || !form.title.trim() || !form.assignedTo} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-xs">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {tr("Assign Task", "إسناد المهمة")}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{tr("Review Queue", "قائمة المراجعة")}</h4>
            <div className="mt-3 space-y-2">
              {loading ? (
                <div className="rounded-2xl border border-border bg-surface/25 p-6 text-center text-sm text-muted">{tr("Loading tasks...", "جاري التحميل...")}</div>
              ) : reviewTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">{tr("No member submissions are waiting for review.", "لا توجد تسليمات بانتظار المراجعة.")}</div>
              ) : reviewTasks.map((task) => (
                <div key={task.taskId} className="rounded-2xl border border-border bg-surface/35 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted">By {task.assigneeName ?? "Unassigned"}{task.submittedAt ? ` · ${formatDate(task.submittedAt)}` : ""}</p>
                      {task.artifactNotes ? <p className="mt-2 line-clamp-2 text-xs text-muted">{task.artifactNotes}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {task.artifactUrl ? (
                        <a href={task.artifactUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                          <ExternalLink size={12} /> {tr("Open", "فتح")}
                        </a>
                      ) : null}
                      <button onClick={() => updateTaskStatus(task.taskId, "in_progress")} disabled={reviewingId === task.taskId} className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                        {reviewingId === task.taskId ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                        {tr("Send Back", "إعادة")}
                      </button>
                      <button onClick={() => updateTaskStatus(task.taskId, "done")} disabled={reviewingId === task.taskId} className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                        {reviewingId === task.taskId ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        {tr("Approve", "قبول")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{tr("Active Member Tasks", "المهام النشطة للأعضاء")}</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeTasks.slice(0, 8).map((task) => (
                <div key={task.taskId} className="rounded-xl border border-border bg-surface/25 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">{task.title}</p>
                    <span className={TASK_STATUS_TONE[task.status]}>{task.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">{task.assigneeName ?? "Unassigned"}{task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ""}</p>
                </div>
              ))}
              {!loading && activeTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted sm:col-span-2">{tr("No active member tasks yet.", "لا توجد مهام نشطة للأعضاء حتى الآن.")}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentOperationsPanel({ departmentSlug, title }: { departmentSlug: FinanceDepartmentSlug; title?: string }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => lang === "ar" ? ar : en;
  const [rows, setRows] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assignees, setAssignees] = useState<MemberOption[]>([]);
  const [requestDrafts, setRequestDrafts] = useState<Record<number, { status: ServiceRequestStatus; assigneeId: string; assigneeNote: string }>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    requestType: "design" as ServiceRequestType,
    targetDepartmentSlug: "media" as ServiceRequestTarget,
    title: "",
    description: "",
    priority: "medium" as ServiceRequestPriority,
    attachmentUrls: [] as string[],
  });

  const availableOptions = useMemo(
    () => REQUEST_OPTIONS.filter((option) => canCreateServiceRequest(departmentSlug, option.requestType, option.targetDepartmentSlug)),
    [departmentSlug],
  );

  const inboxTypes = useMemo<ServiceRequestType[]>(
    () => (
      departmentSlug === "media"
        ? ["design", "project_media"]
        : departmentSlug === "development"
          ? ["workshop"]
          : departmentSlug === "pr"
            ? ["company_visit"]
            : []
    ),
    [departmentSlug],
  );

  const outboundRows = useMemo(
    () => rows.filter((row) => row.sourceDepartmentSlug === departmentSlug),
    [departmentSlug, rows],
  );

  const inboundRows = useMemo(
    () => rows.filter((row) => row.targetDepartmentSlug === departmentSlug),
    [departmentSlug, rows],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ServiceRequestRow[]>("/api/service-requests?scope=related");
      setRows(data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!inboxTypes.length) return;
    api.get<MemberOption[]>(`/api/members?department=${departmentSlug}`)
      .then((data) => setAssignees((data ?? []).filter((member) => member.departmentSlug === departmentSlug)))
      .catch(() => setAssignees([]));
  }, [departmentSlug, inboxTypes.length]);

  useEffect(() => {
    if (availableOptions.length === 0) return;
    const initial = availableOptions[0];
    setForm((current) => (
      availableOptions.some((option) => option.requestType === current.requestType && option.targetDepartmentSlug === current.targetDepartmentSlug)
        ? current
        : { ...current, requestType: initial.requestType, targetDepartmentSlug: initial.targetDepartmentSlug }
    ));
  }, [availableOptions]);

  async function uploadAttachment(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("label", `${form.requestType}-request-${file.name}`);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Upload failed");
      setForm((current) => ({ ...current, attachmentUrls: [...current.attachmentUrls, payload.data.url as string] }));
    } finally {
      setUploading(false);
    }
  }

  async function submitRequest() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/service-requests", {
        requestType: form.requestType,
        targetDepartmentSlug: form.targetDepartmentSlug,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        attachmentUrls: form.attachmentUrls,
      });
      setForm((current) => ({ ...current, title: "", description: "", priority: "medium", attachmentUrls: [] }));
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function updateRequest(requestId: number) {
    const draft = requestDrafts[requestId];
    if (!draft) return;
    setUpdatingId(requestId);
    try {
      await api.patch(`/api/service-requests/${requestId}`, {
        status: draft.status,
        assigneeId: draft.assigneeId ? Number(draft.assigneeId) : null,
        assigneeNote: draft.assigneeNote || undefined,
      });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  const inputCls = "dashboard-field";
  const selectCls = "dashboard-select";
  const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted";

  return (
    <div className="space-y-6">
      <CommitteeTaskPanel departmentSlug={departmentSlug} />

      <DepartmentBudgetPanel departmentSlug={departmentSlug} title={title ?? "Budget, procurement, and requests"} />

      {availableOptions.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-start gap-3">
            <Briefcase size={16} className="mt-0.5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">{tr("Create Department Request", "إنشاء طلب قسم")}</h3>
              <p className="mt-1 text-xs text-muted">{tr("Send cross-dashboard requests from here and track replies in one feed.", "أرسل طلبات للأقسام الأخرى وتابع الردود في مكان واحد.")}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelCls}>{tr("Request Type", "نوع الطلب")}</label>
              <select
                value={`${form.requestType}:${form.targetDepartmentSlug}`}
                onChange={(event) => {
                  const [requestType, targetDepartmentSlug] = event.target.value.split(":") as [ServiceRequestType, ServiceRequestTarget];
                  setForm((current) => ({ ...current, requestType, targetDepartmentSlug }));
                }}
                className={selectCls}
              >
                {availableOptions.map((option) => (
                  <option key={`${option.requestType}-${option.targetDepartmentSlug}`} value={`${option.requestType}:${option.targetDepartmentSlug}`}>
                    {lang === "ar" ? option.labelAr : option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted">
                {(() => { const opt = availableOptions.find((o) => o.requestType === form.requestType && o.targetDepartmentSlug === form.targetDepartmentSlug); return opt ? (lang === "ar" ? opt.helperAr : opt.helper) : null; })()}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>{tr("Title", "العنوان")}</label>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={selectCls}
                placeholder={
                  form.requestType === "workshop"
                    ? tr("e.g. 3D Printing Workshop", "مثال: ورشة الطباعة ثلاثية الأبعاد")
                    : form.requestType === "project_media"
                      ? tr("e.g. Photo coverage for autonomous drone project", "مثال: تغطية صور مشروع الدرون المستقل")
                      : form.requestType === "company_visit"
                        ? tr("e.g. Visit request for Aramco Digital robotics team", "مثال: طلب زيارة فريق الروبوتات في أرامكو الرقمية")
                        : tr("e.g. Poster design for showcase", "مثال: تصميم ملصق لعرض المعرض")
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>{tr("Description", "الوصف")}</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className={`${inputCls} resize-none`}
                placeholder={tr("Brief the target department on scope, timing, audience, and expected output.", "أبلغ القسم المستهدف بالنطاق والوقت والجمهور والمخرجات المتوقعة.")}
              />
            </div>
            <div>
              <label className={labelCls}>{tr("Priority", "الأولوية")}</label>
              <select
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as ServiceRequestPriority }))}
                className={inputCls}
              >
                <option value="low">{tr("Low", "منخفضة")}</option>
                <option value="medium">{tr("Medium", "متوسطة")}</option>
                <option value="high">{tr("High", "عالية")}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{tr("Attachments", "المرفقات")}</label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-muted hover:text-foreground">
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {tr("Upload reference file", "رفع ملف مرجعي")}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAttachment(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {form.attachmentUrls.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {form.attachmentUrls.map((url) => (
                <span key={url} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-3 py-1 text-[11px] text-muted">
                  <Paperclip size={10} />
                  {url.split("/").pop()}
                  <button
                    onClick={() => setForm((current) => ({ ...current, attachmentUrls: current.attachmentUrls.filter((entry) => entry !== url) }))}
                    className="text-muted hover:text-foreground"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => void submitRequest()} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {tr("Send request", "إرسال الطلب")}
            </button>
            <p className="text-xs text-muted">{tr("You will see assignee and status updates below.", "ستشاهد تحديثات المُسند والحالة أدناه.")}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{tr("My Request Feed", "طلباتي")}</h3>
              <p className="mt-1 text-xs text-muted">{tr("Track outbound requests and target-department progress.", "تتبع الطلبات الصادرة وتقدم الأقسام المستهدفة.")}</p>
            </div>
            <span className="badge bg-surface-elevated text-muted border-border">{outboundRows.length}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={16} className="animate-spin text-muted" />
            </div>
          ) : outboundRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{tr("No outbound requests yet.", "لا توجد طلبات صادرة بعد.")}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {outboundRows.map((row) => (
                <div key={row.requestId} className="rounded-2xl border border-border bg-surface-elevated/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{row.title}</p>
                    <span className={SERVICE_REQUEST_STATUS_TONE[row.status]}>{row.status}</span>
                    <span className={SERVICE_REQUEST_PRIORITY_TONE[row.priority]}>{row.priority}</span>
                    <span className="badge bg-surface-elevated text-muted border-border">{SERVICE_REQUEST_TYPE_LABEL[row.requestType]}</span>
                  </div>
                  {row.description && <p className="mt-2 text-sm text-muted">{row.description}</p>}
                  <p className="mt-2 text-[11px] text-muted">
                    {tr("To", "إلى")} {row.targetDepartmentName ?? row.targetDepartmentSlug} · {formatDate(row.requestedAt)}
                    {row.assigneeName ? ` · ${tr("assigned to", "مُسند إلى")} ${row.assigneeName}` : ""}
                  </p>
                  {row.assigneeNote && <p className="mt-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted">{row.assigneeNote}</p>}
                  {row.attachmentUrls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.attachmentUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] text-primary hover:text-primary/80">
                          <Paperclip size={10} />
                          {url.split("/").pop()}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {inboxTypes.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tr("Request Inbox", "صندوق الطلبات")}</h3>
                <p className="mt-1 text-xs text-muted">{tr("Assign and update incoming requests for your department.", "أسند وحدّث الطلبات الواردة لقسمك.")}</p>
              </div>
              <span className="badge bg-surface-elevated text-muted border-border">{inboundRows.length}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={16} className="animate-spin text-muted" />
              </div>
            ) : inboundRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">{tr("No incoming requests.", "لا توجد طلبات واردة.")}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {inboundRows.map((row) => {
                  const draft = requestDrafts[row.requestId] ?? {
                    status: row.status,
                    assigneeId: row.assigneeId ? String(row.assigneeId) : "",
                    assigneeNote: row.assigneeNote ?? "",
                  };
                  return (
                    <div key={row.requestId} className="rounded-2xl border border-border bg-surface-elevated/30 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{row.title}</p>
                        <span className={SERVICE_REQUEST_STATUS_TONE[row.status]}>{row.status}</span>
                        <span className={SERVICE_REQUEST_PRIORITY_TONE[row.priority]}>{row.priority}</span>
                      </div>
                      {row.description && <p className="mt-2 text-sm text-muted">{row.description}</p>}
                      <p className="mt-2 text-[11px] text-muted">{tr("From", "من")} {row.sourceDepartmentName ?? row.sourceDepartmentSlug} · {row.requestedByName ?? tr("Unknown", "غير معروف")} · {formatDate(row.requestedAt)}</p>

                      {row.attachmentUrls.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.attachmentUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] text-primary hover:text-primary/80">
                              <Paperclip size={10} />
                              {url.split("/").pop()}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className={labelCls}>{tr("Assignee", "المُسند إليه")}</label>
                          <select
                            value={draft.assigneeId}
                            onChange={(event) => setRequestDrafts((current) => ({ ...current, [row.requestId]: { ...draft, assigneeId: event.target.value } }))}
                            className={selectCls}
                          >
                            <option value="">{tr("Unassigned", "غير مُسند")}</option>
                            {assignees.map((member) => (
                              <option key={member.memberId} value={member.memberId}>{member.fullName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>{tr("Status", "الحالة")}</label>
                          <select
                            value={draft.status}
                            onChange={(event) => setRequestDrafts((current) => ({ ...current, [row.requestId]: { ...draft, status: event.target.value as ServiceRequestStatus } }))}
                            className={selectCls}
                          >
                            {([
                              ["pending",     tr("Pending",     "قيد الانتظار")],
                              ["assigned",    tr("Assigned",    "مُسند")],
                              ["in_progress", tr("In Progress", "جارٍ")],
                              ["completed",   tr("Completed",   "مكتمل")],
                              ["rejected",    tr("Rejected",    "مرفوض")],
                            ] as [string, string][]).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelCls}>{tr("Internal Note", "ملاحظة داخلية")}</label>
                          <textarea
                            rows={2}
                            value={draft.assigneeNote}
                            onChange={(event) => setRequestDrafts((current) => ({ ...current, [row.requestId]: { ...draft, assigneeNote: event.target.value } }))}
                            className={`${inputCls} resize-none`}
                            placeholder={tr("Visible in the two-way feed.", "مرئية في المحادثة المتبادلة.")}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <button onClick={() => void updateRequest(row.requestId)} disabled={updatingId === row.requestId} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-60">
                          {updatingId === row.requestId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          {tr("Save update", "حفظ التحديث")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
