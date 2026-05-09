"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ClipboardList,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useLang } from "@/contexts/LanguageContext";
import { ImportExportToolbar } from "@/components/dashboard/ImportExportToolbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { MemberLink } from "@/components/dashboard/MemberLink";
import { api } from "@/lib/client";
import { useApi } from "@/lib/hooks/useApi";
import { parseBoolean, toCsv } from "@/lib/csv";
import type { FinanceDepartmentSummary, FinancePurchaseRequest } from "@/lib/finance";
import type { ServiceRequestRow } from "@/lib/service-requests";

interface Announcement {
  announcementId: number;
  title: string;
  body: string | null;
  imageUrl: string | null;
  priority: "low" | "medium" | "high" | "critical";
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  authorId: number | null;
  authorName: string | null;
}

interface MemberRow {
  memberId: number;
  fullName: string;
  position: string;
  isActive: boolean;
  departmentSlug: string | null;
  departmentName: string | null;
  profileStatus: string;
}

interface AnnouncementRequestRow {
  requestId: number;
  title: string;
  body: string | null;
  priority: "low" | "medium" | "high" | "critical";
  requestType: "general" | "monthly_newsletter";
  status: "pending" | "published" | "rejected";
  requestedBy: number;
  requestedByName: string | null;
  desiredPublishDate: string | null;
  createdAt: string;
}

interface FinanceOverviewResponse {
  departments: FinanceDepartmentSummary[];
  requests: FinancePurchaseRequest[];
  totals: {
    allocated: number;
    spent: number;
    committed: number;
    remaining: number;
    pendingRequests: number;
  };
}

interface ContentAuditRow {
  key: string;
  updatedAt: string | null;
}

const DEPARTMENT_ORDER = ["hr", "development", "innovation", "media", "pr", "finance", "logistics", "madarat"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: "var(--error)",
  high: "var(--warning)",
  medium: "var(--primary)",
  low: "var(--muted)",
};

const FINANCE_STATUS_TONE: Record<string, string> = {
  pending: "badge badge-warning",
  approved: "badge badge-primary",
  purchasing: "badge bg-blue-500/10 text-blue-300 border-blue-500/20",
  fulfilled: "badge badge-success",
  rejected: "badge bg-red-500/10 text-red-300 border-red-500/20",
};

const SERVICE_STATUS_TONE: Record<string, string> = {
  pending: "badge badge-warning",
  assigned: "badge badge-primary",
  in_progress: "badge bg-blue-500/10 text-blue-300 border-blue-500/20",
  completed: "badge badge-success",
  rejected: "badge bg-red-500/10 text-red-300 border-red-500/20",
};

const LEADERSHIP_POSITIONS = new Set(["dept_leader", "dept_vice_leader", "sub_leader"]);

function formatMoney(value: number) {
  return `${(value / 1000).toFixed(1)}K SAR`;
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LeadersDashboard() {
  const { lang } = useLang();
  const { data: announcements = [], mutate: loadAnnouncements } = useApi<Announcement[]>("/api/announcements");
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [formPinned, setFormPinned] = useState(false);
  const [formExpires, setFormExpires] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: members = [], isLoading: loadingMembers, mutate: loadMembers } = useApi<MemberRow[]>("/api/members");
  const { data: serviceRequests = [], isLoading: loadingService, mutate: loadServiceRequests } = useApi<ServiceRequestRow[]>("/api/service-requests?scope=all");
  const { data: announcementRequests = [], isLoading: loadingAnnReqs, mutate: loadAnnouncementRequests } = useApi<AnnouncementRequestRow[]>("/api/announcement-requests?scope=all");
  const { data: financeOverview, isLoading: loadingFinance, mutate: loadFinanceOverview } = useApi<FinanceOverviewResponse>("/api/finance/overview");
  const { data: contentRows = [], isLoading: loadingContent, mutate: loadContentRows } = useApi<ContentAuditRow[]>("/api/site-content");

  const financeDepartments = financeOverview?.departments ?? [];
  const financeRequests = financeOverview?.requests ?? [];
  const loadingOverview = loadingMembers || loadingService || loadingAnnReqs || loadingFinance || loadingContent;

  const loadExecutiveOverview = () => {
    void loadMembers();
    void loadServiceRequests();
    void loadAnnouncementRequests();
    void loadFinanceOverview();
    void loadContentRows();
  };

  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.memberId, member])),
    [members],
  );

  const departmentCards = useMemo(() => {
    return financeDepartments
      .slice()
      .sort((a, b) => DEPARTMENT_ORDER.indexOf(a.slug) - DEPARTMENT_ORDER.indexOf(b.slug))
      .map((department) => {
        const departmentMembers = members.filter((member) => member.departmentSlug === department.slug && member.isActive);
        const leadershipMembers = departmentMembers.filter((member) => LEADERSHIP_POSITIONS.has(member.position));
        const leader = departmentMembers.find((member) => member.position === "dept_leader");
        const viceLeaders = departmentMembers.filter((member) => member.position === "dept_vice_leader");
        const subLeaders = departmentMembers.filter((member) => member.position === "sub_leader");
        const financeRows = financeRequests.filter((request) => request.departmentSlug === department.slug);
        const openFinance = financeRows.filter((request) => ["pending", "approved", "purchasing"].includes(request.status));
        const outboundService = serviceRequests.filter((request) => request.sourceDepartmentSlug === department.slug);
        const inboxService = serviceRequests.filter((request) => request.targetDepartmentSlug === department.slug);
        const linkedService = Array.from(new Map([...outboundService, ...inboxService].map((request) => [request.requestId, request])).values());
        const openService = linkedService.filter((request) => !["completed", "rejected"].includes(request.status));
        const departmentAnnouncementRequests = announcementRequests.filter((request) => memberMap.get(request.requestedBy)?.departmentSlug === department.slug);
        const pendingAnnouncements = departmentAnnouncementRequests.filter((request) => request.status === "pending");
        const latestWork = [
          openFinance[0] ? `Finance: ${openFinance[0].title}` : null,
          openService[0] ? `Ops: ${openService[0].title}` : null,
          pendingAnnouncements[0] ? `Media: ${pendingAnnouncements[0].title}` : null,
        ].filter(Boolean) as string[];
        const feedback = [
          openFinance.find((request) => request.financeNote)?.financeNote,
          openService.find((request) => request.assigneeNote)?.assigneeNote,
        ].filter(Boolean) as string[];

        return {
          department,
          leaderName: leader?.fullName ?? "No leader assigned",
          leadershipMembers,
          viceLeaders,
          subLeaders,
          activeMembers: departmentMembers.length,
          openFinance,
          openService,
          outboundService,
          inboxService,
          pendingAnnouncements,
          latestWork,
          feedback,
        };
      });
  }, [announcementRequests, financeDepartments, financeRequests, memberMap, members, serviceRequests]);

  const totalLeaders = useMemo(
    () => members.filter((member) => member.isActive && LEADERSHIP_POSITIONS.has(member.position)).length,
    [members],
  );
  const openServiceRequests = useMemo(
    () => serviceRequests.filter((request) => !["completed", "rejected"].includes(request.status)).length,
    [serviceRequests],
  );
  const pendingFinanceRequests = useMemo(
    () => financeRequests.filter((request) => ["pending", "approved", "purchasing"].includes(request.status)).length,
    [financeRequests],
  );
  const pendingAnnouncementRequests = useMemo(
    () => announcementRequests.filter((request) => request.status === "pending").length,
    [announcementRequests],
  );
  const latestContentUpdates = useMemo(
    () => contentRows
      .filter((row) => row.updatedAt)
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .slice(0, 5),
    [contentRows],
  );

  function resetAnnouncementForm() {
    setEditingAnnouncementId(null);
    setFormTitle("");
    setFormBody("");
    setFormImageUrl("");
    setFormPriority("medium");
    setFormPinned(false);
    setFormExpires("");
    setShowForm(false);
  }

  function startEditingAnnouncement(announcement: Announcement) {
    setEditingAnnouncementId(announcement.announcementId);
    setFormTitle(announcement.title);
    setFormBody(announcement.body ?? "");
    setFormImageUrl(announcement.imageUrl ?? "");
    setFormPriority(announcement.priority);
    setFormPinned(announcement.isPinned);
    setFormExpires(announcement.expiresAt ? announcement.expiresAt.slice(0, 10) : "");
    setShowForm(true);
  }

  async function createAnnouncement() {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/announcements", {
        title: formTitle.trim(),
        body: formBody.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
        priority: formPriority,
        isPinned: formPinned,
        expiresAt: formExpires || undefined,
      });
      toast.success(tr("Announcement published", "تم نشر الإعلان"));
      resetAnnouncementForm();
      loadAnnouncements();
    } catch {
      toast.error(tr("Could not publish. Please try again.", "تعذّر النشر. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  }

  async function updateAnnouncement() {
    if (!editingAnnouncementId || !formTitle.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/api/announcements/${editingAnnouncementId}`, {
        title: formTitle.trim(),
        body: formBody.trim() || undefined,
        imageUrl: formImageUrl.trim() || null,
        priority: formPriority,
        isPinned: formPinned,
        expiresAt: formExpires || null,
      });
      toast.success(tr("Announcement updated", "تم تحديث الإعلان"));
      resetAnnouncementForm();
      loadAnnouncements();
    } catch {
      toast.error(tr("Update failed. Please try again.", "فشل التحديث. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAnnouncementImage(file: File) {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", `announcement-${Date.now()}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.data?.url) {
        setFormImageUrl(body.data.url);
      } else {
        toast.error(body?.error ?? tr("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
      }
    } catch {
      toast.error(tr("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
    } finally {
      setUploadingImage(false);
    }
  }

  async function deleteAnnouncement(id: number) {
    const announcement = announcements.find((a) => a.announcementId === id);
    const confirmMsg = lang === "ar"
      ? `هل تريد حذف الإعلان "${announcement?.title ?? ""}"؟`
      : `Delete announcement "${announcement?.title ?? ""}"?`;
    if (!window.confirm(confirmMsg)) return;
    setDeleting(id);
    try {
      await api.delete(`/api/announcements/${id}`);
      void loadAnnouncements();
      toast.success(tr("Announcement deleted", "تم حذف الإعلان"));
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    } finally {
      setDeleting(null);
    }
  }

  function getAnnouncementsCsv() {
    return toCsv(
      ["title", "body", "imageUrl", "priority", "isPinned", "expiresAt"],
      announcements.map((announcement) => [
        announcement.title,
        announcement.body ?? "",
        announcement.imageUrl ?? "",
        announcement.priority,
        announcement.isPinned,
        announcement.expiresAt ?? "",
      ]),
    );
  }

  function getAnnouncementsTemplateCsv() {
    return toCsv(
      ["title", "body", "imageUrl", "priority", "isPinned", "expiresAt"],
      [["Weekly update", "Short summary for members", "", "medium", false, ""]],
    );
  }

  async function importAnnouncements(rows: Record<string, string>[]) {
    for (const row of rows) {
      if (!row.title?.trim()) continue;
      await api.post("/api/announcements", {
        title: row.title.trim(),
        body: row.body?.trim() || undefined,
        imageUrl: row.imageUrl?.trim() || undefined,
        priority: (row.priority?.trim() || "medium") as "low" | "medium" | "high" | "critical",
        isPinned: parseBoolean(row.isPinned ?? ""),
        expiresAt: row.expiresAt?.trim() || undefined,
      });
    }
    loadAnnouncements();
  }

  return (
    <div>
      <DashboardHeader
        title={tr("Executive Dashboard", "لوحة التنفيذيين")}
        description={tr("Track committee load, requests, and operational signals across the club. Homepage sections now live in the Content dashboard.", "تابع ضغط اللجان والطلبات والإشارات التشغيلية على مستوى النادي. أقسام الصفحة الرئيسية صارت الآن داخل لوحة المحتوى.")}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Shield} label={tr("Committee Leaders", "قادة اللجان")} value={totalLeaders} />
        <StatCard icon={ClipboardList} label={tr("Open Service Requests", "طلبات الخدمات المفتوحة")} value={openServiceRequests} color="text-sky-300" />
        <StatCard icon={Users} label={tr("Pending Finance Requests", "طلبات المالية المعلقة")} value={pendingFinanceRequests} color="text-amber-300" />
        <StatCard icon={Megaphone} label={tr("Content Requests", "طلبات المحتوى")} value={pendingAnnouncementRequests} color="text-primary" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_24rem]">
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">Committee Oversight</h3>
              <p className="mt-1 text-sm text-muted">Live committee cards built from member rosters, service requests, finance queues, and announcement requests.</p>
            </div>
            <button onClick={() => void loadExecutiveOverview()} className="btn-secondary px-4 py-2 text-xs">
              Refresh board
            </button>
          </div>

          {loadingOverview ? (
            <div className="glass-card flex min-h-[260px] items-center justify-center">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {departmentCards.map((card, index) => (
                <motion.div
                  key={card.department.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="glass-card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{card.department.slug}</p>
                      <h4 className="mt-2 text-lg font-semibold text-foreground">{card.department.name}</h4>
                      <p className="mt-1 text-sm text-muted">Lead: {card.leaderName}</p>
                    </div>
                    <span className="badge bg-surface-elevated text-muted border-border">
                      {card.activeMembers} members
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-surface-elevated/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Leadership</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{card.leadershipMembers.length}</p>
                      <p className="mt-1 text-xs text-muted">
                        {card.viceLeaders.length} vice · {card.subLeaders.length} sub
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-elevated/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Finance</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{card.openFinance.length}</p>
                      <p className="mt-1 text-xs text-muted">Open requests</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-elevated/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Operations</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{card.openService.length}</p>
                      <p className="mt-1 text-xs text-muted">
                        {card.outboundService.length} out · {card.inboxService.length} in
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-elevated/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Budget</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{formatMoney(card.department.remaining)}</p>
                      <p className="mt-1 text-xs text-muted">Remaining</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-border bg-surface/25 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Current Activity</p>
                      {card.latestWork.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {card.latestWork.map((item) => (
                            <p key={item} className="text-sm text-foreground">{item}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted">No active queue items right now.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-border bg-surface/25 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Feedback / Notes</p>
                      {card.feedback.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {card.feedback.slice(0, 2).map((note) => (
                            <p key={note} className="text-sm text-muted">{note}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted">No written feedback has been attached to the current queues.</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {card.openFinance.slice(0, 2).map((request) => (
                        <span key={`finance-${request.requestId}`} className={FINANCE_STATUS_TONE[request.status]}>
                          {request.status.replace("_", " ")} · {request.title}
                        </span>
                      ))}
                      {card.openService.slice(0, 2).map((request) => (
                        <span key={`service-${request.requestId}`} className={SERVICE_STATUS_TONE[request.status]}>
                          {request.status.replace("_", " ")} · {request.title}
                        </span>
                      ))}
                      {card.pendingAnnouncements.slice(0, 1).map((request) => (
                        <span key={`announcement-${request.requestId}`} className="badge bg-primary/10 text-primary border-primary/20">
                          media queue · {request.title}
                        </span>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-border bg-surface/25 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Linked Requests</p>
                      {card.openService.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {card.openService.slice(0, 3).map((request) => (
                            <p key={`linked-${request.requestId}`} className="text-sm text-muted">
                              {request.sourceDepartmentName ?? request.sourceDepartmentSlug} {"->"} {request.targetDepartmentName ?? request.targetDepartmentSlug}: <span className="text-foreground">{request.title}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted">No active cross-department links.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground flex items-center gap-2">
                <Bell size={14} />
                Announcements
              </h3>
              <button
                onClick={() => {
                  if (showForm && editingAnnouncementId === null) {
                    setShowForm(false);
                    return;
                  }
                  resetAnnouncementForm();
                  setShowForm(true);
                }}
                className="btn-primary px-2.5 py-1.5 text-xs inline-flex items-center gap-1"
              >
                <Plus size={12} />
                {showForm && editingAnnouncementId === null ? "Close" : "New"}
              </button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card mb-3 space-y-3 overflow-hidden p-4"
                >
                  <input
                    className="dashboard-field"
                    placeholder="Title *"
                    value={formTitle}
                    onChange={(event) => setFormTitle(event.target.value)}
                  />
                  <textarea
                    className="dashboard-field resize-none"
                    placeholder="Body (optional)"
                    rows={3}
                    value={formBody}
                    onChange={(event) => setFormBody(event.target.value)}
                  />
                  <div className="space-y-2">
                    <input
                      className="dashboard-field"
                      placeholder="Image URL (optional)"
                      value={formImageUrl}
                      onChange={(event) => setFormImageUrl(event.target.value)}
                    />
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
                      <Upload size={12} />
                      {uploadingImage ? "Uploading image…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadAnnouncementImage(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="dashboard-select"
                      value={formPriority}
                      onChange={(event) => setFormPriority(event.target.value as typeof formPriority)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <input
                      type="date"
                      className="dashboard-field"
                      value={formExpires}
                      onChange={(event) => setFormExpires(event.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={formPinned}
                      onChange={(event) => setFormPinned(event.target.checked)}
                      className="accent-primary"
                    />
                    Pin to top
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={editingAnnouncementId ? updateAnnouncement : createAnnouncement}
                      disabled={saving || !formTitle.trim()}
                      className="btn-primary flex-1 px-3 py-1.5 text-xs inline-flex items-center justify-center gap-1.5"
                    >
                      {saving && <Loader2 size={11} className="animate-spin" />}
                      {editingAnnouncementId ? "Save Changes" : "Post"}
                    </button>
                    <button onClick={resetAnnouncementForm} className="btn-secondary flex-1 px-3 py-1.5 text-xs">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              {announcements.length === 0 && (
                <div className="glass-card p-4 text-center text-sm text-muted">No announcements yet.</div>
              )}
              {announcements.map((announcement, index) => (
                <motion.div
                  key={announcement.announcementId}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="glass-card p-3"
                >
                  <div className="flex items-start gap-2">
                    {announcement.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={announcement.imageUrl} alt={announcement.title} className="h-12 w-12 rounded-lg object-cover border border-border shrink-0" />
                    )}
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRIORITY_COLORS[announcement.priority] }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{announcement.title}</p>
                      {announcement.body && <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">{announcement.body}</p>}
                      <p className="mt-0.5 text-[10px] text-muted/60">
                        <MemberLink memberId={announcement.authorId} name={announcement.authorName ?? "Unknown"} underline={false} className="text-muted/60" />
                        {" · "}
                        {fmtDate(announcement.createdAt)}
                        {announcement.isPinned && <span className="ms-1 text-primary">· pinned</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => startEditingAnnouncement(announcement)}
                      disabled={saving}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(announcement.announcementId)}
                      disabled={deleting === announcement.announcementId}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-error/10 hover:text-error"
                    >
                      {deleting === announcement.announcementId ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Announcement Tools</h3>
              <p className="mt-1 text-xs text-muted">Bulk import, export, or hand off the announcement queue from here.</p>
            </div>
            <ImportExportToolbar
              exportFilename="leaders-announcements.csv"
              templateFilename="leaders-announcements-template.csv"
              getExportCsv={getAnnouncementsCsv}
              getTemplateCsv={getAnnouncementsTemplateCsv}
              onImportRows={importAnnouncements}
              exportLabel="Export announcements"
              templateLabel="Announcement template"
              importLabel="Import announcements"
            />
          </div>

          <div className="glass-card p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Latest Content Updates</h3>
              <p className="mt-1 text-xs text-muted">Recent Content dashboard changes based on stored site-content timestamps.</p>
            </div>
            {latestContentUpdates.length === 0 ? (
              <p className="text-sm text-muted">No content updates recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {latestContentUpdates.map((row) => (
                  <div key={row.key} className="rounded-xl border border-border bg-surface-elevated/35 px-3 py-2">
                    <p className="text-xs font-medium text-foreground">{row.key}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{row.updatedAt ? fmtDate(row.updatedAt) : "No date"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
