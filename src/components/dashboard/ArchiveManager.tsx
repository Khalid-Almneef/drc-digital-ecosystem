"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  Wrench,
  X,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { ImportExportToolbar } from "@/components/dashboard/ImportExportToolbar";
import { ImageUrlInput } from "@/components/dashboard/ImageUrlInput";
import { api } from "@/lib/client";
import { parseBoolean, toCsv } from "@/lib/csv";
import {
  archiveStateFromEventDates,
  archiveStateFromProjectStatus,
  eventArchiveSection,
  moveArrayItem,
  normalizeArchiveConfig,
  sortArchiveItems,
  type ArchiveConfig,
  type ArchiveSectionKey,
} from "@/lib/project-archive";

type ProjectStatus = "planning" | "in_progress" | "testing" | "completed" | "archived";
type ArchiveKind = "project" | "event" | "competition";

interface ProjectRecord {
  projectId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  githubUrl: string | null;
  category: string | null;
  status: ProjectStatus;
  techStack: string[] | null;
  applicationRoles: string[];
  applicationsEnabled: boolean;
}

interface EventRecord {
  eventId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: "workshop" | "competition" | "meetup" | "general";
  category: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  isPublished: boolean;
}

interface ArchiveEntry {
  id: number;
  kind: ArchiveKind;
  section: ArchiveSectionKey;
  title: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  state: "upcoming" | "live" | "completed";
  statusLabel: string;
  trackHref?: string;
  project?: ProjectRecord;
  event?: EventRecord;
}

interface ArchiveEditorValues {
  kind: ArchiveKind;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  galleryUrls: string;
  githubUrl: string;
  techStack: string;
  status: ProjectStatus;
  startTime: string;
  endTime: string;
  location: string;
  isPublished: boolean;
  applicationsEnabled: boolean;
  applicationRoles: string;
}

const EMPTY_VALUES: ArchiveEditorValues = {
  kind: "project",
  title: "",
  description: "",
  imageUrl: "",
  category: "",
  galleryUrls: "",
  githubUrl: "",
  techStack: "",
  status: "planning",
  startTime: "",
  endTime: "",
  location: "",
  isPublished: true,
  applicationsEnabled: false,
  applicationRoles: "",
};

function sectionLabel(section: ArchiveSectionKey) {
  if (section === "projects") return "Projects";
  if (section === "competitions") return "Competitions";
  return "Events";
}

function kindLabel(kind: ArchiveKind) {
  if (kind === "project") return "Project";
  if (kind === "competition") return "Competition";
  return "Event";
}

function stateClass(state: ArchiveEntry["state"]) {
  if (state === "completed") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
  if (state === "live") return "text-primary bg-primary/10 border-primary/20";
  return "text-amber-200 bg-amber-500/10 border-amber-500/20";
}

function toInputDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseGalleryUrls(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function buildArchiveEntries(projects: ProjectRecord[], events: EventRecord[], config: ArchiveConfig) {
  const projectEntries = sortArchiveItems(
    projects.map<ArchiveEntry>((project) => ({
      id: project.projectId,
      kind: "project",
      section: "projects",
      title: project.title,
      description: project.description,
      imageUrl: project.imageUrl,
      category: project.category,
      state: archiveStateFromProjectStatus(project.status),
      statusLabel: project.status === "completed" ? "Completed" : project.status === "planning" ? "Upcoming" : "Live",
      trackHref: `/dashboard/innovation/projects/${project.projectId}`,
      project,
    })),
    config.order.projects,
  );

  const eventEntries = events.map<ArchiveEntry>((event) => {
    const section = eventArchiveSection(event.type);
    const state = archiveStateFromEventDates(event.startTime, event.endTime);
    return {
      id: event.eventId,
      kind: section === "competitions" ? "competition" : "event",
      section,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      category: event.category,
      state,
      statusLabel: state === "completed" ? "Completed" : state === "live" ? "Live" : "Upcoming",
      event,
    };
  });

  return {
    projects: projectEntries,
    events: sortArchiveItems(eventEntries.filter((item) => item.section === "events"), config.order.events),
    competitions: sortArchiveItems(eventEntries.filter((item) => item.section === "competitions"), config.order.competitions),
  };
}

function ArchiveEditorModal({
  initialItem,
  config,
  onClose,
  onSaved,
}: {
  initialItem: ArchiveEntry | null;
  config: ArchiveConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const editing = Boolean(initialItem);
  const initialGallery = initialItem
    ? config.galleries[initialItem.section][String(initialItem.id)] ?? []
    : [];
  const [values, setValues] = useState<ArchiveEditorValues>(() => {
    if (!initialItem) return EMPTY_VALUES;
    if (initialItem.kind === "project" && initialItem.project) {
      return {
        kind: "project",
        title: initialItem.project.title,
        description: initialItem.project.description ?? "",
        imageUrl: initialItem.project.imageUrl ?? "",
        category: initialItem.project.category ?? "",
        galleryUrls: initialGallery.join("\n"),
        githubUrl: initialItem.project.githubUrl ?? "",
        techStack: (initialItem.project.techStack ?? []).join(", "),
        status: initialItem.project.status,
        startTime: "",
        endTime: "",
        location: "",
        isPublished: true,
        applicationsEnabled: initialItem.project.applicationsEnabled,
        applicationRoles: initialItem.project.applicationRoles.join("\n"),
      };
    }

    return {
      kind: initialItem?.kind ?? "event",
      title: initialItem?.event?.title ?? "",
      description: initialItem?.event?.description ?? "",
      imageUrl: initialItem?.event?.imageUrl ?? "",
      category: initialItem?.event?.category ?? "",
      galleryUrls: initialGallery.join("\n"),
      githubUrl: "",
      techStack: "",
      status: "planning",
      startTime: toInputDateTime(initialItem?.event?.startTime ?? null),
      endTime: toInputDateTime(initialItem?.event?.endTime ?? null),
      location: initialItem?.event?.location ?? "",
      isPublished: initialItem?.event?.isPublished ?? true,
      applicationsEnabled: false,
      applicationRoles: "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const section = values.kind === "project" ? "projects" : values.kind === "competition" ? "competitions" : "events";

  function set<K extends keyof ArchiveEditorValues>(key: K, value: ArchiveEditorValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function persistArchiveConfig(nextId: number) {
    const nextConfig = normalizeArchiveConfig(config);
    const galleryUrls = parseGalleryUrls(values.galleryUrls);
    nextConfig.galleries[section][String(nextId)] = galleryUrls;
    if (!nextConfig.order[section].includes(nextId)) {
      nextConfig.order[section] = [nextId, ...nextConfig.order[section]];
    }
    await api.patch("/api/site-content/projects.archive.config", { json: nextConfig });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (values.kind === "project") {
        const payload = {
          title: values.title,
          description: values.description || undefined,
          imageUrl: values.imageUrl || undefined,
          githubUrl: values.githubUrl || undefined,
          category: values.category || undefined,
          status: values.status,
          techStack: values.techStack
            ? values.techStack.split(",").map((item) => item.trim()).filter(Boolean)
            : undefined,
          applicationsEnabled: values.applicationsEnabled,
          applicationRoles: values.applicationsEnabled
            ? values.applicationRoles.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
            : undefined,
        };

        if (editing && initialItem?.project) {
          await api.patch(`/api/projects/${initialItem.id}`, payload);
          await persistArchiveConfig(initialItem.id);
        } else {
          const created = await api.post<{ projectId: number }>("/api/projects", payload);
          await persistArchiveConfig(created.projectId);
        }
      } else {
        const payload = {
          title: values.title,
          description: values.description || undefined,
          imageUrl: values.imageUrl || undefined,
          type: values.kind === "competition" ? "competition" : "general",
          category: values.category || undefined,
          startTime: values.startTime ? new Date(values.startTime).toISOString() : new Date().toISOString(),
          endTime: values.endTime ? new Date(values.endTime).toISOString() : undefined,
          location: values.location || undefined,
          isPublished: values.isPublished,
        };

        if (editing && initialItem?.event) {
          await api.patch(`/api/events/${initialItem.id}`, payload);
          await persistArchiveConfig(initialItem.id);
        } else {
          const created = await api.post<{ eventId: number }>("/api/events", payload);
          await persistArchiveConfig(created.eventId);
        }
      }

      onSaved();
      onClose();
    } catch (caught) {
      setError((caught as { message?: string }).message ?? "Could not save archive item.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "dashboard-field";
  const selectClass = "dashboard-select";
  const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl rounded-[1.6rem] border border-border bg-surface p-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
      >
        <button onClick={onClose} className="absolute right-5 top-5 text-muted transition-colors hover:text-foreground">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {editing ? `Edit ${kindLabel(values.kind)}` : "Create Archive Item"}
        </h2>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>{tr("Type", "النوع")}</span>
              <select
                value={values.kind}
                onChange={(event) => set("kind", event.target.value as ArchiveKind)}
                disabled={editing}
                className={selectClass}
              >
                <option value="project">{tr("Project", "مشروع")}</option>
                <option value="event">{tr("Event", "فعالية")}</option>
                <option value="competition">{tr("Technical Event (counts as competition)", "فعالية تقنية (تُحتسب كمسابقة)")}</option>
              </select>
            </label>

            <label>
              <span className={labelClass}>{tr("Category", "التصنيف")}</span>
              <input value={values.category} onChange={(event) => set("category", event.target.value)} className={inputClass} placeholder={tr("Optional category", "تصنيف اختياري")} />
            </label>
          </div>

          <label>
            <span className={labelClass}>{tr("Title", "العنوان")}</span>
            <input required value={values.title} onChange={(event) => set("title", event.target.value)} className={inputClass} placeholder={tr("Archive item title", "عنوان عنصر الأرشيف")} />
          </label>

          <label>
            <span className={labelClass}>{tr("Description", "الوصف")}</span>
            <textarea value={values.description} onChange={(event) => set("description", event.target.value)} rows={4} className={`${inputClass} resize-none`} placeholder={tr("Short public detail summary", "ملخص قصير يظهر للعموم")} />
          </label>

          <label>
            <span className={labelClass}>{tr("Cover Image", "صورة الغلاف")}</span>
            <ImageUrlInput value={values.imageUrl} onChange={(value) => set("imageUrl", value)} placeholder="https://…" />
          </label>

          <label>
            <span className={labelClass}>{tr("Gallery Images", "صور المعرض")}</span>
            <textarea
              value={values.galleryUrls}
              onChange={(event) => set("galleryUrls", event.target.value)}
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder={tr("One URL per line\nhttps://…", "رابط واحد في كل سطر\nhttps://…")}
            />
          </label>

          {values.kind === "project" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>{tr("Internal Status", "الحالة الداخلية")}</span>
                  <select value={values.status} onChange={(event) => set("status", event.target.value as ProjectStatus)} className={selectClass}>
                    <option value="planning">{tr("Planning", "تخطيط")}</option>
                    <option value="in_progress">{tr("In Progress", "قيد التنفيذ")}</option>
                    <option value="testing">{tr("Testing", "تجريب")}</option>
                    <option value="completed">{tr("Completed", "مكتمل")}</option>
                  </select>
                </label>

                <label>
                  <span className={labelClass}>{tr("GitHub", "GitHub")}</span>
                  <input value={values.githubUrl} onChange={(event) => set("githubUrl", event.target.value)} className={inputClass} placeholder="https://github.com/…" />
                </label>
              </div>

              <label>
                <span className={labelClass}>{tr("Tech Stack", "التقنيات المستخدمة")}</span>
                <input value={values.techStack} onChange={(event) => set("techStack", event.target.value)} className={inputClass} placeholder="ROS2, Python, OpenCV" />
              </label>

              <div className="rounded-xl border border-border bg-surface-elevated/55 p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={values.applicationsEnabled}
                    onChange={(event) => set("applicationsEnabled", event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border bg-surface-elevated"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tr("Accept member applications", "قبول طلبات الأعضاء")}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{tr("Keeps the public detail page open for member role applications.", "يبقي صفحة التفاصيل العامة مفتوحة لاستقبال طلبات الأعضاء.")}</p>
                  </div>
                </label>
                {values.applicationsEnabled ? (
                  <label className="mt-4 block">
                    <span className={labelClass}>{tr("Application Roles", "أدوار الطلب")}</span>
                    <textarea
                      value={values.applicationRoles}
                      onChange={(event) => set("applicationRoles", event.target.value)}
                      rows={4}
                      className={`${inputClass} resize-none`}
                      placeholder={tr("One role per line\nFlight Controls\nComputer Vision", "دور واحد في كل سطر\nFlight Controls\nComputer Vision")}
                    />
                  </label>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>{tr("Start Time", "وقت البدء")}</span>
                  <input type="datetime-local" value={values.startTime} onChange={(event) => set("startTime", event.target.value)} className={inputClass} />
                </label>
                <label>
                  <span className={labelClass}>{tr("End Time", "وقت الانتهاء")}</span>
                  <input type="datetime-local" value={values.endTime} onChange={(event) => set("endTime", event.target.value)} className={inputClass} />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>{tr("Location", "المكان")}</span>
                  <input value={values.location} onChange={(event) => set("location", event.target.value)} className={inputClass} placeholder={tr("Venue or hall", "المقر أو القاعة")} />
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/55 px-4 py-3">
                  <input type="checkbox" checked={values.isPublished} onChange={(event) => set("isPublished", event.target.checked)} className="h-4 w-4 rounded border-border bg-surface-elevated" />
                  <span className="text-sm text-foreground">{tr("Published", "منشور")}</span>
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 px-5 py-2.5 text-sm">{tr("Cancel", "إلغاء")}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 px-5 py-2.5 text-sm disabled:opacity-60">
              {saving ? tr("Saving…", "جارٍ الحفظ…") : editing ? tr("Save Changes", "حفظ التغييرات") : tr("Create Item", "إنشاء عنصر")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function ArchiveManager() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [config, setConfig] = useState<ArchiveConfig>(normalizeArchiveConfig(null));
  const [loading, setLoading] = useState(true);
  const [editorItem, setEditorItem] = useState<ArchiveEntry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [savingOrder, setSavingOrder] = useState<ArchiveSectionKey | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    void Promise.allSettled([
      api.get<ProjectRecord[]>("/api/projects"),
      api.get<EventRecord[]>("/api/events"),
      api.get<{ json: ArchiveConfig | null }>("/api/site-content/projects.archive.config"),
    ]).then(([projectsResult, eventsResult, configResult]) => {
      setProjects(projectsResult.status === "fulfilled" ? projectsResult.value ?? [] : []);
      setEvents(eventsResult.status === "fulfilled" ? eventsResult.value ?? [] : []);
      setConfig(configResult.status === "fulfilled" ? normalizeArchiveConfig(configResult.value?.json) : normalizeArchiveConfig(null));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => buildArchiveEntries(projects, events, config), [config, events, projects]);

  async function saveConfig(nextConfig: ArchiveConfig, targetSection?: ArchiveSectionKey) {
    setConfig(nextConfig);
    if (targetSection) setSavingOrder(targetSection);
    try {
      await api.patch("/api/site-content/projects.archive.config", { json: nextConfig });
    } finally {
      if (targetSection) setSavingOrder(null);
    }
  }

  async function moveItem(section: ArchiveSectionKey, id: number, delta: number) {
    const ids = grouped[section].map((item) => item.id);
    const currentIndex = ids.indexOf(id);
    if (currentIndex === -1) return;
    const nextIds = moveArrayItem(ids, currentIndex, currentIndex + delta);
    const nextConfig = normalizeArchiveConfig(config);
    nextConfig.order[section] = nextIds;
    await saveConfig(nextConfig, section);
  }

  async function deleteItem(item: ArchiveEntry) {
    if (!confirm(tr(`Delete ${item.title}? This cannot be undone.`, `حذف ${item.title}؟ لا يمكن التراجع.`))) return;
    if (item.kind === "project") {
      await api.delete(`/api/projects/${item.id}`);
    } else {
      await api.delete(`/api/events/${item.id}`);
    }

    const nextConfig = normalizeArchiveConfig(config);
    nextConfig.order[item.section] = nextConfig.order[item.section].filter((value) => value !== item.id);
    delete nextConfig.galleries[item.section][String(item.id)];
    await saveConfig(nextConfig, item.section);
    load();
  }

  function getArchiveCsv() {
    return toCsv(
      ["kind", "title", "description", "category", "status", "imageUrl", "githubUrl", "techStack", "startTime", "endTime", "location", "isPublished", "applicationsEnabled", "applicationRoles"],
      [
        ...projects.map((project) => [
          "project",
          project.title,
          project.description ?? "",
          project.category ?? "",
          project.status,
          project.imageUrl ?? "",
          project.githubUrl ?? "",
          (project.techStack ?? []).join("|"),
          "",
          "",
          "",
          true,
          project.applicationsEnabled,
          project.applicationRoles.join("|"),
        ]),
        ...events.map((event) => [
          event.type === "competition" ? "competition" : "event",
          event.title,
          event.description ?? "",
          event.category ?? "",
          "",
          event.imageUrl ?? "",
          "",
          "",
          event.startTime,
          event.endTime ?? "",
          event.location ?? "",
          event.isPublished,
          false,
          "",
        ]),
      ],
    );
  }

  function getArchiveTemplateCsv() {
    return toCsv(
      ["kind", "title", "description", "category", "status", "imageUrl", "githubUrl", "techStack", "startTime", "endTime", "location", "isPublished", "applicationsEnabled", "applicationRoles"],
      [
        ["project", "Prototype name", "Short summary", "Robotics", "planning", "", "", "ROS2|Python", "", "", "", true, false, ""],
        ["event", "Workshop title", "Session summary", "Training", "", "", "", "", new Date().toISOString(), "", "Innovation Lab", true, false, ""],
      ],
    );
  }

  async function importArchiveRows(rows: Record<string, string>[]) {
    for (const row of rows) {
      const kind = (row.kind?.trim() || "project") as ArchiveKind;
      if (!row.title?.trim()) continue;

      if (kind === "project") {
        await api.post("/api/projects", {
          title: row.title.trim(),
          description: row.description?.trim() || undefined,
          imageUrl: row.imageUrl?.trim() || undefined,
          githubUrl: row.githubUrl?.trim() || undefined,
          category: row.category?.trim() || undefined,
          status: (row.status?.trim() || "planning") as ProjectStatus,
          techStack: row.techStack?.trim() ? row.techStack.split("|").map((item) => item.trim()).filter(Boolean) : undefined,
          applicationsEnabled: parseBoolean(row.applicationsEnabled ?? ""),
          applicationRoles: parseBoolean(row.applicationsEnabled ?? "")
            ? row.applicationRoles?.split("|").map((item) => item.trim()).filter(Boolean)
            : undefined,
        });
      } else {
        await api.post("/api/events", {
          title: row.title.trim(),
          description: row.description?.trim() || undefined,
          imageUrl: row.imageUrl?.trim() || undefined,
          type: kind === "competition" ? "competition" : "general",
          category: row.category?.trim() || undefined,
          startTime: row.startTime?.trim() || new Date().toISOString(),
          endTime: row.endTime?.trim() || undefined,
          location: row.location?.trim() || undefined,
          isPublished: parseBoolean(row.isPublished ?? ""),
        });
      }
    }
    load();
  }

  function SectionBlock({ section }: { section: ArchiveSectionKey }) {
    const items = grouped[section];
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{sectionLabel(section)}</h3>
            <p className="mt-1 text-xs text-muted">{tr("Manual order controls the public archive.", "الترتيب اليدوي يتحكّم بالأرشيف العام.")}</p>
          </div>
          {savingOrder === section ? <Loader2 size={14} className="animate-spin text-muted" /> : null}
        </div>

        {items.length === 0 ? (
          <div className="glass-card p-6 text-sm text-muted">{tr(`No ${sectionLabel(section).toLowerCase()} yet.`, `لا توجد ${sectionLabel(section)} بعد.`)}</div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.div
                key={`${item.section}-${item.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass-card p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-primary/70">
                    {item.section === "projects" ? <Wrench size={18} /> : item.section === "competitions" ? <Trophy size={18} /> : <CalendarDays size={18} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted">
                        {kindLabel(item.kind)}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${stateClass(item.state)}`}>
                        {item.statusLabel}
                      </span>
                    </div>
                    {item.description ? <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">{item.description}</p> : null}
                    <p className="mt-2 text-[11px] text-muted/70">
                      {tr("Gallery images", "صور المعرض")}: {(config.galleries[item.section][String(item.id)] ?? []).length}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => moveItem(item.section, item.id, -1)} className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground" title={tr("Move up", "تحريك للأعلى")}>
                      <ArrowUp size={14} />
                    </button>
                    <button onClick={() => moveItem(item.section, item.id, 1)} className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground" title={tr("Move down", "تحريك للأسفل")}>
                      <ArrowDown size={14} />
                    </button>
                    <button onClick={() => setEditorItem(item)} className="rounded-md p-1.5 text-muted transition-colors hover:text-primary" title={tr("Edit", "تعديل")}>
                      <Pencil size={14} />
                    </button>
                    {item.trackHref ? (
                      <Link href={item.trackHref} className="rounded-md p-1.5 text-muted transition-colors hover:text-primary" title={tr("Open track page", "فتح صفحة التتبّع")}>
                        <ExternalLink size={14} />
                      </Link>
                    ) : null}
                    <button onClick={() => deleteItem(item)} className="rounded-md p-1.5 text-muted transition-colors hover:text-red-400" title={tr("Delete", "حذف")}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{tr("Archive", "الأرشيف")}</h3>
          <p className="mt-1 text-sm text-muted">{tr("Projects, events, and competitions now share one public archive and one leader workflow.", "المشاريع والفعاليات والمسابقات تشارك الآن أرشيفاً عاماً واحداً وسير عمل قيادي موحّد.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportExportToolbar
            exportFilename="innovation-archive.csv"
            templateFilename="innovation-archive-template.csv"
            getExportCsv={getArchiveCsv}
            getTemplateCsv={getArchiveTemplateCsv}
            onImportRows={importArchiveRows}
            exportLabel={tr("Export archive", "تصدير الأرشيف")}
            templateLabel={tr("Archive template", "قالب الأرشيف")}
            importLabel={tr("Import archive", "استيراد الأرشيف")}
          />
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs">
            <Plus size={13} />
            {tr("Create Item", "إنشاء عنصر")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => <div key={index} className="glass-card h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-10">
          <SectionBlock section="projects" />
          <SectionBlock section="events" />
          <SectionBlock section="competitions" />
        </div>
      )}

      <AnimatePresence>
        {createOpen ? (
          <ArchiveEditorModal
            initialItem={null}
            config={config}
            onClose={() => setCreateOpen(false)}
            onSaved={load}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editorItem ? (
          <ArchiveEditorModal
            initialItem={editorItem}
            config={config}
            onClose={() => setEditorItem(null)}
            onSaved={load}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
