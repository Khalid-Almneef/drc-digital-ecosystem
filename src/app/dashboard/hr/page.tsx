"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useLang } from "@/contexts/LanguageContext";
import { useEscape } from "@/lib/hooks/useEscape";
import { MemberPerformancePanel } from "@/components/dashboard/MemberPerformancePanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { useApi } from "@/lib/hooks/useApi";
import {
  Users, UserPlus, Clock, Search, Loader2,
  ChevronDown, ChevronUp, Check, X, Save, ExternalLink,
  ThumbsUp, ThumbsDown, Shield, CalendarDays, Megaphone,
  Mail, Plus, Download, Upload, FileSpreadsheet, AlertTriangle,
  Pencil, Trash2,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/client";
import { MemberLink } from "@/components/dashboard/MemberLink";
import { MotmLeaderboardPanel } from "@/components/dashboard/MotmLeaderboardPanel";
import { FormsManager } from "@/components/dashboard/FormsManager";
import { AlumniManager } from "@/components/dashboard/AlumniManager";
import { EndorsementsLeaderboard } from "@/components/dashboard/EndorsementsLeaderboard";
import { EmptyState } from "@/components/dashboard/EmptyState";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  memberId: number;
  email: string;
  position: string;
  isActive: boolean;
  departmentSlug: string;
  departmentName: string;
  fullName: string;
  fullNameAr: string;
  isPublicOnTeam: boolean;
  major: string | null;
  gender?: "male" | "female" | null;
}

interface PreferredDept {
  id: number;
  slug: string;
  name: string;
}

interface Application {
  applicationId: number;
  applicantName: string;
  applicantEmail: string;
  universityId: string;
  major: string;
  phoneNumber: string;
  motivation: string;
  skills: string;
  status: "pending" | "interview" | "accepted" | "rejected";
  appliedDate: string;
  preferredDepartments: PreferredDept[];
}

interface MonthMember {
  memberId: number;
  fullName: string;
  departmentName: string;
}

interface HourRow {
  id: number;
  memberId: number;
  memberName: string;
  hours: number;
  title: string;
  description?: string;
  participationDate: string;
  approvalStatus: "pending" | "approved" | "rejected";
  sourceType: "self_logged" | "task_credit" | "project_credit" | "event_credit" | "hour_task";
  sourceId?: number;
}

interface VolunteerHourTaskRow {
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
  registrationsCount?: number;
}

interface AnnouncementRequestRow {
  requestId: number;
  title: string;
  body: string | null;
  priority: "low" | "medium" | "high" | "critical";
  requestType: "general" | "monthly_newsletter";
  status: "pending" | "published" | "rejected";
  desiredPublishDate: string | null;
  createdAt: string;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled}
      role="switch" aria-checked={checked}
      className={`relative w-9 h-5 rounded-full border transition-colors shrink-0 ${
        checked ? "bg-primary/20 border-primary/40" : "bg-surface-elevated border-border"
      } disabled:opacity-40`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all ${
        checked ? "translate-x-4 bg-primary" : "bg-muted/40"
      }`} />
    </button>
  );
}

const sourceTypeBadge: Record<HourRow["sourceType"], string> = {
  self_logged:    "badge bg-surface-elevated text-muted border-border",
  task_credit:    "badge bg-blue-500/10 text-blue-400 border-blue-500/20",
  project_credit: "badge bg-purple-500/10 text-purple-400 border-purple-500/20",
  event_credit:   "badge bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  hour_task:      "badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
};
const sourceTypeLabel: Record<HourRow["sourceType"], string> = {
  self_logged:    "Self",
  task_credit:    "Task",
  project_credit: "Project",
  event_credit:   "Event",
  hour_task:      "Hour Task",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRDashboard() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [activeTab, setActiveTab] = useState<"members" | "applications" | "forms" | "motm" | "hours" | "hourTasks" | "performance" | "announcements" | "membership" | "alumni" | "endorsements">("members");

  // ── Members ──
  const { data: members = [], isLoading: membersLoading, mutate: loadMembers } = useApi<Member[]>("/api/members");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  useEscape(registerOpen, () => setRegisterOpen(false));

  // ── Applications ──
  const { data: applications = [], isLoading: appsLoading, mutate: loadApplications } = useApi<Application[]>("/api/applications");
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // ── MOTM ──
  const { data: motm = [], mutate: loadMotm } = useApi<MonthMember[]>("/api/members/month");
  const [motmSaving, setMotmSaving] = useState(false);
  const [motmOpen, setMotmOpen] = useState(false);
  const [motmQuery, setMotmQuery] = useState("");

  // ── Hours ──
  const [hoursFilter, setHoursFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const hoursKey = activeTab === "hours"
    ? `/api/volunteer-hours?${hoursFilter === "all" ? "scope=all" : `scope=all&status=${hoursFilter}`}`
    : null;
  const { data: hours = [], isLoading: hoursLoading, mutate: loadHoursApi } = useApi<HourRow[]>(hoursKey);
  const loadHours = useCallback(() => loadHoursApi(), [loadHoursApi]);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  // ── Bulk hours import ──
  type BulkRow = { rowNumber: number; email: string; status: string; message?: string };
  type BulkResult = { totalRows: number; inserted: number; skipped: number; errors: number; rows: BulkRow[] };
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  async function downloadHoursTemplate() {
    try {
      const res = await fetch("/api/volunteer-hours/bulk/template", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`Template download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `drc-credit-hours-template-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Download failed", "فشل التحميل"));
    }
  }

  async function uploadHoursCsv(file: File) {
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/volunteer-hours/bulk", {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=utf-8" },
        body: text,
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Upload failed (${res.status})`);
      const data = (json?.data ?? json) as BulkResult;
      setBulkResult(data);
      toast.success(tr(
        `Imported ${data.inserted} (${data.skipped} skipped, ${data.errors} errors)`,
        `تم استيراد ${data.inserted} (تم تخطي ${data.skipped}، أخطاء ${data.errors})`,
      ));
      await loadHours();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Upload failed", "فشل الرفع"));
    } finally {
      setBulkUploading(false);
    }
  }

  // ── Volunteer hour tasks ──
  const { data: hourTasks = [], isLoading: hourTasksLoading, mutate: loadHourTasks } = useApi<VolunteerHourTaskRow[]>("/api/volunteer-hour-tasks?scope=manage");
  const [hourTaskSaving, setHourTaskSaving] = useState(false);
  const [togglingHourTaskId, setTogglingHourTaskId] = useState<number | null>(null);
  const [hourTaskForm, setHourTaskForm] = useState({
    title: "",
    description: "",
    hours: "",
    participationDate: new Date().toISOString().slice(0, 10),
    isRepetitive: false,
    assignedDepartmentId: "" as "" | string,
  });
  const [editingHourTaskId, setEditingHourTaskId] = useState<number | null>(null);
  const [deletingHourTaskId, setDeletingHourTaskId] = useState<number | null>(null);
  const { data: departmentOptions = [] } = useApi<DepartmentOption[]>("/api/departments");

  // Hours review — accept-with-adjustment modal
  const [adjustHour, setAdjustHour] = useState<HourRow | null>(null);
  const [adjustValue, setAdjustValue] = useState<string>("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  useEscape(adjustHour !== null, () => setAdjustHour(null));

  // ── Announcement requests ──
  const { data: announcementRequests = [], isLoading: announcementRequestsLoading, mutate: loadAnnouncementRequests } = useApi<AnnouncementRequestRow[]>("/api/announcement-requests");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [requestPriority, setRequestPriority] = useState<AnnouncementRequestRow["priority"]>("high");
  const [requestType, setRequestType] = useState<AnnouncementRequestRow["requestType"]>("monthly_newsletter");
  const [requestDesiredDate, setRequestDesiredDate] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);

  // ── Membership ──
  const { data: acceptingData, mutate: loadAcceptingApi } = useApi<{ json: { accepting: boolean } }>("/api/site-content/join.accepting");
  const { data: closedMsgData, mutate: loadClosedMsgApi } = useApi<{ en: string; ar: string }>("/api/site-content/join.closed.message");
  const accepting = acceptingData?.json?.accepting ?? true;
  const [closedEn, setClosedEn] = useState("");
  const [closedAr, setClosedAr] = useState("");
  const [membershipSaving, setMembershipSaving] = useState(false);
  const loadMembership = useCallback(() => {
    void loadAcceptingApi();
    void loadClosedMsgApi();
  }, [loadAcceptingApi, loadClosedMsgApi]);

  // Seed editable closed-message drafts when the server data refreshes.
  useEffect(() => {
    if (closedMsgData?.en) setClosedEn(closedMsgData.en);
    if (closedMsgData?.ar) setClosedAr(closedMsgData.ar);
  }, [closedMsgData]);

  // ─── Derived stats ───────────────────────────────────────────────────────────

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.isActive).length;
  const pendingApps = applications.filter((a) => a.status === "pending").length;
  const maleMembers = members.filter((m) => m.gender === "male").length;
  const femaleMembers = members.filter((m) => m.gender === "female").length;

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function toggleVisibility(member: Member) {
    setTogglingId(member.memberId);
    try {
      await api.patch(`/api/members/${member.memberId}/team-visibility`, {
        isPublicOnTeam: !member.isPublicOnTeam,
      });
      void loadMembers();
    } catch {
      toast.error(tr("Could not update team visibility.", "تعذّر تحديث ظهور العضو في الفريق."));
    } finally {
      setTogglingId(null);
    }
  }

  async function approveApplication(id: number) {
    setApprovingId(id);
    try {
      await api.patch(`/api/applications/${id}/approve`, {});
      toast.success(tr("Application approved", "تم اعتماد الطلب"));
      loadApplications();
    } catch {
      toast.error(tr("Approval failed. Please try again.", "فشل الاعتماد. حاول مرة أخرى."));
    } finally {
      setApprovingId(null);
    }
  }

  // MOTM is a draft-then-save flow: edit locally via SWR optimistic mutate, save POSTs the list.
  function toggleMotm(member: Member) {
    void loadMotm((prev = []) => {
      const already = prev.find((m) => m.memberId === member.memberId);
      if (already) return prev.filter((m) => m.memberId !== member.memberId);
      return [...prev, { memberId: member.memberId, fullName: member.fullName, departmentName: member.departmentName }];
    }, false);
  }

  function removeFromMotm(member: MonthMember) {
    const confirmMsg = lang === "ar"
      ? `إزالة "${member.fullName}" من قائمة عضو الشهر؟`
      : `Remove "${member.fullName}" from Members of the Month?`;
    if (!window.confirm(confirmMsg)) return;
    void loadMotm((prev = []) => prev.filter((m) => m.memberId !== member.memberId), false);
  }

  async function saveMotm() {
    setMotmSaving(true);
    try {
      await api.patch("/api/members/month", { memberIds: motm.map((m) => m.memberId) });
      toast.success(tr("Members of the Month saved", "تم حفظ أعضاء الشهر"));
      void loadMotm();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setMotmSaving(false);
    }
  }

  async function decideHour(id: number, status: "approved" | "rejected") {
    if (status === "rejected") {
      const confirmMsg = tr("Reject these volunteer hours?", "رفض ساعات التطوع؟");
      if (!window.confirm(confirmMsg)) return;
    }
    setDecidingId(id);
    try {
      await api.patch(`/api/volunteer-hours/${id}/approve`, { status });
      void loadHoursApi();
      toast.success(status === "approved"
        ? tr("Hours approved", "تم اعتماد الساعات")
        : tr("Hours rejected", "تم رفض الساعات"));
    } catch {
      toast.error(tr("Decision failed. Please try again.", "فشل اتخاذ القرار. حاول مرة أخرى."));
    } finally {
      setDecidingId(null);
    }
  }

  function openAdjustModal(row: HourRow) {
    setAdjustHour(row);
    setAdjustValue(String(row.hours));
  }

  async function confirmAdjustment() {
    if (!adjustHour) return;
    const numeric = Number(adjustValue);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error(tr("Enter a value greater than zero.", "أدخل قيمة أكبر من صفر."));
      return;
    }
    setAdjustSaving(true);
    try {
      await api.patch(`/api/volunteer-hours/${adjustHour.id}/approve`, {
        status: "approved",
        hoursOverride: numeric,
      });
      toast.success(
        numeric !== Number(adjustHour.hours)
          ? tr(`Approved with ${numeric}h`, `تم الاعتماد بـ ${numeric} ساعة`)
          : tr("Hours approved", "تم اعتماد الساعات"),
      );
      setAdjustHour(null);
      void loadHoursApi();
    } catch {
      toast.error(tr("Could not approve with adjustment.", "تعذّر الاعتماد مع التعديل."));
    } finally {
      setAdjustSaving(false);
    }
  }

  // Bulk approve/reject for the visible hours queue.
  // Selection state is keyed by hour id and resets when the filter or page changes.
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkDeciding, setBulkDeciding] = useState(false);
  function toggleBulk(id: number) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleBulkAll(ids: number[]) {
    setBulkSelected((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }
  async function bulkDecide(status: "approved" | "rejected") {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    if (status === "rejected" && !window.confirm(tr(`Reject ${ids.length} hour entries?`, `رفض ${ids.length} طلبات ساعات؟`))) return;
    setBulkDeciding(true);
    try {
      // Run in parallel; the underlying endpoint is idempotent per row.
      const results = await Promise.allSettled(
        ids.map((id) => api.patch(`/api/volunteer-hours/${id}/approve`, { status })),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (failed > 0) {
        toast.error(tr(`${ok} done, ${failed} failed`, `${ok} تم، ${failed} فشل`));
      } else {
        toast.success(status === "approved"
          ? tr(`Approved ${ok} entries`, `تم اعتماد ${ok}`)
          : tr(`Rejected ${ok} entries`, `تم رفض ${ok}`));
      }
      setBulkSelected(new Set());
      void loadHoursApi();
    } finally {
      setBulkDeciding(false);
    }
  }
  // Clear selection whenever the filter changes — selected ids may not be visible anymore.
  useEffect(() => { setBulkSelected(new Set()); }, [hoursFilter]);

  function resetHourTaskForm() {
    setHourTaskForm({
      title: "",
      description: "",
      hours: "",
      participationDate: new Date().toISOString().slice(0, 10),
      isRepetitive: false,
      assignedDepartmentId: "",
    });
  }

  async function submitHourTask() {
    if (!hourTaskForm.title.trim() || !hourTaskForm.hours || !hourTaskForm.participationDate) return;
    setHourTaskSaving(true);
    try {
      const payload = {
        title: hourTaskForm.title.trim(),
        description: hourTaskForm.description.trim() || undefined,
        hours: Number(hourTaskForm.hours),
        participationDate: hourTaskForm.participationDate,
        isRepetitive: hourTaskForm.isRepetitive,
        assignedDepartmentId: hourTaskForm.assignedDepartmentId
          ? Number(hourTaskForm.assignedDepartmentId)
          : null,
      };
      if (editingHourTaskId == null) {
        await api.post("/api/volunteer-hour-tasks", payload);
        toast.success(tr("Hour task created", "تم إنشاء المهمة"));
      } else {
        await api.patch(`/api/volunteer-hour-tasks/${editingHourTaskId}`, payload);
        toast.success(tr("Hour task updated", "تم تحديث المهمة"));
      }
      resetHourTaskForm();
      setEditingHourTaskId(null);
      loadHourTasks();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setHourTaskSaving(false);
    }
  }

  function startEditHourTask(task: VolunteerHourTaskRow) {
    setEditingHourTaskId(task.opportunityId);
    setHourTaskForm({
      title: task.title,
      description: task.description ?? "",
      hours: String(task.hours),
      participationDate: task.participationDate.slice(0, 10),
      isRepetitive: task.isRepetitive,
      assignedDepartmentId: task.assignedDepartmentId ? String(task.assignedDepartmentId) : "",
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function cancelEditHourTask() {
    setEditingHourTaskId(null);
    resetHourTaskForm();
  }

  async function deleteHourTask(task: VolunteerHourTaskRow) {
    const confirmMsg = lang === "ar"
      ? `هل تريد حذف المهمة "${task.title}"؟ لا يمكن التراجع.`
      : `Delete hour task "${task.title}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setDeletingHourTaskId(task.opportunityId);
    try {
      await api.delete(`/api/volunteer-hour-tasks/${task.opportunityId}`);
      if (editingHourTaskId === task.opportunityId) cancelEditHourTask();
      loadHourTasks();
      toast.success(tr("Hour task deleted", "تم حذف المهمة"));
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    } finally {
      setDeletingHourTaskId(null);
    }
  }

  async function toggleHourTask(opportunityId: number, isActive: boolean) {
    setTogglingHourTaskId(opportunityId);
    try {
      await api.patch(`/api/volunteer-hour-tasks/${opportunityId}`, { isActive: !isActive });
      void loadHourTasks();
    } catch {
      toast.error(tr("Could not toggle task. Please try again.", "تعذّر تغيير الحالة. حاول مرة أخرى."));
    } finally {
      setTogglingHourTaskId(null);
    }
  }

  async function createAnnouncementRequest() {
    if (!requestTitle.trim()) return;
    setRequestSaving(true);
    try {
      await api.post("/api/announcement-requests", {
        title: requestTitle.trim(),
        body: requestBody.trim() || undefined,
        priority: requestPriority,
        requestType,
        desiredPublishDate: requestDesiredDate || undefined,
      });
      setRequestTitle("");
      setRequestBody("");
      setRequestPriority("high");
      setRequestType("monthly_newsletter");
      setRequestDesiredDate("");
      toast.success(tr("Announcement request sent", "تم إرسال طلب الإعلان"));
      loadAnnouncementRequests();
    } catch {
      toast.error(tr("Send failed. Please try again.", "فشل الإرسال. حاول مرة أخرى."));
    } finally {
      setRequestSaving(false);
    }
  }

  async function toggleAccepting() {
    const next = !accepting;
    try {
      await api.patch("/api/site-content/join.accepting", { json: { accepting: next } });
      void loadAcceptingApi();
    } catch {
      toast.error(tr("Could not update applications status.", "تعذّر تحديث حالة الطلبات."));
    }
  }

  async function saveMembership() {
    setMembershipSaving(true);
    try {
      await api.patch("/api/site-content/join.closed.message", { en: closedEn, ar: closedAr });
      void loadClosedMsgApi();
      toast.success(tr("Membership settings saved", "تم حفظ إعدادات العضوية"));
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setMembershipSaving(false);
    }
  }

  // ─── Filtered members ────────────────────────────────────────────────────────

  const filteredMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMotmMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(motmQuery.toLowerCase()) ||
      m.departmentName.toLowerCase().includes(motmQuery.toLowerCase())
  );

  // ─── Badge helpers ────────────────────────────────────────────────────────────

  const appStatusClass: Record<Application["status"], string> = {
    pending: "badge badge-warning",
    interview: "badge badge-info",
    accepted: "badge badge-success",
    rejected: "badge badge-error",
  };

  const hourStatusClass: Record<HourRow["approvalStatus"], string> = {
    pending:  "badge badge-warning",
    approved: "badge badge-success",
    rejected: "badge badge-error",
  };

  const TAB_LABELS: Record<string, string> = {
    members: tr("Members", "الأعضاء"),
    applications: tr("Applications", "الطلبات"),
    forms: tr("Forms", "النماذج"),
    motm: tr("MOTM", "MOTM"),
    hours: tr("Hours", "الساعات"),
    hourTasks: tr("Hour Tasks", "مهام الساعات"),
    performance: tr("Performance", "الأداء"),
    announcements: tr("Announcements", "الإعلانات"),
    membership: tr("Membership", "العضوية"),
    alumni: tr("Edit Alumni", "تعديل الخريجين"),
    endorsements: tr("Endorsements", "التزكيات"),
  };

  const requestStatusClass: Record<AnnouncementRequestRow["status"], string> = {
    pending: "badge badge-warning",
    published: "badge badge-success",
    rejected: "badge badge-error",
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <DashboardHeader
        title={tr("HR & Members", "الموارد والأعضاء")}
        description={tr("Manage club membership, applications, volunteer hours, and member records.", "أدر العضوية والطلبات والساعات التطوعية وبيانات الأعضاء.")}
      />

      {/* Stats (focused: 3 north-star KPIs only — male/female/active surface inside Members) */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard icon={Users}     label={tr("Total Members", "إجمالي الأعضاء")}        value={membersLoading ? "…" : totalMembers}   onClick={() => setActiveTab("members")} />
        <StatCard icon={UserPlus}  label={tr("Pending Applications", "الطلبات المعلقة")} value={appsLoading ? "…" : pendingApps}      onClick={() => setActiveTab("applications")} tone={pendingApps > 0 ? "warning" : "neutral"} />
        <StatCard icon={Shield}    label={tr("Join Status", "حالة الانضمام")}           value={accepting ? tr("Open", "مفتوح") : tr("Closed", "مغلق")} onClick={() => setActiveTab("membership")} tone={accepting ? "success" : "neutral"} />
      </div>

      {/* Two-tier tabs: 4 primary groups → in-group sub-tabs */}
      {(() => {
        const GROUPS = {
          people: { label: tr("People", "الأشخاص"), tabs: ["members", "applications", "alumni", "performance"] as const },
          recognition: { label: tr("Recognition", "التقدير"), tabs: ["motm", "endorsements", "hours", "hourTasks"] as const },
          comms: { label: tr("Communications", "التواصل"), tabs: ["announcements", "forms"] as const },
          settings: { label: tr("Settings", "الإعدادات"), tabs: ["membership"] as const },
        } as const;
        const findGroup = (tab: typeof activeTab): keyof typeof GROUPS => {
          for (const key of Object.keys(GROUPS) as (keyof typeof GROUPS)[]) {
            if ((GROUPS[key].tabs as readonly string[]).includes(tab)) return key;
          }
          return "people";
        };
        const activeGroup = findGroup(activeTab);
        const subTabs = GROUPS[activeGroup].tabs;
        return (
          <div className="mb-6 space-y-3">
            <div className="tab-rail w-fit" role="tablist" aria-label={tr("HR sections", "أقسام الموارد")}>
              {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((key) => {
                const isActive = key === activeGroup;
                const showBadge = key === "people" && pendingApps > 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(GROUPS[key].tabs[0] as typeof activeTab)}
                    data-active={isActive}
                    aria-selected={isActive}
                    role="tab"
                    className="tab-pill"
                  >
                    {GROUPS[key].label}
                    {showBadge ? <span className="ms-1.5 badge badge-warning">{pendingApps}</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="-mx-1 flex flex-wrap gap-1.5 px-1" role="tablist" aria-label={GROUPS[activeGroup].label}>
              {subTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    aria-selected={isActive}
                    role="tab"
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/70 bg-surface/30 text-muted hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {TAB_LABELS[tab]}
                    {tab === "applications" && pendingApps > 0 ? <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">{pendingApps}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Members Tab ── */}
      {activeTab === "members" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr("Search by name or department…", "ابحث بالاسم أو القسم…")}
                className="surface-input w-full py-2.5 pl-9 pr-4 text-sm"
              />
            </div>
            <button
              onClick={() => setRegisterOpen(true)}
              className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm whitespace-nowrap"
            >
              <Plus size={14} />
              {tr("Register member", "تسجيل عضو")}
            </button>
          </div>

          {membersLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Name", "الاسم")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Department", "القسم")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Position", "المنصب")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Gender", "الجنس")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Public On Team", "ظاهر في الفريق")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Status", "الحالة")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member, i) => (
                      <motion.tr
                        key={member.memberId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i, 6) * 0.03 }}
                        className="border-b border-border/50 hover:bg-surface-elevated/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[11px] font-medium text-muted shrink-0">
                              {member.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                <MemberLink memberId={member.memberId} name={member.fullName} />
                              </p>
                              <p className="text-[11px] text-muted">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted">{member.departmentName}</td>
                        <td className="px-5 py-3.5 text-sm text-muted capitalize">{member.position.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3.5 text-sm text-muted">{member.gender ? member.gender.replace(/_/g, " ") : "—"}</td>
                        <td className="px-5 py-3.5">
                          <Toggle
                            checked={member.isPublicOnTeam}
                            onChange={() => toggleVisibility(member)}
                            disabled={togglingId === member.memberId}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={member.isActive ? "badge badge-success" : "badge text-muted bg-surface-elevated"}>
                            {member.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                          No members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Applications Tab ── */}
      {activeTab === "applications" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {appsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {applications.length === 0 && (
                <EmptyState
                  icon={UserPlus}
                  title={tr("No applications yet", "لا توجد طلبات بعد")}
                  body={tr("New member applications will appear here for review.", "ستظهر طلبات الانضمام الجديدة هنا للمراجعة.")}
                />
              )}
              {applications.map((app, i) => (
                <motion.div
                  key={app.applicationId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.05 }}
                  className="glass-card p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-xs font-medium text-muted shrink-0">
                      {app.applicantName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{app.applicantName}</p>
                      <p className="text-xs text-muted">{app.applicantEmail}</p>
                      <p className="text-xs text-muted mt-0.5">{app.major}</p>
                      {app.preferredDepartments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {app.preferredDepartments.map((d) => (
                            <span key={d.id} className="text-[11px] bg-surface-elevated border border-border rounded-full px-2 py-0.5 text-muted">
                              {d.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted">
                      {new Date(app.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className={appStatusClass[app.status]}>
                      {app.status}
                    </span>
                    {(app.status === "pending" || app.status === "interview") && (
                      <button
                        onClick={() => approveApplication(app.applicationId)}
                        disabled={approvingId === app.applicationId}
                        className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        {approvingId === app.applicationId
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Check size={11} />}
                        Approve
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Forms Tab ── */}
      {activeTab === "forms" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <FormsManager tr={tr} />
        </motion.div>
      )}

      {/* ── MOTM Tab ── */}
      {activeTab === "motm" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="panel-soft max-w-2xl p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 inline-flex rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90">
                  Recognition
                </div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Users size={15} className="text-primary" />
                  Members of the Month
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                  Curate the featured members shown this month. Keep the list selective and easy to update.
                </p>
              </div>
              <button
                onClick={saveMotm}
                disabled={motmSaving}
                className="btn-primary inline-flex items-center justify-center gap-1.5 self-start px-3 py-2 text-xs"
              >
                {motmSaving ? <Loader2 size={11} className="animate-spin" /> : null}
                Save Changes
              </button>
            </div>

            {motm.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {motm.map((m) => (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => removeFromMotm(m)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/18 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-error/20 hover:bg-error/10 hover:text-error"
                    title={tr("Click to remove", "اضغط للإزالة")}
                    aria-label={tr(`Remove ${m.fullName}`, `إزالة ${m.fullName}`)}
                  >
                    {m.fullName}
                    <X size={10} />
                  </button>
                ))}
              </div>
            )}

            <div className="control-surface overflow-hidden">
              <button
                onClick={() => {
                  setMotmOpen((v) => !v);
                  if (motmOpen) setMotmQuery("");
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-sm text-foreground"
              >
                <div className="flex min-w-0 flex-col items-start text-left">
                  <span className="font-medium">{motm.length > 0 ? `${motm.length} selected` : "Select members"}</span>
                  <span className="mt-0.5 text-xs text-muted">Search by member or department</span>
                </div>
                {motmOpen ? <ChevronUp size={14} className="shrink-0 text-muted" /> : <ChevronDown size={14} className="shrink-0 text-muted" />}
              </button>

              <AnimatePresence>
                {motmOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="dropdown-surface mx-3 mb-3 overflow-hidden"
                  >
                    <div className="border-b border-border/70 p-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
                        <input
                          type="text"
                          value={motmQuery}
                          onChange={(e) => setMotmQuery(e.target.value)}
                          placeholder={tr("Search members by name or department…", "ابحث عن عضو بالاسم أو القسم…")}
                          className="surface-input w-full py-2.5 pl-9 pr-3 text-sm"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {filteredMotmMembers.map((m) => {
                        const selected = motm.some((x) => x.memberId === m.memberId);
                        return (
                          <button
                            key={m.memberId}
                            onClick={() => toggleMotm(m)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                              selected
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-surface-elevated"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{m.fullName}</span>
                              <span className="mt-0.5 block truncate text-xs text-muted">{m.departmentName}</span>
                            </span>
                            {selected && <Check size={13} className="shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                      {members.length === 0 && (
                        <p className="px-3 py-3 text-xs text-muted">No members loaded.</p>
                      )}
                      {members.length > 0 && filteredMotmMembers.length === 0 && (
                        <p className="px-3 py-3 text-xs text-muted">No members match your search.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <MotmLeaderboardPanel tr={tr} />
        </motion.div>
      )}

      {/* ── Hours Tab ── */}
      {activeTab === "hours" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {/* Bulk import panel */}
          <div className="glass-card p-5 mb-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2">
                <FileSpreadsheet size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {tr("Bulk credit-hour import", "استيراد ساعات معتمدة بالجملة")}
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  {tr(
                    "Download a CSV pre-filled with the active roster, set hours/title/date per member, and re-upload. Imports are saved as approved.",
                    "حمّل ملف CSV معبأ بأسماء الأعضاء النشطين، عبئ الساعات والعنوان والتاريخ لكل عضو، ثم أعد الرفع. الاستيراد يُحفظ معتمداً.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadHoursTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2 text-xs font-medium text-foreground hover:border-primary/30 transition-colors"
              >
                <Download size={14} />
                {tr("Download template (.csv)", "تحميل القالب (.csv)")}
              </button>
              <a
                href="/api/volunteer-hours/export"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2 text-xs font-medium text-foreground hover:border-primary/30 transition-colors"
              >
                <Download size={14} />
                {tr("Export all hours (.csv)", "تصدير كل الساعات (.csv)")}
              </a>
              <label className={`inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 ${bulkUploading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}>
                {bulkUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {bulkUploading
                  ? tr("Uploading…", "جاري الرفع…")
                  : tr("Upload filled CSV", "رفع ملف CSV المعبّأ")}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={bulkUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = ""; // allow re-uploading same file
                    if (f) await uploadHoursCsv(f);
                  }}
                />
              </label>
              {bulkResult && (
                <button
                  type="button"
                  onClick={() => setBulkResult(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-muted hover:text-foreground transition-colors"
                >
                  <X size={12} />
                  {tr("Dismiss", "إخفاء")}
                </button>
              )}
            </div>

            {bulkResult && (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2">
                    <p className="text-muted">{tr("Rows", "السطور")}</p>
                    <p className="font-semibold text-foreground">{bulkResult.totalRows}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <p className="text-emerald-400/80">{tr("Imported", "تم الاستيراد")}</p>
                    <p className="font-semibold text-emerald-400">{bulkResult.inserted}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <p className="text-amber-400/80">{tr("Skipped", "تم التخطي")}</p>
                    <p className="font-semibold text-amber-400">{bulkResult.skipped}</p>
                  </div>
                  <div className={`rounded-lg border px-3 py-2 ${bulkResult.errors > 0 ? "border-red-500/30 bg-red-500/5" : "border-border bg-surface-elevated"}`}>
                    <p className={bulkResult.errors > 0 ? "text-red-400/80" : "text-muted"}>{tr("Errors", "أخطاء")}</p>
                    <p className={`font-semibold ${bulkResult.errors > 0 ? "text-red-400" : "text-foreground"}`}>{bulkResult.errors}</p>
                  </div>
                </div>

                {bulkResult.rows.some((r) => r.status === "error" || r.status === "skipped") && (
                  <details className="rounded-lg border border-border bg-surface-elevated/60">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-400" />
                      {tr("Issue details", "تفاصيل المشاكل")}
                    </summary>
                    <ul className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
                      {bulkResult.rows
                        .filter((r) => r.status !== "inserted")
                        .map((r) => (
                          <li key={r.rowNumber} className="text-[11px] text-muted">
                            <span className="font-mono">#{r.rowNumber}</span>
                            {r.email ? <span className="ms-2">{r.email}</span> : null}
                            <span className={`ms-2 font-medium ${r.status === "error" ? "text-red-400" : "text-amber-400"}`}>
                              {r.status}
                            </span>
                            {r.message ? <span className="ms-2 text-muted">— {r.message}</span> : null}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Filter pills */}
          <div className="mb-5 flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setHoursFilter(f)}
                data-active={hoursFilter === f}
                className="filter-chip"
              >
                {f}
              </button>
            ))}
          </div>

          {hoursLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
            </div>
          ) : hours.length === 0 ? (
            <div className="glass-card p-10 text-center text-sm text-muted">
              <Clock size={24} className="mx-auto mb-2 opacity-30" />
              No {hoursFilter === "all" ? "" : hoursFilter} hours entries found.
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              {/* Bulk action toolbar — visible only when at least one row is selected. */}
              {bulkSelected.size > 0 && (
                <div className="flex flex-wrap items-center gap-3 border-b border-border bg-primary/5 px-5 py-3">
                  <span className="text-xs font-medium text-foreground">
                    {tr(`${bulkSelected.size} selected`, `${bulkSelected.size} محدد`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => bulkDecide("approved")}
                    disabled={bulkDeciding}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-40"
                  >
                    {bulkDeciding ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                    {tr("Approve selected", "اعتماد المحدد")}
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkDecide("rejected")}
                    disabled={bulkDeciding}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40"
                  >
                    <ThumbsDown size={12} />
                    {tr("Reject selected", "رفض المحدد")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSelected(new Set())}
                    className="ms-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                    {tr("Clear", "إلغاء التحديد")}
                  </button>
                </div>
              )}
              <div className="overflow-x-auto max-h-[calc(100dvh-26rem)] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 w-9">
                        <input
                          type="checkbox"
                          aria-label={tr("Select all", "تحديد الكل")}
                          checked={hours.filter((h) => h.approvalStatus === "pending").every((h) => bulkSelected.has(h.id)) && hours.some((h) => h.approvalStatus === "pending")}
                          onChange={() => toggleBulkAll(hours.filter((h) => h.approvalStatus === "pending").map((h) => h.id))}
                          className="h-4 w-4 rounded border-border"
                        />
                      </th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Member", "العضو")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Title", "العنوان")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Hours", "الساعات")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Source", "المصدر")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Date", "التاريخ")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Status", "الحالة")}</th>
                      <th className="text-left text-[11px] font-medium text-muted uppercase tracking-wider px-5 py-3">{tr("Actions", "إجراءات")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((h, i) => (
                      <motion.tr
                        key={h.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i, 6) * 0.02 }}
                        className={`border-b border-border/50 hover:bg-surface-elevated/50 transition-colors ${bulkSelected.has(h.id) ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-3 py-3.5">
                          {h.approvalStatus === "pending" ? (
                            <input
                              type="checkbox"
                              aria-label={tr("Select row", "تحديد")}
                              checked={bulkSelected.has(h.id)}
                              onChange={() => toggleBulk(h.id)}
                              className="h-4 w-4 rounded border-border"
                            />
                          ) : null}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                          <MemberLink memberId={h.memberId} name={h.memberName ?? "—"} />
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted max-w-[200px] truncate">{h.title}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{h.hours}h</td>
                        <td className="px-5 py-3.5">
                          <span className={sourceTypeBadge[h.sourceType]}>
                            {sourceTypeLabel[h.sourceType]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                          {new Date(h.participationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={hourStatusClass[h.approvalStatus]}>{h.approvalStatus}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {h.approvalStatus === "pending" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => decideHour(h.id, "approved")}
                                disabled={decidingId === h.id}
                                title={tr("Approve", "اعتماد")}
                                className="p-1.5 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                              >
                                {decidingId === h.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                              </button>
                              {h.sourceType === "self_logged" && (
                                <button
                                  onClick={() => openAdjustModal(h)}
                                  disabled={decidingId === h.id}
                                  title={tr("Accept with adjustment", "قبول مع تعديل")}
                                  className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors text-[11px] font-semibold border border-amber-500/20 disabled:opacity-40"
                                >
                                  {tr("Adjust", "تعديل")}
                                </button>
                              )}
                              <button
                                onClick={() => decideHour(h.id, "rejected")}
                                disabled={decidingId === h.id}
                                title={tr("Reject", "رفض")}
                                className="p-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Hour Tasks Tab ── */}
      {activeTab === "hourTasks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="panel-soft mb-5 p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarDays size={15} />
              Volunteer Hour Tasks
            </h3>
            <p className="mt-1 text-xs text-muted">
              Create manual volunteer-hour tasks here. Members will only see them inside the volunteer-hours registration section on their profile.
            </p>
          </div>

          <div className="panel-soft mb-5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {editingHourTaskId != null
                  ? tr("Edit Hour Task", "تعديل مهمة الساعات")
                  : tr("Create Hour Task", "إنشاء مهمة ساعات")}
              </h4>
              {editingHourTaskId != null && (
                <button onClick={cancelEditHourTask} className="btn-secondary px-3 py-1.5 text-xs">
                  {tr("Cancel edit", "إلغاء التعديل")}
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Title", "العنوان")}</label>
                <input
                  value={hourTaskForm.title}
                  onChange={(e) => setHourTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={tr("April workshop support", "دعم ورشة شهر أبريل")}
                  className="surface-input px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Description", "الوصف")}</label>
                <textarea
                  value={hourTaskForm.description}
                  onChange={(e) => setHourTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder={tr("Explain who should register for this hour task.", "اشرح من يجب أن يسجّل لهذه المهمة.")}
                  className="surface-input resize-none px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Hours", "الساعات")}</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={hourTaskForm.hours}
                  onChange={(e) => setHourTaskForm((prev) => ({ ...prev, hours: e.target.value }))}
                  placeholder="2"
                  className="surface-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Participation Date", "تاريخ المشاركة")}</label>
                <input
                  type="date"
                  value={hourTaskForm.participationDate}
                  onChange={(e) => setHourTaskForm((prev) => ({ ...prev, participationDate: e.target.value }))}
                  className="surface-input px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                  {tr("Assign to Department", "إسناد إلى لجنة")}
                </label>
                <select
                  value={hourTaskForm.assignedDepartmentId}
                  onChange={(e) => setHourTaskForm((prev) => ({ ...prev, assignedDepartmentId: e.target.value }))}
                  className="surface-input px-3 py-2 text-sm"
                >
                  <option value="">{tr("Club-wide (all members)", "على مستوى النادي (لكل الأعضاء)")}</option>
                  {departmentOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {lang === "ar" ? d.nameAr || d.name : d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-start gap-3 rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5">
                <Toggle
                  checked={hourTaskForm.isRepetitive}
                  onChange={() => setHourTaskForm((prev) => ({ ...prev, isRepetitive: !prev.isRepetitive }))}
                />
                <div className="text-xs leading-5">
                  <p className="font-medium text-foreground">
                    {tr("Repetitive — members can log this task multiple times", "متكررة — يمكن للأعضاء تسجيل هذه المهمة أكثر من مرة")}
                  </p>
                  <p className="text-muted">
                    {tr("Use for ongoing activities like weekly meeting attendance.", "تستخدم للأنشطة المستمرة كحضور الاجتماع الأسبوعي.")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={submitHourTask}
                disabled={hourTaskSaving}
                className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                {hourTaskSaving ? <Loader2 size={11} className="animate-spin" /> : editingHourTaskId != null ? <Pencil size={11} /> : <Save size={11} />}
                {editingHourTaskId != null ? tr("Save changes", "حفظ التغييرات") : tr("Create Task", "إنشاء المهمة")}
              </button>
            </div>
          </div>

          {hourTasksLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
            </div>
          ) : hourTasks.length === 0 ? (
            <div className="glass-card p-10 text-center text-sm text-muted">{tr("No hour tasks created yet.", "لا توجد مهام ساعات بعد.")}</div>
          ) : (
            <div className="space-y-3">
              {hourTasks.map((task, index) => (
                <motion.div
                  key={task.opportunityId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 6) * 0.04 }}
                  className="glass-card p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <span className={task.isActive ? "badge badge-success" : "badge"}>
                        {task.isActive ? tr("Open", "مفتوحة") : tr("Closed", "مغلقة")}
                      </span>
                      <span className="badge bg-cyan-500/10 text-cyan-300 border-cyan-500/20">{task.hours}{tr("h", "س")}</span>
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
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(task.participationDate).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {typeof task.registrationsCount === "number" ? ` · ${task.registrationsCount} ${tr("registrations", "تسجيل")}` : ""}
                    </p>
                    {task.description && <p className="mt-2 text-sm text-muted max-w-2xl">{task.description}</p>}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Link
                      href={`/dashboard/hr/hour-tasks/${task.opportunityId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary inline-flex items-center justify-center px-2.5 py-2"
                      title={tr("Open in new tab", "فتح في نافذة جديدة")}
                    >
                      <ExternalLink size={12} />
                    </Link>
                    <button
                      onClick={() => startEditHourTask(task)}
                      className="btn-secondary inline-flex items-center justify-center px-2.5 py-2"
                      title={tr("Edit task", "تعديل المهمة")}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteHourTask(task)}
                      disabled={deletingHourTaskId === task.opportunityId}
                      className="btn-secondary inline-flex items-center justify-center px-2.5 py-2 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                      title={tr("Delete task", "حذف المهمة")}
                    >
                      {deletingHourTaskId === task.opportunityId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                    <button
                      onClick={() => toggleHourTask(task.opportunityId, task.isActive)}
                      disabled={togglingHourTaskId === task.opportunityId}
                      className="btn-primary px-3 py-2 text-xs inline-flex items-center gap-1.5"
                    >
                      {togglingHourTaskId === task.opportunityId ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                      {task.isActive ? "Close Task" : "Reopen Task"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Performance Tab ── */}
      {activeTab === "performance" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <MemberPerformancePanel />
        </motion.div>
      )}

      {/* ── Announcement Requests Tab ── */}
      {activeTab === "announcements" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
          <div className="panel-soft p-5">
            <div className="flex items-start gap-3">
              <Megaphone size={16} className="mt-0.5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tr("Announcement Request", "طلب إعلان")}</h3>
                <p className="mt-1 text-xs text-muted">
                  {tr("Send a request to Media for publishing HR communications like the monthly newsletter.", "أرسل طلباً إلى فريق الإعلام لنشر منشورات الموارد البشرية كالنشرة الشهرية.")}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Title", "العنوان")}</label>
                <input
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  placeholder={tr("Monthly HR Newsletter — May", "نشرة الموارد البشرية الشهرية — مايو")}
                  className="surface-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Request Type", "نوع الطلب")}</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as AnnouncementRequestRow["requestType"])}
                  className="surface-input px-3 py-2 text-sm"
                >
                  <option value="monthly_newsletter">{tr("Monthly Newsletter", "نشرة شهرية")}</option>
                  <option value="general">{tr("General Announcement", "إعلان عام")}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Priority", "الأولوية")}</label>
                <select
                  value={requestPriority}
                  onChange={(e) => setRequestPriority(e.target.value as AnnouncementRequestRow["priority"])}
                  className="surface-input px-3 py-2 text-sm"
                >
                  <option value="low">{tr("Low", "منخفضة")}</option>
                  <option value="medium">{tr("Medium", "متوسطة")}</option>
                  <option value="high">{tr("High", "مرتفعة")}</option>
                  <option value="critical">{tr("Critical", "حرجة")}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Request Details", "تفاصيل الطلب")}</label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={4}
                  placeholder={tr("Outline the copy, deadline, and any HR points that must be included.", "اشرح المحتوى والموعد النهائي وأي نقاط HR يجب تضمينها.")}
                  className="surface-input resize-none px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">{tr("Desired Publish Date", "تاريخ النشر المطلوب")}</label>
                <input
                  type="date"
                  value={requestDesiredDate}
                  onChange={(e) => setRequestDesiredDate(e.target.value)}
                  className="surface-input px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={createAnnouncementRequest}
                disabled={requestSaving}
                className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                {requestSaving ? <Loader2 size={11} className="animate-spin" /> : <Megaphone size={11} />}
                {tr("Send Request", "إرسال الطلب")}
              </button>
            </div>
          </div>

          {announcementRequestsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
            </div>
          ) : announcementRequests.length === 0 ? (
            <div className="glass-card p-10 text-center text-sm text-muted">No announcement requests yet.</div>
          ) : (
            <div className="space-y-3">
              {announcementRequests.map((request, index) => (
                <motion.div
                  key={request.requestId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 6) * 0.04 }}
                  className="glass-card p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{request.title}</p>
                        <span className={requestStatusClass[request.status]}>{request.status}</span>
                        <span className="badge bg-surface-elevated text-muted border-border">
                          {request.requestType === "monthly_newsletter" ? "Monthly Newsletter" : "General"}
                        </span>
                      </div>
                      {request.body && <p className="mt-2 text-sm leading-6 text-muted">{request.body}</p>}
                    </div>
                    <div className="text-xs text-muted">
                      <p>{new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      {request.desiredPublishDate && <p className="mt-1">Target: {request.desiredPublishDate}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Membership Tab ── */}
      {activeTab === "membership" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-lg space-y-6">

          {/* Accepting toggle */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tr("Accept New Members", "قبول أعضاء جدد")}</h3>
                <p className="text-xs text-muted mt-0.5">{tr("Controls whether the public Join page shows the application form.", "يتحكم في إظهار نموذج الانضمام بصفحة الانضمام العامة.")}</p>
              </div>
              <Toggle checked={accepting} onChange={toggleAccepting} />
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <span className={`badge ${accepting ? "badge-success" : "badge-error"}`}>
                {accepting ? tr("Open", "مفتوح") : tr("Closed", "مغلق")}
              </span>
              <a
                href="/join"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
              >
                {tr("Preview public join page", "معاينة صفحة الانضمام العامة")} <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Closed message */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{tr("Closed Message", "رسالة الإغلاق")}</h3>
              <button
                onClick={saveMembership}
                disabled={membershipSaving}
                className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
              >
                {membershipSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                {tr("Save", "حفظ")}
              </button>
            </div>
            <p className="text-xs text-muted mb-4">{tr("Shown on the public join page when membership is closed.", "تظهر في صفحة الانضمام عند إغلاق العضوية.")}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{tr("English", "الإنجليزية")}</label>
                <textarea
                  value={closedEn}
                  onChange={(e) => setClosedEn(e.target.value)}
                  rows={3}
                  placeholder="Membership is closed for this semester…"
                  className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/40 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{tr("Arabic", "العربية")}</label>
                <textarea
                  value={closedAr}
                  onChange={(e) => setClosedAr(e.target.value)}
                  rows={3}
                  dir="rtl"
                  placeholder="التسجيل مغلق لهذا الفصل…"
                  className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/40 resize-none"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "alumni" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <AlumniManager tr={tr} />
        </motion.div>
      )}

      {activeTab === "endorsements" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <EndorsementsLeaderboard tr={tr} />
        </motion.div>
      )}

      <AnimatePresence>
        {registerOpen && (
          <RegisterMemberModal
            onClose={() => setRegisterOpen(false)}
            onCreated={() => { setRegisterOpen(false); void loadMembers(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adjustHour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => !adjustSaving && setAdjustHour(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-sm p-5"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {tr("Accept with adjustment", "قبول مع تعديل")}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {tr(
                  `Member submitted ${adjustHour.hours}h for "${adjustHour.title}". Enter the credited amount.`,
                  `أرسل العضو ${adjustHour.hours} ساعة لـ "${adjustHour.title}". أدخل العدد المعتمد.`,
                )}
              </p>
              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                {tr("Credited hours", "الساعات المعتمدة")}
              </label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                className="surface-input px-3 py-2 text-sm w-full"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustHour(null)}
                  disabled={adjustSaving}
                  className="btn-secondary min-h-11 px-4 py-2 text-xs"
                >
                  {tr("Cancel", "إلغاء")}
                </button>
                <button
                  type="button"
                  onClick={confirmAdjustment}
                  disabled={adjustSaving || !adjustValue}
                  className="btn-primary inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs disabled:opacity-50"
                >
                  {adjustSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {tr("Confirm", "تأكيد")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DepartmentOption {
  id: number;
  slug: string;
  name: string;
  nameAr: string;
}

function RegisterMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: departments = [] } = useApi<DepartmentOption[]>("/api/departments");

  const [form, setForm] = useState({
    email: "",
    fullName: "",
    fullNameAr: "",
    departmentId: "",
    position: "member" as "member" | "sub_leader" | "dept_vice_leader" | "dept_leader",
    major: "",
    phoneNumber: "",
    gender: "" as "" | "male" | "female",
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.email.trim() || !form.fullName.trim() || !form.departmentId) {
      toast.error(tr("Email, name, and department are required.", "البريد والاسم والقسم مطلوبة."));
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/members/register", {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        fullNameAr: form.fullNameAr.trim() || undefined,
        departmentId: Number(form.departmentId),
        position: form.position,
        major: form.major.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        gender: form.gender || undefined,
      });
      toast.success(tr(
        "Member registered. They'll receive a setup email when they first try to log in.",
        "تم تسجيل العضو. سيتلقى رسالة الإعداد عند أول محاولة دخول.",
      ));
      onCreated();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message || tr("Registration failed. Please try again.", "فشل التسجيل. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  }

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
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg glass-card relative max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">{tr("Register a member", "تسجيل عضو")}</h2>
            <p className="mt-1 text-xs text-muted">
              {tr(
                "Add an email; the member sets their own password via the link sent on first login.",
                "أضف البريد؛ يضبط العضو كلمة المرور عبر الرابط المرسل عند أول دخول.",
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
              {tr("Email", "البريد الإلكتروني")} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="member@example.com"
                className="surface-input w-full py-2 pl-9 pr-3 text-sm"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tr("Full name (EN)", "الاسم الكامل (EN)")} <span className="text-red-400">*</span>
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="surface-input w-full py-2 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tr("Full name (AR)", "الاسم الكامل (AR)")}
              </label>
              <input
                value={form.fullNameAr}
                onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })}
                dir="rtl"
                className="surface-input w-full py-2 px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tr("Department", "القسم")} <span className="text-red-400">*</span>
              </label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="surface-input w-full py-2 px-3 text-sm"
                required
              >
                <option value="">{tr("Select department…", "اختر القسم…")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{lang === "ar" ? d.nameAr : d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tr("Position", "المنصب")}
              </label>
              <select
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value as typeof form.position })}
                className="surface-input w-full py-2 px-3 text-sm"
              >
                <option value="member">{tr("Member", "عضو")}</option>
                <option value="sub_leader">{tr("Sub-Leader", "مسؤول فرعي")}</option>
                <option value="dept_vice_leader">{tr("Vice Leader", "نائب رئيس")}</option>
                <option value="dept_leader">{tr("Leader", "رئيس")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tr("Major", "التخصص")}
              </label>
              <input
                value={form.major}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
                className="surface-input w-full py-2 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tr("Phone", "الهاتف")}
              </label>
              <input
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                className="surface-input w-full py-2 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tr("Gender", "الجنس")}
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}
                className="surface-input w-full py-2 px-3 text-sm"
              >
                <option value="">{tr("—", "—")}</option>
                <option value="male">{tr("Male", "ذكر")}</option>
                <option value="female">{tr("Female", "أنثى")}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {tr("Register member", "تسجيل العضو")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              {tr("Cancel", "إلغاء")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
