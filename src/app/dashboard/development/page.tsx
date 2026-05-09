"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code, GitBranch, CheckCircle2, Zap, Radio,
  Plus, X, Users, Calendar, Clock, MapPin, Trash2, Eye,
  FolderOpen, ListVideo, ExternalLink, Building2, Send,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DepartmentOperationsPanel } from "@/components/dashboard/DepartmentOperationsPanel";
import { LeaderTaskReviewPanel } from "@/components/dashboard/LeaderTaskReviewPanel";
import { MemberPerformancePanel } from "@/components/dashboard/MemberPerformancePanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChangeRequestInbox } from "@/components/dashboard/ChangeRequestInbox";
import { api } from "@/lib/client";
import { useApi } from "@/lib/hooks/useApi";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveWorkshop {
  liveWorkshopId: number;
  title: string;
  description: string | null;
  presenter: string | null;
  scheduledAt: string;
  durationMin: number | null;
  location: string | null;
  meetingUrl: string | null;
  maxRegistrants: number | null;
  registrationOpen: boolean;
  isPublished: boolean;
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
      onClick={onChange}
      disabled={disabled}
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
  registrationOpen: false, isPublished: false,
};

interface CreateModalProps { onClose: () => void; onCreated: () => void }

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [f, setF] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF(prev => ({ ...prev, [k]: e.target.value }));

  const setCheck = (k: "registrationOpen" | "isPublished") =>
    setF(prev => ({ ...prev, [k]: !prev[k] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/api/live-workshops", {
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
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "Failed to create workshop");
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
        <h2 className="text-lg font-bold text-foreground mb-6">Create Live Workshop</h2>

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Title (EN) *</label>
              <input required value={f.title} onChange={set("title")} placeholder="Workshop title" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Title (AR)</label>
              <input value={f.titleAr} onChange={set("titleAr")} placeholder="عنوان الورشة" dir="rtl" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={f.description} onChange={set("description")} rows={2} placeholder="What will attendees learn?" className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Presenter</label>
              <input value={f.presenter} onChange={set("presenter")} placeholder="e.g. Abdulaziz Al-Byood" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Date & Time *</label>
              <input required type="datetime-local" value={f.scheduledAt} onChange={set("scheduledAt")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input type="number" min={1} value={f.durationMin} onChange={set("durationMin")} placeholder="90" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Location / Room</label>
              <input value={f.location} onChange={set("location")} placeholder="e.g. Room 204, Zoom" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Meeting URL</label>
              <input type="url" value={f.meetingUrl} onChange={set("meetingUrl")} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Registrants</label>
              <input type="number" min={1} value={f.maxRegistrants} onChange={set("maxRegistrants")} placeholder="Leave empty for unlimited" className={inputCls} />
            </div>
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Toggle checked={f.isPublished} onChange={() => setCheck("isPublished")} />
              <span className="text-sm text-foreground">Publish (visible to public)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Toggle checked={f.registrationOpen} onChange={() => setCheck("registrationOpen")} />
              <span className="text-sm text-foreground">Open registration</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex-1 disabled:opacity-60">
              {saving ? "Creating…" : "Create Workshop"}
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
          <h2 className="text-base font-bold text-foreground">Registrations</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted">Loading…</div>
          ) : regs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No registrations yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-muted">
                  {["Name", "Email", "Uni ID", "Dept", "Registered"].map(h => (
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
                      {new Date(r.registeredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <p className="text-xs text-muted">{regs.length} total registrant{regs.length !== 1 ? "s" : ""}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Live Workshops tab ───────────────────────────────────────────────────────

function LiveWorkshopsTab() {
  const { data: workshops = [], isLoading: loading, mutate: load } = useApi<LiveWorkshop[]>("/api/live-workshops");
  const [showCreate, setShowCreate] = useState(false);
  const [viewRegsId, setViewRegsId] = useState<number | null>(null);
  const [toggling, setToggling] = useState<Record<number, boolean>>({});

  const toggle = async (w: LiveWorkshop, field: "registrationOpen" | "isPublished") => {
    const key = w.liveWorkshopId * 10 + (field === "registrationOpen" ? 1 : 2);
    setToggling(t => ({ ...t, [key]: true }));
    try {
      await api.patch(`/api/live-workshops/${w.liveWorkshopId}`, { [field]: !w[field] });
      void load();
    } catch {
      toast.error("Failed to update workshop. Please try again.");
    }
    setToggling(t => ({ ...t, [key]: false }));
  };

  const del = async (id: number) => {
    if (!confirm("Delete this live workshop? This cannot be undone.")) return;
    try {
      await api.delete(`/api/live-workshops/${id}`);
      void load();
    } catch {
      toast.error("Delete failed. Please try again.");
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
          <p className="text-[11px] text-muted mt-0.5">Upcoming</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{workshops.length}</p>
          <p className="text-[11px] text-muted mt-0.5">Total Sessions</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalRegs}</p>
          <p className="text-[11px] text-muted mt-0.5">Total Registrations</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Live Sessions</h3>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
          <Plus size={13} /> Create
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="glass-card h-20 animate-pulse" />)}
        </div>
      ) : workshops.length === 0 ? (
        <div className="glass-card p-12 text-center text-sm text-muted">
          No live workshops yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
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
                      {past_ && <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-elevated text-muted border border-border shrink-0">Past</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                      <span className="flex items-center gap-1"><Calendar size={10} />{fmt(w.scheduledAt)}</span>
                      {w.presenter && <span>{w.presenter}</span>}
                      {w.location && <span className="flex items-center gap-1"><MapPin size={10} />{w.location}</span>}
                      {w.durationMin && <span className="flex items-center gap-1"><Clock size={10} />{w.durationMin} min</span>}
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
                      <span className="text-[10px] text-muted uppercase tracking-wider hidden sm:block">Reg</span>
                      <Toggle
                        checked={w.registrationOpen}
                        onChange={() => toggle(w, "registrationOpen")}
                        disabled={toggling[w.liveWorkshopId * 10 + 1]}
                      />
                    </div>

                    {/* Published toggle */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted uppercase tracking-wider hidden sm:block">Pub</span>
                      <Toggle
                        checked={w.isPublished}
                        onChange={() => toggle(w, "isPublished")}
                        disabled={toggling[w.liveWorkshopId * 10 + 2]}
                      />
                    </div>

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
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
        {viewRegsId !== null && <RegList workshopId={viewRegsId} onClose={() => setViewRegsId(null)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Recorded workshop library ────────────────────────────────────────────────

const EMPTY_RECORDED = {
  title: "", titleAr: "", description: "", descriptionAr: "",
  category: "Software", presenter: "", durationMin: "",
  googleDriveFolderUrl: "", recordedDate: "", isPublished: false,
};

function RecordedWorkshopModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState(EMPTY_RECORDED);
  const [sessions, setSessions] = useState([{ title: "", titleAr: "", description: "", durationMin: "", googleDriveUrl: "" }]);
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

      await api.post("/api/workshops", {
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
        sessions: cleanSessions,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "Failed to create workshop library");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-3xl glass-card p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"><X size={18} /></button>
        <h2 className="text-lg font-bold text-foreground mb-2">Add Google Drive Workshop</h2>
        <p className="mb-6 text-sm text-muted">Create one workshop library and attach each recorded session as a separate Drive link.</p>
        {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Workshop Title *</label>
              <input required value={f.title} onChange={set("title")} placeholder="ROS2 Foundations" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Arabic Title</label>
              <input value={f.titleAr} onChange={set("titleAr")} placeholder="عنوان الورشة" dir="rtl" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={f.description} onChange={set("description")} rows={2} placeholder="What members will learn across the sessions." className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Drive Folder URL</label>
              <input type="url" value={f.googleDriveFolderUrl} onChange={set("googleDriveFolderUrl")} placeholder="https://drive.google.com/drive/folders/..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={f.category} onChange={set("category")} className={inputCls}>
                {["Software", "Drones", "Robotics", "AI", "Fabrication", "Racing"].map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Presenter</label>
              <input value={f.presenter} onChange={set("presenter")} placeholder="Presenter name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Recorded Date</label>
              <input type="date" value={f.recordedDate} onChange={set("recordedDate")} className={inputCls} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-elevated/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Sessions</h3>
                <p className="mt-1 text-xs text-muted">Add every Google Drive recording in the order members should watch it.</p>
              </div>
              <button type="button" onClick={() => setSessions((prev) => [...prev, { title: "", titleAr: "", description: "", durationMin: "", googleDriveUrl: "" }])} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                <Plus size={12} /> Session
              </button>
            </div>
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-border bg-background/30 p-3 md:grid-cols-[1fr_1fr_auto]">
                  <input required value={session.title} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} placeholder={`Session ${index + 1} title`} className={inputCls} />
                  <input required type="url" value={session.googleDriveUrl} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, googleDriveUrl: event.target.value } : item))} placeholder="Google Drive video URL" className={inputCls} />
                  <input type="number" min={1} value={session.durationMin} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, durationMin: event.target.value } : item))} placeholder="Min" className={`${inputCls} md:w-24`} />
                  <textarea value={session.description} onChange={(event) => setSessions((prev) => prev.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} rows={2} placeholder="Optional session note" className={`${inputCls} resize-none md:col-span-2`} />
                  <button type="button" onClick={() => setSessions((prev) => prev.filter((_, i) => i !== index))} disabled={sessions.length === 1} className="min-h-10 rounded-lg border border-border px-3 text-muted hover:text-red-400 disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <Toggle checked={f.isPublished} onChange={() => setF((prev) => ({ ...prev, isPublished: !prev.isPublished }))} />
            <span className="text-sm text-foreground">Publish to public workshops page</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex-1 disabled:opacity-60">{saving ? "Saving..." : "Save Workshop"}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function RecordedWorkshopsTab() {
  const { data: workshops = [], isLoading: loading, mutate: load } = useApi<RecordedWorkshop[]>("/api/workshops");
  const [showCreate, setShowCreate] = useState(false);

  async function togglePublished(workshop: RecordedWorkshop) {
    await api.patch(`/api/workshops/${workshop.workshopId}`, { isPublished: !workshop.isPublished });
    void load();
  }

  async function del(workshopId: number) {
    if (!confirm("Delete this recorded workshop and its sessions?")) return;
    await api.delete(`/api/workshops/${workshopId}`);
    void load();
  }

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-foreground">{workshops.length}</p><p className="mt-0.5 text-[11px] text-muted">Workshop Libraries</p></div>
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-primary">{workshops.reduce((sum, workshop) => sum + (workshop.sessions?.length ?? 0), 0)}</p><p className="mt-0.5 text-[11px] text-muted">Drive Sessions</p></div>
        <div className="glass-card p-4 text-center"><p className="text-2xl font-bold text-foreground">{workshops.filter((workshop) => workshop.isPublished).length}</p><p className="mt-0.5 text-[11px] text-muted">Published</p></div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Member Development Library</h3>
          <p className="mt-1 text-xs text-muted">Recorded workshops are organized by workshop, then session, with Google Drive links.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"><Plus size={13} /> Add Workshop</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}</div>
      ) : workshops.length === 0 ? (
        <div className="glass-card p-12 text-center text-sm text-muted">No recorded workshop libraries yet.</div>
      ) : (
        <div className="space-y-3">
          {workshops.map((workshop, index) => (
            <motion.div key={workshop.workshopId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="glass-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{workshop.title}</h4>
                    <span className="badge bg-surface-elevated text-muted border-border">{workshop.category ?? "Workshop"}</span>
                    <span className={workshop.isPublished ? "badge badge-success" : "badge"}>{workshop.isPublished ? "published" : "draft"}</span>
                  </div>
                  <p className="text-xs leading-5 text-muted">{workshop.description ?? "No description added."}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1"><ListVideo size={11} />{workshop.sessions?.length ?? 0} sessions</span>
                    {workshop.presenter && <span>{workshop.presenter}</span>}
                    {workshop.recordedDate && <span>{new Date(workshop.recordedDate).toLocaleDateString()}</span>}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(workshop.sessions ?? []).slice(0, 4).map((session) => (
                      <a key={session.sessionId} href={session.googleDriveUrl} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated/35 px-3 py-2 text-xs text-muted hover:text-foreground">
                        <span className="line-clamp-1">{session.orderIndex}. {session.title}</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {workshop.googleDriveFolderUrl && <a href={workshop.googleDriveFolderUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"><FolderOpen size={13} /> Folder</a>}
                  <Toggle checked={workshop.isPublished} onChange={() => void togglePublished(workshop)} />
                  <button onClick={() => void del(workshop.workshopId)} className="min-h-10 rounded-lg border border-border px-3 text-muted hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <RecordedWorkshopModal onClose={() => setShowCreate(false)} onCreated={load} />}
      </AnimatePresence>
    </>
  );
}

const companyProspects = [
  { company: "Aramco Digital", focus: "Autonomy, robotics platforms, engineering careers", contact: "Innovation and emerging tech teams", priority: "high" },
  { company: "SABIC", focus: "Industrial automation, safety systems, applied robotics", contact: "University relations or talent outreach", priority: "medium" },
  { company: "Elm Company", focus: "Digital services, product engineering, smart-city systems", contact: "Early careers partnerships", priority: "medium" },
  { company: "STC Solutions", focus: "IoT, networks, cloud systems for robotics operations", contact: "Technical partnerships", priority: "low" },
] as const;

function CompanyVisitsTab() {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  async function requestVisit(prospect: typeof companyProspects[number]) {
    setSending(prospect.company);
    try {
      await api.post("/api/service-requests", {
        requestType: "company_visit",
        targetDepartmentSlug: "pr",
        title: `Company visit request - ${prospect.company}`,
        description: `Development recommends coordinating a member development visit with ${prospect.company}. Focus: ${prospect.focus}. Suggested contact route: ${prospect.contact}.`,
        priority: prospect.priority,
        attachmentUrls: [],
      });
      setSent((prev) => ({ ...prev, [prospect.company]: true }));
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex items-start gap-3">
          <Building2 size={17} className="mt-0.5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Company Visit Prospects</h3>
            <p className="mt-1 text-xs leading-5 text-muted">Development identifies technical companies that can help members see real engineering environments. PR receives the coordination request and owns outreach.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {companyProspects.map((prospect, index) => (
          <motion.div key={prospect.company} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{prospect.company}</h4>
                <p className="mt-2 text-xs leading-5 text-muted">{prospect.focus}</p>
                <p className="mt-3 text-[11px] text-muted">Contact route: {prospect.contact}</p>
              </div>
              <span className={prospect.priority === "high" ? "badge badge-warning" : "badge badge-primary"}>{prospect.priority}</span>
            </div>
            <button onClick={() => void requestVisit(prospect)} disabled={sending === prospect.company || sent[prospect.company]} className="btn-primary mt-4 inline-flex min-h-10 items-center gap-2 px-4 py-2 text-xs disabled:opacity-60">
              <Send size={12} />
              {sent[prospect.company] ? "Sent to PR" : sending === prospect.company ? "Sending..." : "Request PR Visit"}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = "board" | "team" | "projects" | "live" | "library" | "requests" | "visits" | "operations" | "changeRequests";

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
        <div className="space-y-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          { key: "changeRequests", label: tr("Change Requests","طلبات التغيير") },
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

      {activeView === "changeRequests" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <ChangeRequestInbox />
        </motion.div>
      )}
    </div>
  );
}
