"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArchiveRestore,
  Briefcase,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  Lightbulb,
  Loader2,
  Megaphone,
  RotateCcw,
  Trash2,
  Video,
} from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";

type EntityKey =
  | "task"
  | "project"
  | "volunteer_hour_task"
  | "workshop"
  | "live_workshop"
  | "madarat_session"
  | "event"
  | "announcement"
  | "announcement_request";

interface DeletedItem {
  entity: EntityKey;
  id: number;
  title: string;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
  departmentName: string | null;
}

const ENTITY_META: Record<EntityKey, { en: string; ar: string; icon: React.ElementType; tone: string }> = {
  task:                 { en: "Task",                ar: "مهمة",              icon: ClipboardList, tone: "text-primary" },
  project:              { en: "Project",             ar: "مشروع",             icon: Lightbulb,     tone: "text-amber-300" },
  volunteer_hour_task:  { en: "Volunteer Hour Task", ar: "مهمة ساعات تطوع",  icon: Briefcase,     tone: "text-emerald-300" },
  workshop:             { en: "Workshop",            ar: "ورشة",              icon: GraduationCap, tone: "text-blue-300" },
  live_workshop:        { en: "Live Workshop",       ar: "ورشة مباشرة",       icon: Video,         tone: "text-purple-300" },
  madarat_session:      { en: "Madarat Session",     ar: "جلسة مدارات",      icon: GraduationCap, tone: "text-fuchsia-300" },
  event:                { en: "Event",               ar: "فعالية",            icon: CalendarDays,  tone: "text-rose-300" },
  announcement:         { en: "Announcement",        ar: "إعلان",             icon: Megaphone,     tone: "text-cyan-300" },
  announcement_request: { en: "Announcement Request",ar: "طلب إعلان",         icon: FileText,      tone: "text-sky-300" },
};

const ENTITY_ORDER: EntityKey[] = [
  "task",
  "project",
  "volunteer_hour_task",
  "workshop",
  "live_workshop",
  "madarat_session",
  "event",
  "announcement",
  "announcement_request",
];

function fmtDate(iso: string | null, lang: "en" | "ar") {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function deepLinkFor(item: DeletedItem): string | null {
  // Many entities don't have a dashboard detail page; only link the ones that do.
  switch (item.entity) {
    case "task": return `/dashboard/tasks/${item.id}`;
    case "volunteer_hour_task": return `/dashboard/hr/hour-tasks/${item.id}`;
    case "project": return `/dashboard/innovation/projects/${item.id}`;
    default: return null;
  }
}

export default function TrashPage() {
  const { isClubLeader, isLoading: authLoading } = useAuth();
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const allowed = isClubLeader;
  const { data: items = [], isLoading, mutate } = useApi<DeletedItem[]>(allowed ? "/api/admin/trash" : null);

  const [filter, setFilter] = useState<"all" | EntityKey>("all");
  const [restoringKey, setRestoringKey] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const it of items) map[it.entity] = (map[it.entity] ?? 0) + 1;
    return map;
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.entity === filter);
  }, [items, filter]);

  // Group by entity for the list rendering (only when filter === "all")
  const groups = useMemo(() => {
    if (filter !== "all") return null;
    const map = new Map<EntityKey, DeletedItem[]>();
    for (const it of visible) {
      const list = map.get(it.entity) ?? [];
      list.push(it);
      map.set(it.entity, list);
    }
    return ENTITY_ORDER
      .filter((key) => (map.get(key)?.length ?? 0) > 0)
      .map((key) => ({ key, items: map.get(key)! }));
  }, [filter, visible]);

  async function restore(item: DeletedItem) {
    const key = `${item.entity}:${item.id}`;
    setRestoringKey(key);
    try {
      await api.post("/api/admin/trash/restore", { entity: item.entity, id: item.id });
      toast.success(tr("Restored", "تمت الاستعادة"));
      void mutate();
    } catch {
      toast.error(tr("Restore failed. Please try again.", "تعذّر الاستعادة. حاول مرة أخرى."));
    } finally {
      setRestoringKey(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div>
        <DashboardHeader
          title={tr("Trash", "سلة المحذوفات")}
          description={tr("Only club leadership can view this page.", "هذه الصفحة متاحة لقيادة النادي فقط.")}
        />
        <div className="glass-card p-10 text-center text-sm text-muted">
          {tr("You don't have permission to access this page.", "ليست لديك صلاحية الوصول إلى هذه الصفحة.")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title={tr("Trash", "سلة المحذوفات")}
        description={tr(
          "Anything soft-deleted across the club lives here. Restore brings it back exactly where it was.",
          "كل ما حُذف بشكل ناعم في النادي يظهر هنا. الاستعادة تُرجِع العنصر إلى مكانه الأصلي.",
        )}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/40 ${
            filter === "all"
              ? "border-primary/35 bg-primary/10 text-primary"
              : "border-border bg-surface-elevated text-muted hover:text-foreground"
          }`}
        >
          <Trash2 size={11} />
          {tr("All", "الكل")}
          <span className="ms-0.5 rounded-full bg-surface-elevated/80 px-1.5 py-0.5 text-[10px]">{counts.all ?? 0}</span>
        </button>
        {ENTITY_ORDER.map((key) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          const meta = ENTITY_META[key];
          const Icon = meta.icon;
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/40 ${
                active
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border bg-surface-elevated text-muted hover:text-foreground"
              }`}
            >
              <Icon size={11} className={active ? "" : meta.tone} />
              {tr(meta.en, meta.ar)}
              <span className="ms-0.5 rounded-full bg-surface-elevated/80 px-1.5 py-0.5 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ArchiveRestore}
          title={tr("Trash is empty", "السلة فارغة")}
          body={tr("Nothing has been soft-deleted yet. Items you delete from any committee dashboard will appear here.", "لم يُحذف شيء بعد. ستظهر العناصر المحذوفة من أي لوحة لجنة هنا.")}
        />
      ) : visible.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted">
          {tr("No deleted items match this filter.", "لا توجد عناصر محذوفة تطابق هذا الفلتر.")}
        </div>
      ) : groups ? (
        <div className="space-y-8">
          {groups.map(({ key, items: rows }) => {
            const meta = ENTITY_META[key];
            const Icon = meta.icon;
            return (
              <section key={key}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon size={14} className={meta.tone} />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {tr(meta.en, meta.ar)}
                  </h2>
                  <span className="rounded-full border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
                    {rows.length}
                  </span>
                </div>
                <TrashList rows={rows} lang={lang as "en" | "ar"} onRestore={restore} restoringKey={restoringKey} tr={tr} />
              </section>
            );
          })}
        </div>
      ) : (
        <TrashList rows={visible} lang={lang as "en" | "ar"} onRestore={restore} restoringKey={restoringKey} tr={tr} />
      )}
    </div>
  );
}

function TrashList({
  rows,
  lang,
  onRestore,
  restoringKey,
  tr,
}: {
  rows: DeletedItem[];
  lang: "en" | "ar";
  onRestore: (item: DeletedItem) => void | Promise<void>;
  restoringKey: string | null;
  tr: (en: string, ar: string) => string;
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40">
      {rows.map((item, i) => {
        const key = `${item.entity}:${item.id}`;
        const link = deepLinkFor(item);
        const busy = restoringKey === key;
        const meta = ENTITY_META[item.entity];
        return (
          <motion.li
            key={key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 6) * 0.03 }}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                <span className={`me-1 inline-flex items-center gap-1 ${meta.tone}`}>
                  {tr(meta.en, meta.ar)}
                </span>
                · #{item.id}
                {item.departmentName ? ` · ${item.departmentName}` : ""}
                {item.deletedAt ? ` · ${tr("deleted", "حُذف")} ${fmtDate(item.deletedAt, lang)}` : ""}
                {item.deletedByName ? ` ${tr("by", "بواسطة")} ${item.deletedByName}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center justify-center px-2.5 py-1.5"
                  title={tr("Preview", "معاينة")}
                >
                  <ExternalLink size={11} />
                </a>
              )}
              <button
                type="button"
                onClick={() => onRestore(item)}
                disabled={busy}
                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-60"
                title={tr("Restore", "استعادة")}
              >
                {busy ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                {tr("Restore", "استعادة")}
              </button>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
