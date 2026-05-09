"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";

interface MemberStatsRow {
  memberId: number;
  fullName: string | null;
  fullNameAr: string | null;
  avatarUrl: string | null;
  departmentSlug: string | null;
  departmentName: string | null;
  position: string;
  hoursApproved: number;
  hoursPending: number;
  tasksAssigned: number;
  tasksDone: number;
  tasksInReview: number;
  lastActivity: string | null;
}

type SortKey = "hours" | "tasks" | "completion" | "recent" | "name";

const POSITION_LABELS: Record<string, [string, string]> = {
  president: ["President", "الرئيس"],
  vice_president: ["VP", "نائب الرئيس"],
  dept_leader: ["Leader", "رئيس"],
  dept_vice_leader: ["Vice Leader", "نائب رئيس"],
  sub_leader: ["Sub-Leader", "مسؤول فرعي"],
  member: ["Member", "عضو"],
};

function fmtRelative(iso: string | null, lang: "en" | "ar") {
  if (!iso) return lang === "ar" ? "بلا نشاط" : "no activity";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return lang === "ar" ? "بلا نشاط" : "no activity";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return lang === "ar" ? "اليوم" : "today";
  if (days < 7) return lang === "ar" ? `قبل ${days} يوم` : `${days}d ago`;
  if (days < 30) return lang === "ar" ? `قبل ${Math.floor(days / 7)} أسبوع` : `${Math.floor(days / 7)}w ago`;
  if (days < 365) return lang === "ar" ? `قبل ${Math.floor(days / 30)} شهر` : `${Math.floor(days / 30)}mo ago`;
  return lang === "ar" ? `قبل أكثر من سنة` : "1+ yr ago";
}

interface MemberPerformancePanelProps {
  /** When set, restrict to this department slug. Omit to show all (admin). */
  defaultDepartment?: string;
  /** Whether to show the department filter chip row. */
  showDepartmentFilter?: boolean;
}

const DEPT_OPTIONS: Array<{ slug: string; en: string; ar: string }> = [
  { slug: "hr", en: "HR", ar: "الموارد" },
  { slug: "development", en: "Development", ar: "التطوير" },
  { slug: "innovation", en: "Innovation", ar: "الابتكار" },
  { slug: "media", en: "Media", ar: "الإعلام" },
  { slug: "pr", en: "PR", ar: "العلاقات العامة" },
  { slug: "finance", en: "Finance", ar: "المالية" },
  { slug: "madarat", en: "Madarat", ar: "مدارات" },
];

export function MemberPerformancePanel({
  defaultDepartment,
  showDepartmentFilter = true,
}: MemberPerformancePanelProps) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [rows, setRows] = useState<MemberStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState<string | "all">(defaultDepartment ?? "all");
  const [sortKey, setSortKey] = useState<SortKey>("hours");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = department === "all" ? "/api/members/stats" : `/api/members/stats?department=${department}`;
    void (async () => {
      try {
        const data = await api.get<MemberStatsRow[]>(url);
        if (!cancelled) setRows(data ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [department]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter((r) =>
        (r.fullName ?? "").toLowerCase().includes(q) ||
        (r.fullNameAr ?? "").toLowerCase().includes(q) ||
        (r.departmentName ?? "").toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      switch (sortKey) {
        case "hours": return (a.hoursApproved - b.hoursApproved) * dir;
        case "tasks": return (a.tasksDone - b.tasksDone) * dir;
        case "completion": {
          const ca = a.tasksAssigned ? a.tasksDone / a.tasksAssigned : 0;
          const cb = b.tasksAssigned ? b.tasksDone / b.tasksAssigned : 0;
          return (ca - cb) * dir;
        }
        case "recent": {
          const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          return (ta - tb) * dir;
        }
        case "name":
          return ((a.fullName ?? "").localeCompare(b.fullName ?? "")) * dir;
      }
    });
  }, [rows, sortKey, sortDir, search]);

  const totals = useMemo(() => {
    return {
      members: rows.length,
      hours: rows.reduce((sum, r) => sum + r.hoursApproved, 0),
      tasks: rows.reduce((sum, r) => sum + r.tasksDone, 0),
      pendingHours: rows.reduce((sum, r) => sum + r.hoursPending, 0),
    };
  }, [rows]);

  const top = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => (b.hoursApproved + b.tasksDone * 2) - (a.hoursApproved + a.tasksDone * 2))[0];
  }, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortHeader({ k, children }: { k: SortKey; children: React.ReactNode }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 transition-colors ${active ? "text-primary" : "text-muted hover:text-foreground"}`}
      >
        {children}
        {active ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ArrowDownUp size={10} className="opacity-40" />}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Highlights row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Users}    tone="primary"  label={tr("Active Members", "أعضاء نشطون")}  value={totals.members} />
        <Stat icon={Clock}    tone="emerald"  label={tr("Approved Hours", "ساعات معتمدة")} value={`${totals.hours.toFixed(0)}h`} />
        <Stat icon={Sparkles} tone="amber"    label={tr("Tasks Done",   "مهام مكتملة")}    value={totals.tasks} />
        <Stat icon={Clock}    tone="muted"    label={tr("Pending Hours","ساعات معلقة")}    value={`${totals.pendingHours.toFixed(0)}h`} />
      </div>

      {/* Top performer card */}
      {top ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/8 to-transparent p-5"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Trophy size={20} className="text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                {tr("Top performer this period", "الأفضل أداءً هذه الفترة")}
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {lang === "ar" ? (top.fullNameAr || top.fullName) : (top.fullName || top.fullNameAr)}
              </p>
              <p className="text-xs text-muted">
                {top.hoursApproved.toFixed(0)}{tr("h approved", " ساعة معتمدة")} · {top.tasksDone} {tr("tasks done", "مهام مكتملة")}
                {top.departmentName ? ` · ${top.departmentName}` : ""}
              </p>
            </div>
            <Link
              href={`/dashboard/profile?member=${top.memberId}`}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/30 text-xs text-amber-200 hover:bg-amber-400/10 transition-colors"
            >
              {tr("View profile", "عرض الملف")} <ExternalLink size={11} />
            </Link>
          </div>
        </motion.div>
      ) : null}

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("Search members…", "ابحث عن عضو…")}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/40"
          />
        </div>
        {showDepartmentFilter ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={12} className="text-muted" />
            <button
              onClick={() => setDepartment("all")}
              aria-pressed={department === "all"}
              className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                department === "all"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {tr("All", "الكل")}
            </button>
            {DEPT_OPTIONS.map((opt) => (
              <button
                key={opt.slug}
                onClick={() => setDepartment(opt.slug)}
                aria-pressed={department === opt.slug}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                  department === opt.slug
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {tr(opt.en, opt.ar)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface/50 overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted">
          <SortHeader k="name">{tr("Member", "عضو")}</SortHeader>
          <SortHeader k="hours">{tr("Hours", "الساعات")}</SortHeader>
          <SortHeader k="tasks">{tr("Tasks done", "مهام مكتملة")}</SortHeader>
          <SortHeader k="completion">{tr("Completion", "نسبة الإنجاز")}</SortHeader>
          <SortHeader k="recent">{tr("Last activity", "آخر نشاط")}</SortHeader>
          <span>{tr("Department", "القسم")}</span>
        </div>

        {loading ? (
          <div className="p-6 flex items-center justify-center text-muted">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">
            {tr("No matching members.", "لا يوجد أعضاء مطابقون.")}
          </div>
        ) : (
          filtered.map((row, i) => {
            const completion = row.tasksAssigned > 0 ? Math.round((row.tasksDone / row.tasksAssigned) * 100) : null;
            const initials = (row.fullName ?? row.fullNameAr ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
            return (
              <motion.div
                key={row.memberId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-elevated/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold text-primary">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {lang === "ar" ? (row.fullNameAr || row.fullName || "—") : (row.fullName || row.fullNameAr || "—")}
                    </p>
                    <p className="text-[10px] text-muted truncate">
                      {tr(POSITION_LABELS[row.position]?.[0] ?? row.position, POSITION_LABELS[row.position]?.[1] ?? row.position)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-foreground">{row.hoursApproved.toFixed(0)}h</p>
                  {row.hoursPending > 0 ? (
                    <p className="text-[10px] text-amber-300">+{row.hoursPending.toFixed(0)}h {tr("pending", "معلقة")}</p>
                  ) : null}
                </div>

                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-foreground">{row.tasksDone}<span className="text-muted text-xs">/{row.tasksAssigned}</span></p>
                  {row.tasksInReview > 0 ? (
                    <p className="text-[10px] text-amber-300">{row.tasksInReview} {tr("in review", "قيد المراجعة")}</p>
                  ) : null}
                </div>

                <div className="flex flex-col">
                  {completion === null ? (
                    <p className="text-xs text-muted">—</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground">{completion}%</p>
                      <div className="w-20 h-1 rounded-full bg-surface-elevated overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/60"
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="text-xs text-muted self-center">{fmtRelative(row.lastActivity, lang)}</div>
                <div className="text-xs text-muted self-center truncate">{row.departmentName ?? "—"}</div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ElementType;
  tone: "primary" | "emerald" | "amber" | "muted";
  label: string;
  value: number | string;
}) {
  const toneCls: Record<typeof tone, string> = {
    primary: "border-primary/20 bg-primary/5 text-primary",
    emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/5 text-amber-300",
    muted: "border-border bg-surface-elevated/40 text-muted",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneCls[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon size={13} />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
