"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code, GitBranch, CheckCircle2, Zap, Radio,
  Plus, X, Users, Calendar, Clock, MapPin, Trash2, Eye, Pencil,
  FolderOpen, ListVideo, ExternalLink, Building2, Send, Loader2,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DepartmentOperationsPanel } from "@/components/dashboard/DepartmentOperationsPanel";
import { LeaderTaskReviewPanel } from "@/components/dashboard/LeaderTaskReviewPanel";
import { MemberPerformancePanel } from "@/components/dashboard/MemberPerformancePanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { api } from "@/lib/client";
import { toExternalUrl } from "@/lib/url";
import { useApi } from "@/lib/hooks/useApi";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveWorkshop {
  liveWorkshopId: number;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  presenter: string | null;
  scheduledAt: string;
  durationMin: number | null;
  location: string | null;
  meetingUrl: string | null;
  maxRegistrants: number | null;
  registrationOpen: boolean;
  isPublished: boolean;
  membersOnly: boolean;
  registrationCount: number;
}

interface WorkshopSession {
  sessionId: number;
  workshopId: number;
  title: string;
  titleAr: string | null;
  description: string | null;
  durationMin: number | null;
  googleDriveUrl: string;
  orderIndex: number;
}

interface RecordedWorkshop {
  workshopId: number;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  category: string | null;
  presenter: string | null;
  durationMin: number | null;
  videoUrl: string | null;
  googleDriveFolderUrl: string | null;
  thumbnailUrl: string | null;
  recordedDate: string | null;
  isPublished: boolean;
  membersOnly: boolean;
  sessions: WorkshopSession[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function isPast(iso: string) { return new Date(iso) < new Date(); }

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`relative w-9 h-5 rounded-full border transition-colors duration-200 shrink-0 ${
        checked ? "bg-primary/20 border-primary/40" : "bg-surface-elevated border-border"
      } disabled:opacity-40`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
        checked ? "translate-x-4 bg-primary" : "bg-muted/40"
      }`} />
    </button>
  );
}

// ─── Create workshop modal ────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "", titleAr: "", description: "", descriptionAr: "",
  presenter: "", scheduledAt: "", durationMin: "", location: "",
  meetingUrl: "", maxRegistrants: "",
  registrationOpen: false, isPublished: false, membersOnly: false,
};

interface CreateModalProps { onClose: () => void; onSaved: () => void | Promise<unknown>; editing?: LiveWorkshop | null }

// Converts an ISO timestamp into the "YYYY-MM-DDTHH:mm" form expected by
// <input type="datetime-local"> using the user's local timezone.
function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CreateModal({ onClose, onSaved, editing }: CreateModalProps) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const isEdit = Boolean(editing);
  const initial = useMemo(() => editing ? ({
    title: editing.title,
    titleAr: editing.titleAr ?? "",
    description: editing.description ?? "",
    descriptionAr: editing.descriptionAr ?? "",
    presenter: editing.presenter ?? "",
    scheduledAt: toLocalDatetimeInput(editing.scheduledAt),
    durationMin: editing.durationMin != null ? String(editing.durationMin) : "",
    location: editing.location ?? "",
    meetingUrl: editing.meetingUrl ?? "",
    maxRegistrants: editing.maxRegistrants != null ? String(editing.maxRegistrants) : "",
    registrationOpen: editing.registrationOpen,
    isPublished: editing.isPublished,
    membersOnly: editing.membersOnly,
  }) : EMPTY_FORM, [editing]);
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF(prev => ({ ...prev, [k]: e.target.value }));

  const setCheck = (k: "registrationOpen" | "isPublished") =>
    setF(prev => ({ ...prev, [k]: !prev[k] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: f.title,
        titleAr: f.titleAr || undefined,
        description: f.description || undefined,
        descriptionAr: f.descriptionAr || undefined,
        presenter: f.presenter || undefined,
        scheduledAt: new Date(f.scheduledAt).toISOString(),
        durationMin: f.durationMin ? parseInt(f.durationMin, 10) : undefined,
        location: f.location || undefined,
        meetingUrl: f.meetingUrl || undefined,
        maxRegistrants: f.maxRegistrants ? parseInt(f.maxRegistrants, 10) : undefined,
        registrationOpen: f.registrationOpen,
        isPublished: f.isPublished,
        membersOnly: f.membersOnly,
      };
      if (isEdit && editing) {
        await api.patch(`/api/live-workshops/${editing.liveWorkshopId}`, payload);
        await onSaved();
        toast.success(tr("Live workshop updated.", "تم تحديث الورشة المباشرة."));
      } else {
        await api.post("/api/live-workshops", payload);
        await onSaved();
        toast.success(tr("Live workshop created.", "تم إنشاء الورشة المباشرة."));
      }
      onClose();
    } catch (err: unknown) {
      const message = (err as { message?: string }).message ?? (isEdit ? "Failed to update workshop" : "Failed to create workshop");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all";
  const labelCls = "block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl glass-card p-8 relative max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors">
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-foreground mb-6">
          {isEdit ? tr("Edit Live Workshop", "تعديل الورشة المباشرة") : tr("Create Live Workshop", "إنشاء ورشة مباشرة")}
        </h2>

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{tr("Title (EN) *", "العنوان (EN) *")}</label>
              <input required value={f.title} onChange={set("title")} placeholder={tr("Workshop title", "عنوان الورشة")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Title (AR)", "العنوان (AR)")}</label>
              <input value={f.titleAr} onChange={set("titleAr")} placeholder="عنوان الورشة" dir="rtl" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{tr("Description", "الوصف")}</label>
              <textarea value={f.description} onChange={set("description")} rows={2} placeholder={tr("What will attendees learn?", "ماذا سيتعلم الحضور؟")} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>{tr("Presenter", "المُقدِّم")}</label>
              <input value={f.presenter} onChange={set("presenter")} placeholder={tr("Presenter name", "اسم المُقدِّم")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Date & Time *", "التاريخ والوقت *")}</label>
              <input required type="datetime-local" value={f.scheduledAt} onChange={set("scheduledAt")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Duration (minutes)", "المدة (بالدقائق)")}</label>
              <input type="number" min={1} value={f.durationMin} onChange={set("durationMin")} placeholder="90" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Location / Room", "المكان / القاعة")}</label>
              <input value={f.location} onChange={set("location")} placeholder={tr("e.g. Room 204, Zoom", "مثل: قاعة 204، Zoom")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Meeting URL", "رابط الاجتماع")}</label>
              <input type="url" value={f.meetingUrl} onChange={set("meetingUrl")} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Max Registrants", "الحد الأقصى للمسجّلين")}</label>
              <input type="number" min={1} value={f.maxRegistrants} onChange={set("maxRegistrants")} placeholder={tr("Leave empty for unlimited", "اتركه فارغاً للسعة المفتوحة")} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{tr("Visibility", "الظهور")}</label>
              <select
                value={f.membersOnly ? "members_only" : "public"}
                onChange={(e) => setF(prev => ({ ...prev, membersOnly: e.target.value === "members_only" }))}
                className={inputCls}
              >
                <option value="public">{tr("Public (any visitor)", "عام (لأي زائر)")}</option>
                <option value="members_only">{tr("Members only (signed-in)", "للأعضاء فقط (مسجلين)")}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Toggle checked={f.isPublished} onChange={() => setCheck("isPublished")} />
              <span className="text-sm text-foreground">{tr("Publish (visible to public)", "نشر (يظهر للعموم)")}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Toggle checked={f.registrationOpen} onChange={() => setCheck("registrationOpen")} />
              <span className="text-sm text-foreground">{tr("Open registration", "تسجيل مفتوح")}</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm flex-1">{tr("Cancel", "إلغاء")}</button>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex-1 disabled:opacity-60">
              {saving
                ? (isEdit ? tr("Saving…", "جارٍ الحفظ…") : tr("Creating…", "جارٍ الإنشاء…"))
                : (isEdit ? tr("Save Changes", "حفظ التعديلات") : tr("Create Workshop", "إنشاء الورشة"))}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Registrations viewer ─────────────────────────────────────────────────────

interface Registration {
  registrationId: number;
  fullName: string;
  email: string;
  universityId: string | null;
  phone: string | null;
  department: string | null;
  registeredAt: string;
}

function RegList({ workshopId, onClose }: { workshopId: number; onClose: () => void }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: regs = [], isLoading: loading } = useApi<Registration[]>(
    `/api/live-workshops/${workshopId}/registrations`,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl glass-card relative max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">{tr("Registrations", "التسجيلات")}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted">{tr("Loading…", "جارٍ التحميل…")}</div>
          ) : regs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">{tr("No registrations yet.", "لا توجد تسجيلات بعد.")}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-muted">
                  {[tr("Name", "الاسم"), tr("Email", "البريد"), tr("Uni ID", "الرقم الجامعي"), tr("Dept", "القسم"), tr("Registered", "تاريخ التسجيل")].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regs.map((r, i) => (
                  <tr key={r.registrationId} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-surface-elevated/30"}`}>
                    <td className="px-4 py-2.5 text-foreground font-medium">{r.fullName}</td>
                    <td className="px-4 py-2.5 text-muted">{r.email}</td>
                    <td className="px-4 py-2.5 text-muted">{r.universityId ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{r.department ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {new Date(r.registeredAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <p className="text-xs text-muted">{regs.length} {tr(regs.length === 1 ? "registrant" : "registrants", "مسجَّل")}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Live Workshops tab ───────────────────────────────────────────────────────

function LiveWorkshopsTab() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: workshops = [], isLoading: loading, mutate: load } = useApi<LiveWorkshop[]>("/api/live-workshops");
  const [showCreate, setShowCreate] = useState(false);
  const [editingLive, setEditingLive] = useState<LiveWorkshop | null>(null);
  const [viewRegsId, setViewRegsId] = useState<number | null>(null);
  const [toggling, setToggling] = useState<Record<number, boolean>>({});

  const toggle = async (w: LiveWorkshop, field: "registrationOpen" | "isPublished") => {
    const key = w.liveWorkshopId * 10 + (field === "registrationOpen" ? 1 : 2);
    setToggling(t => ({ ...t, [key]: true }));
    try {
      await api.patch(`/api/live-workshops/${w.liveWorkshopId}`, { [field]: !w[field] });
      void load();
    } catch {
      toast.error(tr("Failed to update workshop. Please try again.", "تعذّر تحديث الورشة. حاول مرة أخرى."));
    }
    setToggling(t => ({ ...t, [key]: false }));
  };

  const del = async (id: number) => {
    if (!confirm(tr("Delete this live workshop? This cannot be undone.", "حذف هذه الورشة المباشرة؟ لا يمكن التراجع."))) return;
    try {
      await api.delete(`/api/live-workshops/${id}`);
      void load();
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    }
  };

  const upcoming = workshops.filter(w => !isPast(w.scheduledAt));
  const past     = workshops.filter(w =>  isPast(w.scheduledAt));
  const totalRegs = workshops.reduce((s, w) => s + w.registrationCount, 0);

  return (
    <>
      {/* Sub-stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{upcoming.length}</p>
          <p className="text-[11px] text-muted mt-0.5">{tr("Upcoming", "القادمة")}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{workshops.length}</p>
          <p className="text-[11px] text-muted mt-0.5">{tr("Total Sessions", "إجمالي الجلسات")}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalRegs}</p>
          <p className="text-[11px] text-muted mt-0.5">{tr("Total Registrations", "إجمالي التسجيلات")}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">{tr("Live Sessions", "الجلسات المباشرة")}</h3>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
          <Plus size={13} /> {tr("Create", "إنشاء")}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="glass-card h-20 animate-pulse" />)}
        </div>
      ) : workshops.length === 0 ? (
        <div className="glass-card p-12 text-center text-sm text-muted">
          {tr("No live workshops yet. Create one to get started.", "لا توجد ورش مباشرة بعد. أنشئ واحدة للبدء.")}
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100dvh-22rem)] overflow-y-auto pr-1">
          {[...upcoming, ...past].map((w, i) => {
            const past_ = isPast(w.scheduledAt);
            const spots = w.maxRegistrants ? `${w.registrationCount}/${w.maxRegistrants}` : `${w.registrationCount}`;
            return (
              <motion.div
                key={w.liveWorkshopId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card p-4 ${past_ ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Left: icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    past_ ? "bg-surface-elevated" : "bg-primary/10 border border-primary/20"
                  }`}>
                    <Radio size={15} className={past_ ? "text-muted" : "text-primary"} />
                  </div>

                  {/* Middle: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{w.title}</p>
                      {past_ && <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-elevated text-muted border border-border shrink-0">{tr("Past", "منتهية")}</span>}
                      {w.membersOnly && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">{tr("Members only", "للأعضاء فقط")}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                      <span className="flex items-center gap-1"><Calendar size={10} />{fmt(w.scheduledAt)}</span>
                      {w.presenter && <span>{w.presenter}</span>}
                      {w.location && <span className="flex items-center gap-1"><MapPin size={10} />{w.location}</span>}
                      {w.durationMin && <span className="flex items-center gap-1"><Clock size={10} />{w.durationMin} {tr("min", "د")}</span>}
                    </div>
                  </div>

                  {/* Right: controls */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Registrations count */}
                    <button
                      onClick={() => setViewRegsId(w.liveWorkshopId)}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      <Users size={12} />
                      <span className="font-medium">{spots}</span>
                      <Eye size={10} />
                    </button>

                    {/* Registration open toggle */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted uppercase tracking-wider hidden sm:block">{tr("Reg", "تسجيل")}</span>
                      <Toggle
                        checked={w.registrationOpen}
                        onChange={() => toggle(w, "registrationOpen")}
                        disabled={toggling[w.liveWorkshopId * 10 + 1]}
                      />
                    </div>

                    {/* Published toggle */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted uppercase tracking-wider hidden sm:block">{tr("Pub", "نشر")}</span>
                      <Toggle
                        checked={w.isPublished}
                        onChange={() => toggle(w, "isPublished")}
                        disabled={toggling[w.liveWorkshopId * 10 + 2]}
                      />
                    </div>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingLive(w)}
                      aria-label={tr("Edit workshop", "تعديل الورشة")}
                      className="text-muted hover:text-foreground transition-colors p-1"
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => del(w.liveWorkshopId)}
                      className="text-muted hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSaved={load} />}
        {editingLive && <CreateModal key={`edit-${editingLive.liveWorkshopId}`} onClose={() => setEditingLive(null)} onSaved={load} editing={editingLive} />}
        {viewRegsId !== null && <RegList workshopId={viewRegsId} onClose={() => setViewRegsId(null)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Recorded workshop library ────────────────────────────────────────────────

const EMPTY_RECORDED = {
  title: "", titleAr: "", description: "", descriptionAr: "",
  category: "Software", presenter: "", durationMin: "",
  googleDriveFolderUrl: "", recordedDate: "", isPublished: false, membersOnly: false,
};

function RecordedWorkshopModal({ onClose, onSaved, editing }: { onClose: () => void; onSaved: () => void | Promise<unknown>; editing?: RecordedWorkshop | null }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const isEdit = Boolean(editing);
  const initialForm = useMemo(() => editing ? ({
    title: editing.title,
    titleAr: editing.titleAr ?? "",
    description: editing.description ?? "",
    descriptionAr: editing.descriptionAr ?? "",
    category: editing.category ?? "",
    presenter: editing.presenter ?? "",
    durationMin: editing.durationMin != null ? String(editing.durationMin) : "",
    googleDriveFolderUrl: editing.googleDriveFolderUrl ?? "",
    recordedDate: editing.recordedDate ?? "",
    isPublished: editing.isPublished,
    membersOnly: editing.membersOnly,
  }) : EMPTY_RECORDED, [editing]);
  const initialSessions = useMemo(() => {
    if (!editing || editing.sessions.length === 0) {
      return [{ title: "", titleAr: "", description: "", durationMin: "", googleDriveUrl: "" }];
    }
    return editing.sessions.map((s) => ({
      title: s.title,
      titleAr: s.titleAr ?? "",
      description: s.description ?? "",
      durationMin: s.durationMin != null ? String(s.durationMin) : "",
      googleDriveUrl: s.googleDriveUrl,
    }));
  }, [editing]);
  const [f, setF] = useState(initialForm);
  const [sessions, setSessions] = useState(initialSessions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all";
  const labelCls = "block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5";
  const set = (k: keyof typeof EMPTY_RECORDED) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const cleanSessions = sessions
        .map((session) => ({
          title: session.title.trim(),
          titleAr: session.titleAr.trim() || undefined,
          description: session.description.trim() || undefined,
          durationMin: session.durationMin ? Number(session.durationMin) : undefined,
          googleDriveUrl: session.googleDriveUrl.trim(),
        }))
        .filter((session) => session.title && session.googleDriveUrl);

      const payload = {
        title: f.title,
        titleAr: f.titleAr || undefined,
        description: f.description || undefined,
        descriptionAr: f.descriptionAr || undefined,
        category: f.category || undefined,
        presenter: f.presenter || undefined,
        durationMin: f.durationMin ? Number(f.durationMin) : undefined,
        googleDriveFolderUrl: f.googleDriveFolderUrl || undefined,
        videoUrl: f.googleDriveFolderUrl || undefined,
        recordedDate: f.recordedDate || undefined,
        isPublished: f.isPublished,
        membersOnly: f.membersOnly,
        sessions: cleanSessions,
      };
      if (isEdit && editing) {
        await api.patch(`/api/workshops/${editing.workshopId}`, payload);
        await onSaved();
        toast.success(tr("Workshop updated.", "تم تحديث الورشة."));
      } else {
        await api.post("/api/workshops", payload);
        await onSaved();
        toast.success(tr("Workshop saved.", "تم حفظ الورشة."));
      }
      onClose();
    } catch (err: unknown) {
      const message = (err as { message?: string }).message ?? (isEdit ? "Failed to update workshop" : "Failed to create workshop library");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-3xl glass-card p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"><X size={18} /></button>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {isEdit ? tr("Edit Workshop", "تعديل الورشة") : tr("Add Google Drive Workshop", "إضافة ورشة من Google Drive")}
        </h2>
        <p className="mb-6 text-sm text-muted">{tr("Create one workshop library and attach each recorded session as a separate Drive link.", "أنشئ مكتبة ورشة واحدة وأضف كل جلسة مسجَّلة كرابط Drive منفصل.")}</p>
        {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>{tr("Workshop Title *", "عنوان الورشة *")}</label>
              <input required value={f.title} onChange={set("title")} placeholder={tr("Workshop title", "عنوان الورشة")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Arabic Title", "العنوان بالعربي")}</label>
              <input value={f.titleAr} onChange={set("titleAr")} placeholder="عنوان الورشة" dir="rtl" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>{tr("Description", "الوصف")}</label>
              <textarea value={f.description} onChange={set("description")} rows={2} placeholder={tr("What members will learn across the sessions.", "ماذا سيتعلم الأعضاء خلال الجلسات.")} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>{tr("Drive Folder URL", "رابط مجلد Drive")}</label>
              <input type="url" value={f.googleDriveFolderUrl} onChange={set("googleDriveFolderUrl")} placeholder="https://drive.google.com/drive/folders/..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Category", "التصنيف")}</label>
              <input value={f.category} onChange={set("category")} placeholder={tr("e.g. Software, Drones, Robotics", "مثل: برمجة، طائرات، روبوتات")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Presenter", "المُقدِّم")}</label>
              <input value={f.presenter} onChange={set("presenter")} placeholder={tr("Presenter name", "اسم المُقدِّم")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tr("Recorded Date", "تاريخ التسجيل")}</label>
              <input type="date" value={f.recordedDate} onChange={set("recordedDate")} className={inputCls} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-elevated/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tr("Sessions", "الجلسات")}</h3>
                <p className="mt-1 text-xs text-muted">{tr("Add every Google Drive recording in the order members should watch it.", "أضف كل تسجيل Drive بالترتيب الذي يجب أن يشاهده الأعضاء.")}</p>
              </div>
              <button type="button" onClick={() => setSessions((prev) => [...prev, { title: "", titleAr: "", description: "", durationMin: "", googleDriveUrl: "" }])} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                <Plus size={12} /> {tr("Session", "جلسة")}
              </button>
            </div>
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-border bg-background/30 p-3 md:grid-cols-[1fr_1fr_auto]">
                  <input required value={session.title} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} placeholder={tr(`Session ${index + 1} title`, `عنوان الجلسة ${index + 1}`)} className={inputCls} />
                  <input required type="url" value={session.googleDriveUrl} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, googleDriveUrl: event.target.value } : item))} placeholder={tr("Google Drive video URL", "رابط فيديو Google Drive")} className={inputCls} />
                  <input type="number" min={1} value={session.durationMin} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, durationMin: event.target.value } : item))} placeholder={tr("Min", "د")} className={`${inputCls} md:w-24`} />
                  <textarea value={session.description} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} rows={2} placeholder={tr("Optional session note", "ملاحظة اختيارية للجلسة")} className={`${inputCls} resize-none md:col-span-2`} />
                  <button type="button" onClick={() => setSessions((prev) => prev.filter((_, i) => i !== index))} disabled={sessions.length === 1} className="min-h-10 rounded-lg border border-border px-3 text-muted hover:text-red-400 disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-end">
            <div>
              <label className={labelCls}>{tr("Visibility", "الظهور")}</label>
              <select
                value={f.membersOnly ? "members_only" : "public"}
                onChange={(e) => setF((prev) => ({ ...prev, membersOnly: e.target.value === "members_only" }))}
                className={inputCls}
              >
                <option value="public">{tr("Public (any visitor)", "عام (لأي زائر)")}</option>
                <option value="members_only">{tr("Members only (signed-in)", "للأعضاء فقط (مسجلين)")}</option>
              </select>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Toggle checked={f.isPublished} onChange={() => setF((prev) => ({ ...prev, isPublished: !prev.isPublished }))} />
              <span className="text-sm text-foreground">{tr("Publish to public workshops page", "نشر في صفحة الورش العامة")}</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm flex-1">{tr("Cancel", "إلغاء")}</button>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex-1 disabled:opacity-60">
              {saving
                ? tr("Saving…", "جارٍ الحفظ…")
                : (isEdit ? tr("Save Changes", "حفظ التعديلات") : tr("Save Workshop", "حفظ الورشة"))}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function RecordedWorkshopsTab() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: workshops = [], isLoading: loading, mutate: load } = useApi<RecordedWorkshop[]>("/api/workshops");
  const [showCreate, setShowCreate] = useState(false);
  const [editingRecorded, setEditingRecorded] = useState<RecordedWorkshop | null>(null);

  async function togglePublished(workshop: RecordedWorkshop) {
    await api.patch(`/api/workshops/${workshop.workshopId}`, { isPublished: !workshop.isPublished });
    void load();
  }

  async function del(workshopId: number) {
    if (!confirm(tr("Delete this recorded workshop and its sessions?", "حذف هذه الورشة المسجَّلة وجميع جلساتها؟"))) return;
    await api.delete(`/api/workshops/${workshopId}`);
    void load();
  }

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-foreground">{workshops.length}</p><p className="mt-0.5 text-[11px] text-muted">{tr("Workshop Libraries", "مكتبات الورش")}</p></div>
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-primary">{workshops.reduce((sum, workshop) => sum + (workshop.sessions?.length ?? 0), 0)}</p><p className="mt-0.5 text-[11px] text-muted">{tr("Drive Sessions", "جلسات Drive")}</p></div>
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-foreground">{workshops.filter((workshop) => workshop.isPublished).length}</p><p className="mt-0.5 text-[11px] text-muted">{tr("Published", "منشور")}</p></div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">{tr("Member Development Library", "مكتبة تطوير الأعضاء")}</h3>
          <p className="mt-1 text-xs text-muted">{tr("Recorded workshops are organized by workshop, then session, with Google Drive links.", "الورش المسجَّلة منظَّمة حسب الورشة ثم الجلسة، مع روابط Google Drive.")}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"><Plus size={13} /> {tr("Add Workshop", "إضافة ورشة")}</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}</div>
      ) : workshops.length === 0 ? (
        <div className="glass-card p-12 text-center text-sm text-muted">{tr("No recorded workshop libraries yet.", "لا توجد مكتبات ورش مسجَّلة بعد.")}</div>
      ) : (
        <div className="space-y-3 max-h-[calc(100dvh-22rem)] overflow-y-auto pr-1">
          {workshops.map((workshop, index) => (
            <motion.div key={workshop.workshopId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="glass-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{workshop.title}</h4>
                    <span className="badge bg-surface-elevated text-muted border-border">{workshop.category ?? tr("Workshop", "ورشة")}</span>
                    <span className={workshop.isPublished ? "badge badge-success" : "badge"}>{workshop.isPublished ? tr("published", "منشور") : tr("draft", "مسودّة")}</span>
                    {workshop.membersOnly && (
                      <span className="badge bg-primary/10 text-primary border-primary/20">{tr("members only", "للأعضاء فقط")}</span>
                    )}
                  </div>
                  <p className="text-xs leading-5 text-muted">{workshop.description ?? tr("No description added.", "لم يُضف وصف.")}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1"><ListVideo size={11} />{workshop.sessions?.length ?? 0} {tr("sessions", "جلسات")}</span>
                    {workshop.presenter && <span>{workshop.presenter}</span>}
                    {workshop.recordedDate && <span>{new Date(workshop.recordedDate).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}</span>}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(workshop.sessions ?? []).slice(0, 4).map((session) => (
                      <a key={session.sessionId} href={toExternalUrl(session.googleDriveUrl)} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated/35 px-3 py-2 text-xs text-muted hover:text-foreground">
                        <span className="line-clamp-1">{session.orderIndex}. {session.title}</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {workshop.googleDriveFolderUrl && <a href={toExternalUrl(workshop.googleDriveFolderUrl)} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"><FolderOpen size={13} /> {tr("Folder", "المجلد")}</a>}
                  <Toggle checked={workshop.isPublished} onChange={() => void togglePublished(workshop)} />
                  <button onClick={() => setEditingRecorded(workshop)} aria-label={tr("Edit workshop", "تعديل الورشة")} className="min-h-10 rounded-lg border border-border px-3 text-muted hover:text-foreground"><Pencil size={14} /></button>
                  <button onClick={() => void del(workshop.workshopId)} className="min-h-10 rounded-lg border border-border px-3 text-muted hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <RecordedWorkshopModal onClose={() => setShowCreate(false)} onSaved={load} />}
        {editingRecorded && <RecordedWorkshopModal key={`edit-rec-${editingRecorded.workshopId}`} onClose={() => setEditingRecorded(null)} onSaved={load} editing={editingRecorded} />}
      </AnimatePresence>
    </>
  );
}

function CompanyVisitsTab() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [company, setCompany] = useState("");
  const [focus, setFocus] = useState("");
  const [contactRoute, setContactRoute] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [submitting, setSubmitting] = useState(false);

  const { data: visits = [], isLoading: loadingVisits, mutate: loadVisits } = useApi<ServiceRequestRow[]>(
    "/api/service-requests?scope=outbox&requestType=company_visit&sourceDepartment=development",
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!company.trim() || !focus.trim()) {
      toast.error(tr("Company name and focus are required.", "اسم الشركة ومجال التركيز مطلوبان."));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/service-requests", {
        requestType: "company_visit",
        targetDepartmentSlug: "pr",
        title: `${tr("Company visit request", "طلب زيارة شركة")} - ${company.trim()}`,
        description: [
          `${tr("Company", "الشركة")}: ${company.trim()}`,
          `${tr("Focus", "مجال التركيز")}: ${focus.trim()}`,
          contactRoute.trim() ? `${tr("Suggested contact route", "طريق التواصل المقترح")}: ${contactRoute.trim()}` : null,
        ].filter(Boolean).join("\n"),
        priority,
        attachmentUrls: [],
      });
      toast.success(tr("Visit request sent to PR.", "أُرسل طلب الزيارة إلى العلاقات العامة."));
      setCompany("");
      setFocus("");
      setContactRoute("");
      setPriority("medium");
      void loadVisits();
    } catch {
      toast.error(tr("Could not send. Please try again.", "تعذّر الإرسال. حاول مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  const statusTone: Record<ServiceRequestRow["status"], string> = {
    pending: "badge badge-warning",
    assigned: "badge badge-primary",
    in_progress: "badge bg-blue-500/10 text-blue-300 border-blue-500/20",
    completed: "badge badge-success",
    rejected: "badge bg-red-500/10 text-red-300 border-red-500/20",
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="mb-4 flex items-start gap-3">
          <Building2 size={17} className="mt-0.5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tr("Request a Company Visit", "اطلب زيارة شركة")}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{tr("Submit companies you want members to visit. PR will receive the request and own outreach. Track status below.", "أرسل الشركات التي تريد زيارتها مع الأعضاء. قسم العلاقات العامة يستلم الطلب ويتولّى التنسيق. تابع الحالة أدناه.")}</p>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Company *", "اسم الشركة *")}</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="dashboard-field" placeholder={tr("e.g. Aramco Digital", "مثل: أرامكو الرقمية")} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Priority", "الأولوية")}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="dashboard-select">
              <option value="low">{tr("Low", "منخفضة")}</option>
              <option value="medium">{tr("Medium", "متوسطة")}</option>
              <option value="high">{tr("High", "مرتفعة")}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Focus area *", "مجال التركيز *")}</label>
            <textarea value={focus} onChange={(e) => setFocus(e.target.value)} rows={2} className="dashboard-field resize-none" placeholder={tr("What members would learn from the visit", "ما الذي سيتعلمه الأعضاء من الزيارة")} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Suggested contact route", "طريق التواصل المقترح")}</label>
            <input value={contactRoute} onChange={(e) => setContactRoute(e.target.value)} className="dashboard-field" placeholder={tr("e.g. University relations team, talent outreach", "مثل: فريق علاقات الجامعات، التواصل مع المواهب")} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {tr("Send to PR", "إرسال إلى العلاقات العامة")}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{tr("Tracking", "متابعة الطلبات")}</h3>
        {loadingVisits ? (
          <div className="glass-card flex min-h-[120px] items-center justify-center"><Loader2 size={18} className="animate-spin text-muted" /></div>
        ) : visits.length === 0 ? (
          <div className="glass-card p-6 text-center text-sm text-muted">{tr("No visit requests yet. Submit one above.", "لا توجد طلبات زيارة بعد. أرسل طلباً من الأعلى.")}</div>
        ) : (
          <div className="space-y-2 max-h-[calc(100dvh-30rem)] overflow-y-auto pr-1">
            {visits.map((req) => (
              <div key={req.requestId} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{req.title}</p>
                      <span className={statusTone[req.status]}>{req.status.replace("_", " ")}</span>
                      <span className={req.priority === "high" ? "badge badge-warning" : req.priority === "medium" ? "badge badge-primary" : "badge"}>{req.priority}</span>
                    </div>
                    {req.description && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-muted">{req.description}</p>}
                    {req.assigneeNote && (
                      <p className="mt-2 rounded-lg border border-border bg-surface-elevated/30 px-3 py-2 text-xs leading-5 text-muted">
                        <span className="font-medium text-foreground">{tr("PR note", "ملاحظة العلاقات العامة")}:</span> {req.assigneeNote}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted">
                      {new Date(req.requestedAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                      {req.assigneeName ? ` · ${tr("handled by", "يتولّاه")} ${req.assigneeName}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = "board" | "team" | "projects" | "live" | "library" | "requests" | "visits" | "operations";

interface ServiceRequestRow {
  requestId: number;
  requestType: "design" | "workshop" | "project_media" | "company_visit";
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "assigned" | "in_progress" | "completed" | "rejected";
  sourceDepartmentSlug: string | null;
  sourceDepartmentName: string | null;
  targetDepartmentSlug: string | null;
  targetDepartmentName: string | null;
  requestedBy: number | null;
  requestedByName: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  assigneeNote: string | null;
  attachmentUrls: string[];
  requestedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

function WorkshopRequestsInbox() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [statusFilter, setStatusFilter] = useState<"pending" | "assigned" | "in_progress" | "completed" | "rejected">("pending");
  const [actingId, setActingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: allRows = [], isLoading: loading, mutate: load } = useApi<ServiceRequestRow[]>(
    "/api/service-requests?scope=inbox&requestType=workshop&targetDepartment=development",
  );
  const rows = useMemo(() => allRows.filter((r) => r.status === statusFilter), [allRows, statusFilter]);

  async function setStatus(request: ServiceRequestRow, status: "assigned" | "in_progress" | "completed", note?: string) {
    setActingId(request.requestId);
    try {
      await api.patch(`/api/service-requests/${request.requestId}`, { status, ...(note ? { assigneeNote: note } : {}) });
      toast.success(tr("Status updated", "تم تحديث الحالة"));
      load();
    } catch {
      toast.error(tr("Update failed. Please try again.", "فشل التحديث. حاول مرة أخرى."));
    } finally {
      setActingId(null);
    }
  }

  async function rejectWithReason(request: ServiceRequestRow) {
    if (!rejectReason.trim()) {
      toast.error(tr("Please enter a reason for rejection.", "يرجى إدخال سبب الرفض."));
      return;
    }
    setActingId(request.requestId);
    try {
      await api.patch(`/api/service-requests/${request.requestId}`, {
        status: "rejected",
        assigneeNote: rejectReason.trim(),
      });
      toast.success(tr("Request rejected", "تم رفض الطلب"));
      setRejectingId(null);
      setRejectReason("");
      load();
    } catch {
      toast.error(tr("Reject failed. Please try again.", "فشل الرفض. حاول مرة أخرى."));
    } finally {
      setActingId(null);
    }
  }

  const filterButtons: { key: typeof statusFilter; label: string }[] = [
    { key: "pending",     label: tr("Pending",     "قيد الانتظار") },
    { key: "assigned",    label: tr("Accepted",    "مقبول") },
    { key: "in_progress", label: tr("In Progress", "قيد التنفيذ") },
    { key: "completed",   label: tr("Completed",   "مكتمل") },
    { key: "rejected",    label: tr("Rejected",    "مرفوض") },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {tr("Workshop Requests", "طلبات الورش")}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {tr(
              "Workshop requests sent by other department leaders. Accept to start building, or reject with a reason so the requester knows why.",
              "طلبات ورش يقدّمها قادة الأقسام الأخرى. اقبل لبدء البناء، أو ارفض مع توضيح السبب ليفهم مقدِّم الطلب.",
            )}
          </p>
        </div>
        <div className="tab-rail" role="tablist" aria-label={tr("Request status", "حالة الطلب")}>
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              data-active={statusFilter === key}
              role="tab"
              aria-selected={statusFilter === key}
              className="tab-pill"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          {tr("Loading…", "يتم التحميل…")}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-muted">
          {tr("No requests in this list.", "لا توجد طلبات في هذه القائمة.")}
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100dvh-22rem)] overflow-y-auto pr-1">
          {rows.map((req) => (
            <div key={req.requestId} className="glass-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">{req.title}</h4>
                    <span className="text-[10px] font-medium uppercase tracking-wider rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                      {req.priority === "high"
                        ? tr("High", "مرتفع")
                        : req.priority === "medium"
                          ? tr("Medium", "متوسط")
                          : tr("Low", "منخفض")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {tr(`From ${req.sourceDepartmentName ?? "—"}`, `من ${req.sourceDepartmentName ?? "—"}`)}
                    {req.requestedByName ? ` · ${req.requestedByName}` : ""}
                  </p>
                  {req.description && (
                    <p className="mt-2 text-xs leading-5 text-foreground/80 whitespace-pre-wrap">{req.description}</p>
                  )}
                  {req.assigneeNote && (
                    <p className="mt-2 text-xs leading-5 text-muted whitespace-pre-wrap">
                      <span className="font-medium">{tr("Note", "ملاحظة")}:</span> {req.assigneeNote}
                    </p>
                  )}
                </div>
                {statusFilter === "pending" && rejectingId !== req.requestId && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => { setRejectingId(req.requestId); setRejectReason(""); }}
                      disabled={actingId === req.requestId}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-error hover:border-error/30 hover:bg-error/10 text-xs transition-colors disabled:opacity-40"
                    >
                      {tr("Reject", "رفض")}
                    </button>
                    <button
                      onClick={() => setStatus(req, "assigned")}
                      disabled={actingId === req.requestId}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      {tr("Accept", "قبول")}
                    </button>
                  </div>
                )}
                {statusFilter === "assigned" && (
                  <button
                    onClick={() => setStatus(req, "in_progress")}
                    disabled={actingId === req.requestId}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    {tr("Mark in progress", "تحت التنفيذ")}
                  </button>
                )}
                {statusFilter === "in_progress" && (
                  <button
                    onClick={() => setStatus(req, "completed")}
                    disabled={actingId === req.requestId}
                    className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    {tr("Mark complete", "إكمال")}
                  </button>
                )}
              </div>

              {rejectingId === req.requestId && (
                <div className="rounded-xl border border-error/30 bg-error/5 p-3 space-y-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {tr("Rejection reason", "سبب الرفض")}
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder={tr("Explain why this workshop can't be built right now.", "اشرح لماذا لا يمكن بناء هذه الورشة الآن.")}
                    className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/40 resize-none"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground text-xs"
                    >
                      {tr("Cancel", "إلغاء")}
                    </button>
                    <button
                      onClick={() => rejectWithReason(req)}
                      disabled={!rejectReason.trim() || actingId === req.requestId}
                      className="px-3 py-1.5 rounded-lg bg-error/15 border border-error/30 text-error text-xs disabled:opacity-40"
                    >
                      {tr("Confirm reject", "تأكيد الرفض")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DevProject {
  projectId: number;
  title: string;
  status: string;
  taskCount?: number | null;
  doneCount?: number | null;
  departmentSlug: string | null;
}

function DevProjectsPanel() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: projects = [], isLoading: loading } = useApi<DevProject[]>("/api/projects?department=development");

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-border bg-surface-elevated/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="glass-card p-10 text-center text-sm text-muted">
        {tr("No development projects yet. Create one in Innovation, then assign it to development.",
            "لا توجد مشاريع تطوير. أنشئ مشروعاً من الابتكار وعيّنه للتطوير.")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project, i) => {
        const total = project.taskCount ?? 0;
        const done = project.doneCount ?? 0;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <motion.div
            key={project.projectId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-5 card-hover"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Code size={14} className="text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{project.title}</h4>
                  <p className="text-[11px] text-muted">
                    {total > 0
                      ? tr(`${done}/${total} tasks completed`, `${done}/${total} مهام مكتملة`)
                      : tr(`Status: ${project.status}`, `الحالة: ${project.status}`)}
                  </p>
                </div>
              </div>
              {total > 0 ? <span className="text-sm font-bold text-foreground">{progress}%</span> : null}
            </div>
            {total > 0 ? (
              <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-primary to-primary-dim rounded-full"
                />
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function DevelopmentDashboard() {
  const { lang } = useLang();
  const [activeView, setActiveView] = useState<View>("board");
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { data: statsProjects = [] } = useApi<{ status: string }[]>("/api/projects?department=development");
  const { data: statsTasks = [] } = useApi<{ status: string; completedAt: string | null }[]>("/api/tasks?department=development");
  const { data: statsWorkshops = [] } = useApi<{ sessions?: unknown[] }[]>("/api/workshops");

  const stats = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      activeProjects: statsProjects.filter((p) => p.status === "active").length,
      openTasks: statsTasks.filter((t) => t.status !== "done").length,
      completedThisMonth: statsTasks.filter((t) => t.completedAt && new Date(t.completedAt).getTime() >= monthAgo).length,
      driveSessions: statsWorkshops.reduce((sum, w) => sum + ((w.sessions as unknown[] | undefined)?.length ?? 0), 0),
    };
  }, [statsProjects, statsTasks, statsWorkshops]);

  return (
    <div>
      <DashboardHeader
        title={tr("Development", "التطوير")}
        description={tr("Develop members through projects, workshops, and technical company visit opportunities.", "طوّر الأعضاء عبر المشاريع والورش وفرص الزيارات التقنية للشركات.")}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard icon={Code}         label={tr("Active Projects", "المشاريع النشطة")}       value={stats.activeProjects}      onClick={() => setActiveView("projects")} />
        <StatCard icon={GitBranch}    label={tr("Open Tasks", "المهام المفتوحة")}            value={stats.openTasks}            onClick={() => setActiveView("board")} />
        <StatCard icon={CheckCircle2} label={tr("Completed This Month", "المكتمل هذا الشهر")}  value={stats.completedThisMonth}  onClick={() => setActiveView("board")} />
        <StatCard icon={Zap}          label={tr("Drive Sessions", "جلسات درايف")}             value={stats.driveSessions}        onClick={() => setActiveView("live")} />
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 mb-6 bg-surface-elevated rounded-lg p-1 w-fit overflow-x-auto" role="tablist" aria-label={tr("Development sections", "أقسام التطوير")}>
        {([
          { key: "board",      label: tr("Task Board",      "لوحة المهام") },
          { key: "team",       label: tr("Team Performance","أداء الفريق") },
          { key: "projects",   label: tr("Projects",        "المشاريع") },
          { key: "live",       label: tr("Live Workshops",  "ورش مباشرة") },
          { key: "library",    label: tr("Workshop Library","مكتبة الورش") },
          { key: "requests",   label: tr("Workshop Requests","طلبات الورش") },
          { key: "visits",     label: tr("Company Visits",  "زيارات الشركات") },
          { key: "operations", label: tr("Operations",      "التشغيل") },
        ] as { key: View; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            role="tab"
            aria-selected={activeView === key}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground"
            }`}
          >
            {key === "live" && <Radio size={12} className={activeView === "live" ? "text-primary" : "text-muted"} />}
            {key === "library" && <FolderOpen size={12} className={activeView === "library" ? "text-primary" : "text-muted"} />}
            {key === "visits" && <Building2 size={12} className={activeView === "visits" ? "text-primary" : "text-muted"} />}
            {label}
          </button>
        ))}
      </div>

      {/* Task Board */}
      {activeView === "board" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <LeaderTaskReviewPanel
            department="development"
            title="Development task review"
            titleAr="مراجعة مهام التطوير"
          />
        </motion.div>
      )}

      {/* Team Performance */}
      {activeView === "team" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <MemberPerformancePanel defaultDepartment="development" showDepartmentFilter={false} />
        </motion.div>
      )}

      {/* Projects */}
      {activeView === "projects" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <DevProjectsPanel />
        </motion.div>
      )}

      {/* Live Workshops */}
      {activeView === "live" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <LiveWorkshopsTab />
        </motion.div>
      )}

      {activeView === "library" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <RecordedWorkshopsTab />
        </motion.div>
      )}

      {activeView === "requests" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <WorkshopRequestsInbox />
        </motion.div>
      )}

      {activeView === "visits" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <CompanyVisitsTab />
        </motion.div>
      )}

      {activeView === "operations" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <DepartmentOperationsPanel departmentSlug="development" title={tr("Development budget, procurement, and workshop requests", "ميزانية التطوير والمشتريات وطلبات الورش")} />
        </motion.div>
      )}

    </div>
  );
}
