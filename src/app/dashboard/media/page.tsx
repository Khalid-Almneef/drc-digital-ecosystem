"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DepartmentOperationsPanel } from "@/components/dashboard/DepartmentOperationsPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChangeRequestInbox } from "@/components/dashboard/ChangeRequestInbox";
import { useLang } from "@/contexts/LanguageContext";
import { useEscape } from "@/lib/hooks/useEscape";
import { useApi } from "@/lib/hooks/useApi";
import { api } from "@/lib/client";
import {
  DEFAULT_HOME_FEATURE_SPOTLIGHTS,
  DEFAULT_HOME_HERO_BANNERS,
  HomeFeatureSpotlightItem,
  HomeHeroBannerItem,
  parseCollection,
} from "@/lib/public-content";
import {
  Camera, Eye, Video, Plus, Trash2, Check, Loader2,
  Upload, Copy, ExternalLink, Send, RotateCcw, Image as ImageIcon,
  Save, Users, Inbox, Library, Settings, Briefcase,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  taskId: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo: number | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
  artifactUrl: string | null;
  artifactNotes: string | null;
  submittedAt: string | null;
  creditHours: number;
  completedAt: string | null;
  createdAt: string;
}

interface Asset {
  assetId: number;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  label: string | null;
  tags: string[] | null;
  createdAt: string;
  uploadedBy: string | null;
}

interface Member {
  memberId: number;
  fullName: string;
  avatarUrl: string | null;
  position: string;
  departmentName: string;
}

interface SocialHandles {
  x: string;
  linkedin: string;
  tiktok: string;
}

interface SocialPost {
  contentId: number;
  title: string;
  type: "post" | "story" | "reel" | "video" | "photo" | "article";
  platform: "instagram" | "twitter" | "linkedin" | "youtube" | "website" | "other" | null;
  description: string | null;
  fileUrl: string | null;
  status: "draft" | "in_review" | "scheduled" | "published" | "archived";
  scheduledDate: string | null;
  publishedDate: string | null;
  views: number;
  likes: number;
  shares: number;
  assignedTo: number | null;
  assignedToName: string | null;
}

interface AnnouncementRequest {
  requestId: number;
  title: string;
  body: string | null;
  priority: "low" | "medium" | "high" | "critical";
  requestType: "general" | "monthly_newsletter";
  status: "pending" | "published" | "rejected";
  desiredPublishDate: string | null;
  createdAt: string;
  requestedByName?: string | null;
}

const DEFAULT_SOCIAL_HANDLES: SocialHandles = {
  x: "",
  linkedin: "",
  tiktok: "",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "badge-warning", high: "badge-warning", medium: "badge-primary", low: "badge",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type TabId = "overview" | "submissions" | "library" | "assignments" | "social" | "operations" | "changeRequests";

const TABS: { id: TabId; label: string; labelAr: string; icon: React.ElementType }[] = [
  { id: "overview",      label: "Overview",        labelAr: "نظرة عامة",     icon: Eye      },
  { id: "submissions",   label: "Submissions",     labelAr: "التسليمات",     icon: Inbox    },
  { id: "library",       label: "Library",         labelAr: "المكتبة",        icon: Library  },
  { id: "assignments",   label: "Assignments",     labelAr: "المهام",         icon: Users    },
  { id: "social",        label: "Social",          labelAr: "وسائل التواصل", icon: Settings },
  { id: "operations",    label: "Operations",      labelAr: "العمليات",      icon: Briefcase },
  { id: "changeRequests",label: "Change Requests", labelAr: "طلبات التغيير",  icon: Inbox    },
];

type HomepageMediaField = {
  key: string;
  label: string;
  textarea?: boolean;
  rtl?: boolean;
  image?: boolean;
};

type HomepageMediaRow = Record<string, string>;

const HERO_BANNER_FIELDS: HomepageMediaField[] = [
  { key: "eyebrowEn", label: "Eyebrow (EN)" },
  { key: "eyebrowAr", label: "Eyebrow (AR)", rtl: true },
  { key: "titleEn", label: "Title (EN)", textarea: true },
  { key: "titleAr", label: "Title (AR)", textarea: true, rtl: true },
  { key: "descriptionEn", label: "Description (EN)", textarea: true },
  { key: "descriptionAr", label: "Description (AR)", textarea: true, rtl: true },
  { key: "imageUrl", label: "Image URL", image: true },
  { key: "href", label: "Link URL" },
  { key: "ctaEn", label: "CTA (EN)" },
  { key: "ctaAr", label: "CTA (AR)", rtl: true },
  { key: "metric", label: "Metric / proof line" },
];

const FEATURE_SPOTLIGHT_FIELDS: HomepageMediaField[] = [
  { key: "labelEn", label: "Label (EN)" },
  { key: "labelAr", label: "Label (AR)", rtl: true },
  { key: "titleEn", label: "Title (EN)", textarea: true },
  { key: "titleAr", label: "Title (AR)", textarea: true, rtl: true },
  { key: "descriptionEn", label: "Description (EN)", textarea: true },
  { key: "descriptionAr", label: "Description (AR)", textarea: true, rtl: true },
  { key: "imageUrl", label: "Image URL", image: true },
  { key: "href", label: "Link URL" },
  { key: "ctaEn", label: "CTA (EN)" },
  { key: "ctaAr", label: "CTA (AR)", rtl: true },
];

function blankHomepageItem(fields: HomepageMediaField[]) {
  return fields.reduce<HomepageMediaRow>((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});
}

function toHomepageRows<T extends object>(items: T[]): HomepageMediaRow[] {
  return items.map((item) =>
    Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]),
    ),
  );
}

function HomepageMediaEditor({
  title,
  description,
  fields,
  items,
  baseItems,
  onChange,
  onAdd,
  onRemove,
  onSave,
  onUploadImage,
  saving,
}: {
  title: string;
  description: string;
  fields: HomepageMediaField[];
  items: HomepageMediaRow[];
  baseItems: HomepageMediaRow[];
  onChange: (index: number, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  onUploadImage: (index: number, field: string, file: File) => Promise<void>;
  saving: boolean;
}) {
  const dirty = JSON.stringify(items) !== JSON.stringify(baseItems);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-muted mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdd} className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
            <Plus size={11} />
            Add item
          </button>
          <button onClick={onSave} disabled={!dirty || saving} className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-40">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Save
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-2xl border border-border bg-surface/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Item {index + 1}</p>
              <button
                onClick={() => onRemove(index)}
                disabled={items.length <= 1}
                className="p-2 rounded-lg border border-border text-muted hover:text-error hover:bg-error/10 disabled:opacity-30 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {fields.map((field) => (
                <div key={field.key} className={field.textarea ? "lg:col-span-2" : ""}>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                    {field.label}
                  </label>
                  {field.textarea ? (
                    <textarea
                      rows={3}
                      dir={field.rtl ? "rtl" : "ltr"}
                      value={item[field.key] ?? ""}
                      onChange={(e) => onChange(index, field.key, e.target.value)}
                      className="w-full text-sm bg-surface-elevated border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/40 resize-none"
                    />
                  ) : (
                    <input
                      dir={field.rtl ? "rtl" : "ltr"}
                      value={item[field.key] ?? ""}
                      onChange={(e) => onChange(index, field.key, e.target.value)}
                      className="w-full text-sm bg-surface-elevated border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/40"
                    />
                  )}
                  {field.image && (
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-muted hover:text-foreground transition-colors">
                      <Upload size={11} />
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void onUploadImage(index, field.key, file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MediaDashboard() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [tab, setTab] = useState<TabId>("overview");

  // Esc key closes the active modal

  // ── Submissions (tasks in review with artifact) ──
  const { data: submissions = [], mutate: loadSubmissions } = useApi<Task[]>("/api/tasks?department=media&status=review");
  const [reviewing, setReviewing]     = useState<number | null>(null);

  // ── Library ──
  const [assetLimit, setAssetLimit] = useState(60);
  const { data: assets = [], mutate: loadAssets } = useApi<Asset[]>(`/api/upload?mime=image&limit=${assetLimit}`);
  const [uploading, setUploading]   = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [deletingAsset, setDeletingAsset] = useState<number | null>(null);
  const [copied, setCopied]         = useState<number | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // ── Assignments (all dept tasks) ──
  const { data: tasks = [], mutate: loadTasks } = useApi<Task[]>("/api/tasks?department=media");
  const { data: members = [] } = useApi<Member[]>("/api/members?department=media");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle]     = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [newAssignee, setNewAssignee] = useState<number | "">("");
  const [newDue, setNewDue]         = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newCredits, setNewCredits] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [deletingTask, setDeletingTask] = useState<number | null>(null);

  // ── Social ──
  const { data: handlesData } = useApi<{ json: SocialHandles | null }>("/api/site-content/social.handles");
  const [handles, setHandles] = useState<SocialHandles>(DEFAULT_SOCIAL_HANDLES);
  useEffect(() => {
    if (handlesData?.json) setHandles({ ...DEFAULT_SOCIAL_HANDLES, ...handlesData.json });
  }, [handlesData]);
  const [handlesSaving, setHandlesSaving] = useState(false);
  const { data: socialQueue = [], isLoading: socialLoading, mutate: loadSocialQueue } = useApi<SocialPost[]>("/api/media");
  const { data: announcementRequests = [], isLoading: announcementRequestsLoading, mutate: loadAnnouncementRequests } = useApi<AnnouncementRequest[]>("/api/announcement-requests?scope=all");
  const [updatingAnnouncementRequest, setUpdatingAnnouncementRequest] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialDeleting, setSocialDeleting] = useState<number | null>(null);
  const [socialUpdating, setSocialUpdating] = useState<number | null>(null);

  // ── Homepage modules (server-truth via SWR; editable working copy held locally) ──
  const { data: heroBannersData, mutate: loadHeroBannersApi } = useApi<{ json: HomeHeroBannerItem[] | null }>("/api/site-content/home.heroBanners");
  const { data: featureSpotlightsData, mutate: loadFeatureSpotlightsApi } = useApi<{ json: HomeFeatureSpotlightItem[] | null }>("/api/site-content/home.featureSpotlights");
  const heroBannersBase = useMemo(
    () => toHomepageRows(parseCollection(heroBannersData?.json, DEFAULT_HOME_HERO_BANNERS)),
    [heroBannersData],
  );
  const featureSpotlightsBase = useMemo(
    () => toHomepageRows(parseCollection(featureSpotlightsData?.json, DEFAULT_HOME_FEATURE_SPOTLIGHTS)),
    [featureSpotlightsData],
  );
  const [heroBanners, setHeroBanners] = useState<HomepageMediaRow[]>(heroBannersBase);
  const [featureSpotlights, setFeatureSpotlights] = useState<HomepageMediaRow[]>(featureSpotlightsBase);
  // Sync editable copy when server data changes (initial load + post-save refetch).
  useEffect(() => { setHeroBanners(heroBannersBase); }, [heroBannersBase]);
  useEffect(() => { setFeatureSpotlights(featureSpotlightsBase); }, [featureSpotlightsBase]);
  const [homepageSaving, setHomepageSaving] = useState<Record<string, boolean>>({});
  const [socialForm, setSocialForm] = useState({
    title: "",
    type: "post" as SocialPost["type"],
    platform: "instagram" as NonNullable<SocialPost["platform"]>,
    description: "",
    fileUrl: "",
    scheduledDate: "",
    status: "draft" as SocialPost["status"],
    assignedTo: "",
  });

  useEscape(showCreate, () => setShowCreate(false));
  useEscape(showComposer, () => setShowComposer(false));

  // ─── Submission actions ────────────────────────────────────────────────────

  async function approveSubmission(taskId: number) {
    setReviewing(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status: "done" });
      toast.success(tr("Submission approved", "تم اعتماد التسليم"));
      loadSubmissions(); loadTasks();
    } catch {
      toast.error(tr("Approval failed. Please try again.", "فشل الاعتماد. حاول مرة أخرى."));
    } finally { setReviewing(null); }
  }

  async function sendBack(taskId: number) {
    setReviewing(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status: "in_progress" });
      toast.success(tr("Sent back for revision", "أُعيد للتعديل"));
      loadSubmissions(); loadTasks();
    } catch {
      toast.error(tr("Action failed. Please try again.", "فشل تنفيذ الإجراء. حاول مرة أخرى."));
    } finally { setReviewing(null); }
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async function uploadAssetAndGetUrl(file: File, label?: string) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (label?.trim()) fd.append("label", label.trim());
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? tr("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
        return undefined;
      }
      const body = await res.json().catch(() => ({}));
      toast.success(tr("Image uploaded", "تم رفع الصورة"));
      loadAssets();
      return body?.data?.url as string | undefined;
    } catch {
      toast.error(tr("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
      return undefined;
    } finally { setUploading(false); }
  }

  async function handleUpload(file: File) {
    const url = await uploadAssetAndGetUrl(file, uploadLabel);
    if (url) setUploadLabel("");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  async function copyUrl(asset: Asset) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${asset.url}`);
      setCopied(asset.assetId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(tr("Could not copy URL", "تعذّر نسخ الرابط"));
    }
  }

  async function deleteAsset(asset: Asset) {
    const confirmMsg = lang === "ar"
      ? `هل تريد حذف "${asset.label ?? asset.filename}"؟ لا يمكن التراجع.`
      : `Delete "${asset.label ?? asset.filename}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setDeletingAsset(asset.assetId);
    try {
      await api.delete(`/api/upload/${asset.assetId}`);
      void loadAssets();
      toast.success(tr("Asset deleted", "تم حذف الأصل"));
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    } finally { setDeletingAsset(null); }
  }

  async function uploadHomepageImage(
    setter: Dispatch<SetStateAction<HomepageMediaRow[]>>,
    index: number,
    field: string,
    file: File,
    label: string,
  ) {
    const url = await uploadAssetAndGetUrl(file, label);
    if (!url) return;
    setter((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: url } : item
    )));
  }

  async function saveHomepageCollection(key: "home.heroBanners" | "home.featureSpotlights", items: HomepageMediaRow[]) {
    setHomepageSaving((current) => ({ ...current, [key]: true }));
    try {
      await api.patch(`/api/site-content/${key}`, { json: items });
      if (key === "home.heroBanners") void loadHeroBannersApi();
      if (key === "home.featureSpotlights") void loadFeatureSpotlightsApi();
      toast.success(tr("Homepage content saved", "تم حفظ محتوى الصفحة الرئيسية"));
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setHomepageSaving((current) => ({ ...current, [key]: false }));
    }
  }

  // ─── Create task ──────────────────────────────────────────────────────────

  async function createTask() {
    if (!newTitle.trim()) return;
    setTaskSaving(true);
    try {
      await api.post("/api/tasks", {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        assignedTo: newAssignee || undefined,
        dueDate: newDue || undefined,
        priority: newPriority,
        creditHours: newCredits ? Number(newCredits) : undefined,
      });
      setNewTitle(""); setNewDesc(""); setNewAssignee(""); setNewDue("");
      setNewPriority("medium"); setNewCredits(""); setShowCreate(false);
      toast.success(tr("Task created", "تم إنشاء المهمة"));
      loadTasks();
    } catch {
      toast.error(tr("Create failed. Please try again.", "فشل الإنشاء. حاول مرة أخرى."));
    } finally { setTaskSaving(false); }
  }

  async function deleteTask(task: Task) {
    const confirmMsg = lang === "ar"
      ? `هل تريد حذف المهمة "${task.title}"؟`
      : `Delete task "${task.title}"?`;
    if (!window.confirm(confirmMsg)) return;
    setDeletingTask(task.taskId);
    try {
      await api.delete(`/api/tasks/${task.taskId}`);
      void loadTasks();
      void loadSubmissions();
      toast.success(tr("Task deleted", "تم حذف المهمة"));
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    } finally { setDeletingTask(null); }
  }

  // ─── Save social handles ──────────────────────────────────────────────────

  async function saveHandles() {
    setHandlesSaving(true);
    try {
      await api.patch("/api/site-content/social.handles", { json: handles });
      toast.success(tr("Social handles saved", "تم حفظ روابط التواصل"));
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally { setHandlesSaving(false); }
  }

  async function createSocialPost() {
    if (!socialForm.title.trim()) return;
    setSocialSaving(true);
    try {
      await api.post("/api/media", {
        title: socialForm.title.trim(),
        type: socialForm.type,
        platform: socialForm.platform,
        description: socialForm.description.trim() || undefined,
        fileUrl: socialForm.fileUrl.trim() || undefined,
        scheduledDate: socialForm.scheduledDate || undefined,
        status: socialForm.status,
        assignedTo: socialForm.assignedTo ? Number(socialForm.assignedTo) : undefined,
      });
      setSocialForm({
        title: "",
        type: "post",
        platform: "instagram",
        description: "",
        fileUrl: "",
        scheduledDate: "",
        status: "draft",
        assignedTo: "",
      });
      setShowComposer(false);
      toast.success(tr("Post created", "تم إنشاء المنشور"));
      loadSocialQueue();
    } catch {
      toast.error(tr("Create failed. Please try again.", "فشل الإنشاء. حاول مرة أخرى."));
    } finally {
      setSocialSaving(false);
    }
  }

  async function updateSocialStatus(post: SocialPost, status: SocialPost["status"]) {
    setSocialUpdating(post.contentId);
    try {
      await api.patch(`/api/media/${post.contentId}`, { status });
      void loadSocialQueue();
      toast.success(tr("Status updated", "تم تحديث الحالة"));
    } catch {
      toast.error(tr("Update failed. Please try again.", "فشل التحديث. حاول مرة أخرى."));
    } finally {
      setSocialUpdating(null);
    }
  }

  async function deleteSocialPost(post: SocialPost) {
    const confirmMsg = lang === "ar"
      ? `هل تريد حذف المنشور "${post.title}"؟`
      : `Delete post "${post.title}"?`;
    if (!window.confirm(confirmMsg)) return;
    setSocialDeleting(post.contentId);
    try {
      await api.delete(`/api/media/${post.contentId}`);
      void loadSocialQueue();
      toast.success(tr("Post deleted", "تم حذف المنشور"));
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    } finally {
      setSocialDeleting(null);
    }
  }

  async function handleAnnouncementRequest(requestId: number, status: "published" | "rejected") {
    if (status === "rejected") {
      const confirmMsg = tr("Reject this announcement request?", "رفض طلب الإعلان؟");
      if (!window.confirm(confirmMsg)) return;
    }
    setUpdatingAnnouncementRequest(requestId);
    try {
      await api.patch(`/api/announcement-requests/${requestId}`, { status });
      void loadAnnouncementRequests();
      toast.success(status === "published"
        ? tr("Announcement published", "تم نشر الإعلان")
        : tr("Request rejected", "تم رفض الطلب"));
    } catch {
      toast.error(tr("Update failed. Please try again.", "فشل التحديث. حاول مرة أخرى."));
    } finally {
      setUpdatingAnnouncementRequest(null);
    }
  }

  // ─── Derived stats ─────────────────────────────────────────────────────────

  const thisMonth = new Date().getMonth();
  const thisYear  = new Date().getFullYear();
  const doneThisMonth = tasks.filter((t) => {
    if (t.status !== "done" || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  const activeTasks = tasks.filter((t) => t.status !== "done").length;
  const scheduledPosts = socialQueue.filter((item) => item.status === "scheduled").length;
  const publishedPosts = socialQueue.filter((item) => item.status === "published").length;
  const pendingAnnouncementRequests = announcementRequests.filter((request) => request.status === "pending").length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <DashboardHeader
        title={tr("Media", "الإعلام")}
        description={tr(
          "Content submissions, media library, assignments, and social feed management.",
          "تسليم المحتوى، مكتبة الوسائط، توزيع المهام، وإدارة موجز التواصل الاجتماعي.",
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Inbox}    label={tr("Pending Review", "قيد المراجعة")}        value={submissions.length} onClick={() => setTab("submissions")} />
        <StatCard icon={Check}    label={tr("Approved This Month", "اعتُمدت هذا الشهر")} value={doneThisMonth}     onClick={() => setTab("submissions")} />
        <StatCard icon={ImageIcon} label={tr("Library Assets", "أصول المكتبة")}        value={assets.length}     onClick={() => setTab("library")} />
        <StatCard icon={Camera}   label={tr("Active Assignments", "المهام النشطة")}    value={activeTasks}        onClick={() => setTab("assignments")} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 bg-surface-elevated rounded-xl w-fit" role="tablist" aria-label={tr("Media sections", "أقسام الإعلام")}>
        {TABS.map(({ id, label, labelAr, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            role="tab"
            aria-selected={tab === id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === id ? "bg-primary text-background" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon size={13} />
            {lang === "ar" ? labelAr : label}
            {id === "submissions" && submissions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-warning text-background text-[9px] font-bold flex items-center justify-center">
                {submissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent submissions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Pending Submissions</h3>
            {submissions.length === 0 ? (
              <div className="glass-card p-6 text-center text-sm text-muted">No pending submissions.</div>
            ) : (
              <div className="space-y-2">
                {submissions.slice(0, 5).map((t, i) => (
                  <motion.div key={t.taskId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="glass-card p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-[10px] text-muted">{t.assigneeName ?? "Unassigned"} · {t.submittedAt ? fmtDate(t.submittedAt) : "—"}</p>
                    </div>
                    <button onClick={() => setTab("submissions")} className="btn-primary px-2 py-1 text-[10px] shrink-0">Review</button>
                  </motion.div>
                ))}
                {submissions.length > 5 && (
                  <button onClick={() => setTab("submissions")} className="text-xs text-primary hover:underline w-full text-center py-1">
                    +{submissions.length - 5} more
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Recent library uploads */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Recent Library Uploads</h3>
            {assets.length === 0 ? (
              <div className="glass-card p-6 text-center text-sm text-muted">No assets uploaded yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {assets.slice(0, 6).map((a) => (
                  <div key={a.assetId} className="aspect-square rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.label ?? a.filename} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Submissions ── */}
      {tab === "submissions" && (
        <div>
          <p className="text-xs text-muted mb-4">Tasks submitted for your review. Approve to mark done and grant credit hours.</p>
          {submissions.length === 0 ? (
            <div className="glass-card p-10 text-center text-sm text-muted">No submissions pending review.</div>
          ) : (
            <div className="space-y-3">
              {submissions.map((t, i) => (
                <motion.div key={t.taskId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Artifact preview */}
                  {t.artifactUrl && (
                    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border bg-surface-elevated">
                      {t.artifactUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.artifactUrl} alt="artifact" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video size={20} className="text-primary/60" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-foreground">{t.title}</span>
                      <span className={`badge ${PRIORITY_COLORS[t.priority] ?? "badge"} text-[10px]`}>{t.priority}</span>
                      {t.creditHours > 0 && (
                        <span className="badge badge-success text-[10px]">{t.creditHours}h credit</span>
                      )}
                    </div>
                    {t.artifactNotes && <p className="text-xs text-muted mb-1 line-clamp-2">{t.artifactNotes}</p>}
                    <p className="text-[10px] text-muted">
                      By <span className="text-foreground">{t.assigneeName ?? "Unknown"}</span>
                      {t.submittedAt ? ` · submitted ${fmtDate(t.submittedAt)}` : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {t.artifactUrl && (
                      <a href={t.artifactUrl} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
                        title="Open artifact">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => sendBack(t.taskId)}
                      disabled={reviewing === t.taskId}
                      className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                      title="Send back for revision"
                    >
                      {reviewing === t.taskId ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                      Send back
                    </button>
                    <button
                      onClick={() => approveSubmission(t.taskId)}
                      disabled={reviewing === t.taskId}
                      className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                    >
                      {reviewing === t.taskId ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Approve
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Library ── */}
      {tab === "library" && (
        <div>
          {/* Upload area */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="glass-card border-dashed border-2 border-border hover:border-primary/40 transition-colors p-8 mb-6 flex flex-col items-center gap-3 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={24} className="text-primary animate-spin" />
            ) : (
              <Upload size={24} className="text-muted" />
            )}
            <p className="text-sm text-muted text-center">
              {uploading ? "Uploading…" : "Drop an image here, or click to select"}
            </p>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                placeholder="Label (optional)"
                className="px-2 py-1 text-xs rounded-lg bg-surface-elevated border border-border text-foreground placeholder:text-muted/40 focus:outline-none w-40"
              />
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={uploading}
                className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
              >
                <Upload size={11} />
                Upload
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFileChange} />
          </div>

          {/* Asset grid */}
          {assets.length === 0 ? (
            <div className="text-center text-sm text-muted py-8">No assets yet. Upload your first image above.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {assets.map((asset, i) => (
                <motion.div key={asset.assetId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="group glass-card p-2 flex flex-col gap-2">
                  <div className="aspect-square rounded-md overflow-hidden bg-surface-elevated">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.label ?? asset.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-foreground truncate">{asset.label ?? asset.filename}</p>
                    <p className="text-[9px] text-muted">{fmtSize(asset.sizeBytes)}{asset.uploadedBy ? ` · ${asset.uploadedBy}` : ""}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyUrl(asset)}
                      className="flex-1 py-1 text-[10px] rounded bg-surface-elevated hover:bg-primary/10 hover:text-primary text-muted transition-colors flex items-center justify-center gap-0.5"
                      title="Copy URL"
                    >
                      {copied === asset.assetId ? <Check size={10} /> : <Copy size={10} />}
                      {copied === asset.assetId ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={() => deleteAsset(asset)}
                      disabled={deletingAsset === asset.assetId}
                      className="p-1 rounded bg-surface-elevated hover:bg-error/10 hover:text-error text-muted transition-colors"
                      title="Delete"
                    >
                      {deletingAsset === asset.assetId ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {assets.length >= assetLimit && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setAssetLimit((current) => current + 60)}
                className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
              >
                {tr("Load more", "تحميل المزيد")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Assignments ── */}
      {tab === "assignments" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted">Create and track work assigned to media members.</p>
            <button onClick={() => setShowCreate((v) => !v)} className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
              <Plus size={12} />
              New Task
            </button>
          </div>

          {/* Create form */}
          <AnimatePresence>
            {showCreate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4 mb-4 space-y-3 overflow-hidden">
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title *"
                  className="w-full text-sm bg-surface-elevated border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50" />
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                  className="w-full text-xs bg-surface-elevated border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 resize-none" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value ? Number(e.target.value) : "")}
                    className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50 col-span-2 sm:col-span-1">
                    <option value="">Assignee…</option>
                    {members.map((m) => <option key={m.memberId} value={m.memberId}>{m.fullName}</option>)}
                  </select>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as typeof newPriority)}
                    className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
                    className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                    title="Due date" />
                  <input type="number" min={0} step={0.5} value={newCredits} onChange={(e) => setNewCredits(e.target.value)}
                    placeholder="Credit hrs"
                    className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50" />
                </div>
                <div className="flex gap-2">
                  <button onClick={createTask} disabled={taskSaving || !newTitle.trim()}
                    className="btn-primary px-3 py-1.5 text-xs flex-1 inline-flex items-center justify-center gap-1.5">
                    {taskSaving && <Loader2 size={11} className="animate-spin" />}
                    Create
                  </button>
                  <button onClick={() => setShowCreate(false)} className="btn-secondary px-3 py-1.5 text-xs flex-1">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Kanban columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["todo", "in_progress", "review"] as const).map((status) => {
              const colTasks = tasks.filter((t) => t.status === status);
              const statusLabel = status === "in_progress" ? "In Progress" : status === "todo" ? "To Do" : "In Review";
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{statusLabel}</h4>
                    <span className="w-5 h-5 rounded-full bg-surface-elevated text-muted text-[9px] font-bold flex items-center justify-center">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((t) => (
                      <div key={t.taskId} className="glass-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-foreground leading-snug">{t.title}</p>
                          <button onClick={() => deleteTask(t)} disabled={deletingTask === t.taskId}
                            className="shrink-0 p-1 rounded hover:bg-error/10 text-muted hover:text-error transition-colors">
                            {deletingTask === t.taskId ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className={`badge ${PRIORITY_COLORS[t.priority]} text-[9px]`}>{t.priority}</span>
                          {t.creditHours > 0 && <span className="badge badge-success text-[9px]">{t.creditHours}h</span>}
                        </div>
                        <p className="text-[10px] text-muted mt-1.5">
                          {t.assigneeName ?? "Unassigned"}
                          {t.dueDate ? ` · due ${fmtDate(t.dueDate)}` : ""}
                        </p>
                        {status === "review" && t.artifactUrl && (
                          <div className="flex gap-1.5 mt-2">
                            <a href={t.artifactUrl} target="_blank" rel="noopener noreferrer"
                              className="btn-secondary px-2 py-0.5 text-[10px] inline-flex items-center gap-1">
                              <ExternalLink size={9} /> View
                            </a>
                            <button onClick={() => approveSubmission(t.taskId)} disabled={reviewing === t.taskId}
                              className="btn-primary px-2 py-0.5 text-[10px] inline-flex items-center gap-1">
                              {reviewing === t.taskId ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />} Approve
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-[10px] text-muted/50 text-center py-4 border border-dashed border-border rounded-lg">Empty</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "operations" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <DepartmentOperationsPanel departmentSlug="media" title="Media budget, procurement, and design request inbox" />
        </motion.div>
      )}

      {tab === "changeRequests" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <ChangeRequestInbox />
        </motion.div>
      )}

      {/* ── Social ── */}
      {tab === "social" && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <div className="max-w-3xl">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Homepage Publishing Surfaces</h3>
              <p className="text-sm text-muted mt-1">
                These modules control the homepage hero and featured story blocks. Media can update visuals and copy here without touching code.
              </p>
            </div>
          </div>

          <HomepageMediaEditor
            title="Hero Banners"
            description="Large visual cards shown in the homepage hero. Use strong photography, short headlines, and a clear CTA."
            fields={HERO_BANNER_FIELDS}
            items={heroBanners}
            baseItems={heroBannersBase}
            onChange={(index, field, value) => setHeroBanners((current) => current.map((item, itemIndex) => (
              itemIndex === index ? { ...item, [field]: value } : item
            )))}
            onAdd={() => setHeroBanners((current) => [...current, blankHomepageItem(HERO_BANNER_FIELDS)])}
            onRemove={(index) => setHeroBanners((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            onSave={() => saveHomepageCollection("home.heroBanners", heroBanners)}
            onUploadImage={(index, field, file) => uploadHomepageImage(setHeroBanners, index, field, file, `hero-banner-${index + 1}`)}
            saving={Boolean(homepageSaving["home.heroBanners"])}
          />

          <HomepageMediaEditor
            title="Homepage Story Blocks"
            description="Image-backed sections that explain what the club builds, teaches, and publishes."
            fields={FEATURE_SPOTLIGHT_FIELDS}
            items={featureSpotlights}
            baseItems={featureSpotlightsBase}
            onChange={(index, field, value) => setFeatureSpotlights((current) => current.map((item, itemIndex) => (
              itemIndex === index ? { ...item, [field]: value } : item
            )))}
            onAdd={() => setFeatureSpotlights((current) => [...current, blankHomepageItem(FEATURE_SPOTLIGHT_FIELDS)])}
            onRemove={(index) => setFeatureSpotlights((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            onSave={() => saveHomepageCollection("home.featureSpotlights", featureSpotlights)}
            onUploadImage={(index, field, file) => uploadHomepageImage(setFeatureSpotlights, index, field, file, `feature-spotlight-${index + 1}`)}
            saving={Boolean(homepageSaving["home.featureSpotlights"])}
          />

          {/* Handles settings */}
          <div className="max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Social Handles</h3>
              <button onClick={saveHandles} disabled={handlesSaving} className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
                {handlesSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Save
              </button>
            </div>
            <div className="glass-card p-4 space-y-4">
              {[
                { key: "x" as const,        label: "X (Twitter) URL", placeholder: "https://x.com/drcksu" },
                { key: "linkedin" as const, label: "LinkedIn URL",    placeholder: "https://www.linkedin.com/company/..." },
                { key: "tiktok" as const,   label: "TikTok URL",      placeholder: "https://www.tiktok.com/@drc_ksu" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    value={handles[key]}
                    onChange={(e) => setHandles((h) => ({ ...h, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <StatCard icon={Send} label="Scheduled Posts" value={scheduledPosts} />
              <StatCard icon={Check} label="Published Items" value={publishedPosts} />
              <StatCard icon={Library} label="Reusable Assets" value={assets.length} />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">HR Announcement Requests</h3>
                  <p className="text-xs text-muted mt-1">Requests from HR for monthly newsletters or member-facing announcements.</p>
                </div>
                <span className="badge badge-warning">{pendingAnnouncementRequests} pending</span>
              </div>

              {announcementRequestsLoading ? (
                <div className="glass-card p-6 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-muted" />
                </div>
              ) : announcementRequests.length === 0 ? (
                <div className="glass-card p-6 text-sm text-muted">No announcement requests in the queue.</div>
              ) : (
                <div className="space-y-3">
                  {announcementRequests.map((request) => (
                    <div key={request.requestId} className="glass-card p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{request.title}</p>
                            <span className={`badge ${
                              request.status === "published"
                                ? "badge-success"
                                : request.status === "rejected"
                                  ? "badge-error"
                                  : "badge-warning"
                            }`}>
                              {request.status}
                            </span>
                            <span className="badge bg-surface-elevated text-muted border-border">
                              {request.requestType === "monthly_newsletter" ? "Monthly Newsletter" : "General"}
                            </span>
                          </div>
                          {request.body && <p className="mt-2 text-sm leading-6 text-muted">{request.body}</p>}
                          <p className="mt-2 text-[11px] text-muted">
                            {request.requestedByName ?? "HR"} · {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {request.desiredPublishDate ? ` · target ${request.desiredPublishDate}` : ""}
                          </p>
                        </div>
                        {request.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAnnouncementRequest(request.requestId, "rejected")}
                              disabled={updatingAnnouncementRequest === request.requestId}
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleAnnouncementRequest(request.requestId, "published")}
                              disabled={updatingAnnouncementRequest === request.requestId}
                              className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                            >
                              {updatingAnnouncementRequest === request.requestId ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                              Publish
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Social Queue</h3>
                <p className="text-xs text-muted mt-1">Use uploaded asset URLs to prepare posts, schedule publishing, and track what is live.</p>
              </div>
              <button onClick={() => setShowComposer((v) => !v)} className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
                <Plus size={12} />
                New Social Item
              </button>
            </div>

            <AnimatePresence>
              {showComposer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-4 mb-4 overflow-hidden space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={socialForm.title}
                      onChange={(e) => setSocialForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Post title *"
                      className="w-full text-sm bg-surface-elevated border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50"
                    />
                    <input
                      value={socialForm.fileUrl}
                      onChange={(e) => setSocialForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                      placeholder="Asset URL from library or content tab"
                      className="w-full text-sm bg-surface-elevated border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <textarea
                    value={socialForm.description}
                    onChange={(e) => setSocialForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Caption, post summary, or publishing notes"
                    rows={2}
                    className="w-full text-xs bg-surface-elevated border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 resize-none"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <select
                      value={socialForm.type}
                      onChange={(e) => setSocialForm((prev) => ({ ...prev, type: e.target.value as SocialPost["type"] }))}
                      className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                    >
                      {["post", "story", "reel", "video", "photo", "article"].map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <select
                      value={socialForm.platform}
                      onChange={(e) => setSocialForm((prev) => ({ ...prev, platform: e.target.value as NonNullable<SocialPost["platform"]> }))}
                      className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                    >
                      {["instagram", "twitter", "linkedin", "youtube", "website", "other"].map((platform) => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={socialForm.scheduledDate}
                      onChange={(e) => setSocialForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                      className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                    />
                    <select
                      value={socialForm.status}
                      onChange={(e) => setSocialForm((prev) => ({ ...prev, status: e.target.value as SocialPost["status"] }))}
                      className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                    >
                      {["draft", "in_review", "scheduled", "published"].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <select
                      value={socialForm.assignedTo}
                      onChange={(e) => setSocialForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                      className="text-xs bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                    >
                      <option value="">Assignee…</option>
                      {members.map((member) => (
                        <option key={member.memberId} value={member.memberId}>{member.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createSocialPost} disabled={socialSaving || !socialForm.title.trim()} className="btn-primary px-3 py-1.5 text-xs flex-1 inline-flex items-center justify-center gap-1.5">
                      {socialSaving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      Create Queue Item
                    </button>
                    <button onClick={() => setShowComposer(false)} className="btn-secondary px-3 py-1.5 text-xs flex-1">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {socialLoading ? (
              <div className="glass-card p-8 text-center text-sm text-muted">
                <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                Loading social queue…
              </div>
            ) : socialQueue.length === 0 ? (
              <div className="glass-card p-8 text-center text-sm text-muted">
                No queued social content yet.
              </div>
            ) : (
              <div className="space-y-3">
                {socialQueue.map((item) => (
                  <div key={item.contentId} className="glass-card p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                    {item.fileUrl ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-surface-elevated shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-border bg-surface-elevated shrink-0 flex items-center justify-center text-muted">
                        <Send size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <span className="badge text-[10px]">{item.type}</span>
                        <span className="badge badge-primary text-[10px]">{item.platform ?? "other"}</span>
                        <span className={`badge text-[10px] ${
                          item.status === "published"
                            ? "badge-success"
                            : item.status === "scheduled"
                              ? "badge-info"
                              : item.status === "archived"
                                ? "bg-surface-elevated text-muted border-border"
                                : "badge-warning"
                        }`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      {item.description && <p className="text-xs text-muted line-clamp-2 mb-1">{item.description}</p>}
                      <p className="text-[10px] text-muted">
                        {item.assignedToName ?? "Unassigned"}
                        {item.scheduledDate ? ` · scheduled ${fmtDate(item.scheduledDate)}` : ""}
                        {item.publishedDate ? ` · published ${fmtDate(item.publishedDate)}` : ""}
                      </p>
                      {item.status === "published" && (
                        <p className="text-[10px] text-muted mt-1">
                          {item.views} views · {item.likes} likes · {item.shares} shares
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.fileUrl && (
                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary px-2 py-1 text-[10px] inline-flex items-center gap-1">
                          <ExternalLink size={10} />
                          Asset
                        </a>
                      )}
                      {item.status !== "published" && (
                        <button onClick={() => updateSocialStatus(item, "published")} disabled={socialUpdating === item.contentId} className="btn-primary px-2 py-1 text-[10px] inline-flex items-center gap-1">
                          {socialUpdating === item.contentId ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                          Publish
                        </button>
                      )}
                      {item.status === "draft" && (
                        <button onClick={() => updateSocialStatus(item, "scheduled")} disabled={socialUpdating === item.contentId} className="btn-secondary px-2 py-1 text-[10px]">
                          Schedule
                        </button>
                      )}
                      {item.status !== "archived" && (
                        <button onClick={() => updateSocialStatus(item, "archived")} disabled={socialUpdating === item.contentId} className="btn-secondary px-2 py-1 text-[10px]">
                          Archive
                        </button>
                      )}
                      <button onClick={() => deleteSocialPost(item)} disabled={socialDeleting === item.contentId} className="p-2 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors">
                        {socialDeleting === item.contentId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="glass-card p-6 text-sm text-muted">
              <p className="font-medium text-foreground mb-1">Integration note</p>
              <p className="text-xs">This queue is ready in mock mode now. Direct posting to Instagram, X, or YouTube should be added later with real API credentials and publishing approval rules.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
