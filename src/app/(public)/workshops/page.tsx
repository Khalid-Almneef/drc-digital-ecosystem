"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Calendar, Clock, MapPin, Users, X, CheckCircle, AlertCircle, Radio, FolderOpen, ListVideo, Maximize2 } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionAnchorBar } from "@/components/ui/SectionAnchorBar";
import { useLang } from "@/contexts/LanguageContext";
import { workshops as fallbackWorkshops, CATEGORY_COLORS } from "@/data/workshops";
import { api } from "@/lib/client";
import { toExternalUrl } from "@/lib/url";
import { DriveVideoPlayer } from "@/components/workshops/DriveVideoPlayer";

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
  maxRegistrants: number | null;
  registrationOpen: boolean;
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
  category: keyof typeof CATEGORY_COLORS | string | null;
  presenter: string | null;
  durationMin: number | null;
  videoUrl: string | null;
  googleDriveFolderUrl: string | null;
  thumbnailUrl: string | null;
  recordedDate: string | null;
  sessions: WorkshopSession[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string, lang = "en") {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string, lang = "en") {
  return new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function isPast(iso: string) {
  return new Date(iso) < new Date();
}

function spotsLeft(w: LiveWorkshop) {
  if (w.maxRegistrants === null) return null;
  return Math.max(0, w.maxRegistrants - w.registrationCount);
}

// ─── Registration Modal ───────────────────────────────────────────────────────

interface RegModalProps {
  workshop: LiveWorkshop;
  onClose: () => void;
}

function RegistrationModal({ workshop, onClose }: RegModalProps) {
  const { t, lang } = useLang();
  const [form, setForm] = useState({
    fullName: "", email: "", universityId: "", phone: "", department: "", notes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await api.post(`/api/live-workshops/${workshop.liveWorkshopId}/register`, {
        fullName: form.fullName,
        email: form.email,
        universityId: form.universityId || undefined,
        phone: form.phone || undefined,
        department: form.department || undefined,
        notes: form.notes || undefined,
      });
      setStatus("success");
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg((e as { message?: string }).message ?? t("workshops.modal.error"));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg glass-card p-8 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors">
          <X size={18} />
        </button>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{t("workshops.modal.success.title")}</h3>
            <p className="text-sm text-muted mb-1">
              {t("workshops.modal.success.desc")} <span className="text-foreground font-medium">{workshop.title}</span>.
            </p>
            <p className="text-xs text-muted">{formatDate(workshop.scheduledAt, lang)} {t("workshops.modal.at")} {formatTime(workshop.scheduledAt, lang)}</p>
            <button onClick={onClose} className="mt-6 btn-primary px-6 py-2.5 text-sm">{t("workshops.modal.success.done")}</button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
                <Radio size={10} className="animate-pulse" /> {t("workshops.modal.live")}
              </span>
              <h2 className="text-lg font-bold text-foreground leading-snug">{workshop.title}</h2>
              <p className="text-xs text-muted mt-1">
                {formatDate(workshop.scheduledAt, lang)} · {formatTime(workshop.scheduledAt, lang)}
                {workshop.location && <> · {workshop.location}</>}
              </p>
            </div>

            {status === "error" && (
              <div className="flex items-start gap-2.5 p-3 mb-4 rounded-lg bg-red-400/10 border border-red-400/20">
                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t("workshops.modal.fullName")}</label>
                  <input
                    required value={form.fullName} onChange={set("fullName")}
                    placeholder={t("workshops.modal.fullName.placeholder")}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t("workshops.modal.email")}</label>
                  <input
                    required type="email" value={form.email} onChange={set("email")}
                    placeholder={t("workshops.modal.email.placeholder")}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t("workshops.modal.universityId")}</label>
                  <input
                    value={form.universityId} onChange={set("universityId")}
                    placeholder={t("workshops.modal.optional")}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t("workshops.modal.phone")}</label>
                  <input
                    value={form.phone} onChange={set("phone")}
                    placeholder={t("workshops.modal.optional")}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t("workshops.modal.department")}</label>
                  <input
                    value={form.department} onChange={set("department")}
                    placeholder={t("workshops.modal.department.placeholder")}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t("workshops.modal.notes")}</label>
                  <textarea
                    value={form.notes} onChange={set("notes")} rows={2}
                    placeholder={t("workshops.modal.notes.placeholder")}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm flex-1">
                  {t("workshops.modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-primary px-5 py-2.5 text-sm flex-1 disabled:opacity-60"
                >
                  {status === "loading" ? t("workshops.modal.registering") : t("workshops.modal.register")}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Live Workshop Card ───────────────────────────────────────────────────────

function LiveCard({ workshop, onRegister, index }: { workshop: LiveWorkshop; onRegister: () => void; index: number }) {
  const { lang, t } = useLang();
  const past = isPast(workshop.scheduledAt);
  const spots = spotsLeft(workshop);
  const full = spots !== null && spots === 0;
  const title = (lang === "ar" && workshop.titleAr) ? workshop.titleAr : workshop.title;
  const desc = (lang === "ar" && workshop.descriptionAr) ? workshop.descriptionAr : workshop.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="card-feature overflow-hidden card-hover group"
    >
      {/* Top color bar */}
      <div className={`h-1 w-full ${past ? "bg-muted/20" : "bg-gradient-to-r from-primary to-secondary-light"}`} />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-2">
            {past ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface-elevated text-muted border border-border">
                {t("workshops.badge.completed")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping inline-block" />
                {t("workshops.badge.upcoming")}
              </span>
            )}
            {!past && workshop.registrationOpen && !full && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-400/10 text-green-400 border border-green-400/20">
                {t("workshops.badge.open")}
              </span>
            )}
            {!past && !workshop.registrationOpen && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface-elevated text-muted border border-border">
                {t("workshops.badge.closed")}
              </span>
            )}
            {full && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                {t("workshops.badge.full")}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-base font-bold text-foreground mb-1 leading-snug">{title}</h3>
        {workshop.presenter && (
          <p className="text-xs text-primary/70 font-medium mb-3">{t("workshops.live.by")} {workshop.presenter}</p>
        )}

        {desc && (
          <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2">{desc}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted mb-5">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-primary/50" />
            {formatDate(workshop.scheduledAt, lang)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-primary/50" />
            {formatTime(workshop.scheduledAt, lang)}
            {workshop.durationMin && <> · {workshop.durationMin} min</>}
          </span>
          {workshop.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="text-primary/50" />
              {workshop.location}
            </span>
          )}
          {workshop.maxRegistrants !== null && (
            <span className="flex items-center gap-1.5">
              <Users size={12} className="text-primary/50" />
              {workshop.registrationCount}/{workshop.maxRegistrants} {t("workshops.live.registered")}
            </span>
          )}
        </div>

        {/* CTA */}
        {!past && workshop.registrationOpen && !full && (
          <button
            onClick={onRegister}
            className="btn-primary px-5 py-2.5 text-sm w-full sm:w-auto"
          >
            {t("workshops.live.cta")}
          </button>
        )}
        {!past && full && (
          <p className="text-xs text-amber-400/80">{t("workshops.live.fullnote")}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkshopsPage() {
  const { lang, t } = useLang();
  const [liveWorkshops, setLiveWorkshops] = useState<LiveWorkshop[]>([]);
  const [recordedWorkshops, setRecordedWorkshops] = useState<RecordedWorkshop[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingRecorded, setLoadingRecorded] = useState(true);
  const [activeReg, setActiveReg] = useState<LiveWorkshop | null>(null);
  const [activeVideo, setActiveVideo] = useState<{
    watchId: string;
    driveUrl: string;
    title: string;
    titleAr: string | null;
    durationSec?: number;
  } | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const sectionAnchors = [
    { href: "#workshops-overview", label: t("workshops.anchor.overview") },
    { href: "#workshops-live", label: t("workshops.anchor.live") },
    { href: "#workshops-library", label: t("workshops.anchor.library") },
  ];
  const learningModes = [
    { title: t("workshops.modes.live.title"), body: t("workshops.modes.live.desc") },
    { title: t("workshops.modes.library.title"), body: t("workshops.modes.library.desc") },
    { title: t("workshops.modes.path.title"), body: t("workshops.modes.path.desc") },
  ];

  useEffect(() => {
    api.get<LiveWorkshop[]>("/api/live-workshops/public")
      .then((res) => setLiveWorkshops(res ?? []))
      .catch(() => {}) // silently fall back to empty (DB not connected yet)
      .finally(() => setLoadingLive(false));
  }, []);

  useEffect(() => {
    api.get<RecordedWorkshop[]>("/api/workshops/public")
      .then((res) => setRecordedWorkshops(res ?? []))
      .catch(() => {
        setRecordedWorkshops(fallbackWorkshops.map((workshop) => ({
          workshopId: workshop.id,
          title: workshop.title,
          titleAr: workshop.titleAr,
          description: workshop.description,
          descriptionAr: workshop.descriptionAr,
          category: workshop.category,
          presenter: workshop.presenter,
          durationMin: workshop.duration,
          videoUrl: workshop.videoUrl,
          googleDriveFolderUrl: workshop.videoUrl,
          thumbnailUrl: null,
          recordedDate: workshop.date,
          sessions: [{
            sessionId: workshop.id,
            workshopId: workshop.id,
            title: workshop.title,
            titleAr: workshop.titleAr,
            description: workshop.description,
            durationMin: workshop.duration,
            googleDriveUrl: workshop.videoUrl,
            orderIndex: 1,
          }],
        })));
      })
      .finally(() => setLoadingRecorded(false));
  }, []);

  const upcomingLive = liveWorkshops.filter(w => !isPast(w.scheduledAt));
  const pastLive     = liveWorkshops.filter(w =>  isPast(w.scheduledAt));

  return (
    <div className="relative">
      <PageHero
        label={t("workshops.hero.label")}
        title={t("workshops.hero.title")}
        accentText={t("workshops.hero.accent")}
        description={t("workshops.hero.desc")}
      />

      <SectionAnchorBar items={sectionAnchors} title={t("workshops.anchor.label")} lang={lang} className="mt-[-1.5rem] mb-6" />

      <section id="workshops-overview" className="relative px-6 pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="card-feature overflow-hidden p-6 sm:p-8">
            <div className="grid gap-3 lg:grid-cols-3">
              {learningModes.map((mode) => (
                <div key={mode.title} className="rounded-[1.4rem] border border-border bg-surface/50 p-5">
                  <p className="text-sm font-semibold text-foreground">{mode.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{mode.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live & Upcoming ── */}
      <section id="workshops-live" className="relative py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 mb-10">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <h2 className="text-xl font-bold text-foreground">{t("workshops.live.title")}</h2>
            <span className="text-xs text-muted bg-surface-elevated border border-border px-2 py-0.5 rounded-full">
              {upcomingLive.length} {t("workshops.live.sessions")}
            </span>
          </div>

          {loadingLive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1].map(i => (
                <div key={i} className="card-feature h-56 animate-pulse bg-surface-elevated" />
              ))}
            </div>
          ) : upcomingLive.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-border bg-surface/45 p-8">
              <p className="text-base font-semibold text-foreground">{t("workshops.empty.live.title")}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{t("workshops.empty.live.body")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcomingLive.map((w, i) => (
                <LiveCard key={w.liveWorkshopId} workshop={w} index={i} onRegister={() => setActiveReg(w)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Past live sessions (collapsed list) */}
      {pastLive.length > 0 && (
        <section className="relative pb-10 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">{t("workshops.live.past")}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastLive.map((w, i) => (
                <LiveCard key={w.liveWorkshopId} workshop={w} index={i} onRegister={() => {}} />
              ))}
            </div>
          </div>
        </section>
      )}

      {(upcomingLive.length > 0 || pastLive.length > 0 || !loadingLive) && (
        <div className="section-divider mx-6" />
      )}

      {/* ── Recorded workshops ── */}
      <section id="workshops-library" className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("workshops.library.label")}
            title={t("workshops.library.title")}
            description={t("workshops.library.desc")}
          />

          {loadingRecorded ? (
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card-feature h-80 animate-pulse bg-surface-elevated" />
              ))}
            </div>
          ) : recordedWorkshops.length === 0 ? (
            <div className="mt-16 rounded-[1.6rem] border border-dashed border-border bg-surface/45 p-8">
              <p className="text-base font-semibold text-foreground">{t("workshops.recorded.empty.title")}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{t("workshops.recorded.empty.desc")}</p>
            </div>
          ) : (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recordedWorkshops.map((workshop, i) => {
              const category = (workshop.category ?? "Software") as keyof typeof CATEGORY_COLORS;
              const accent = CATEGORY_COLORS[category] ?? "var(--primary)";
              const title = lang === "ar" && workshop.titleAr ? workshop.titleAr : workshop.title;
              const description = lang === "ar" && workshop.descriptionAr ? workshop.descriptionAr : workshop.description;
              const sessions = [...(workshop.sessions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
              const primaryLink = sessions[0]?.googleDriveUrl ?? workshop.googleDriveFolderUrl ?? workshop.videoUrl ?? "#";
              return (
                <motion.div
                  key={workshop.workshopId}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{ "--card-accent": accent } as React.CSSProperties}
                  className="card-feature card-accent-top overflow-hidden card-hover group"
                >
                  <div className="h-36 relative overflow-hidden" style={{ background: `linear-gradient(135deg, var(--surface-elevated) 0%, color-mix(in srgb, ${accent} 8%, transparent) 100%)` }}>
                    <div className="absolute inset-0 bg-circuit opacity-20" />
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-30" style={{ background: accent }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 border"
                        style={{ background: `${accent}22`, borderColor: `${accent}55` }}
                      >
                        <Play size={18} style={{ color: accent }} className="ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ color: accent, background: `${accent}18`, borderColor: `${accent}40` }}>
                        {workshop.category ?? t("workshops.category.default")}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="text-xs text-muted bg-surface/80 border border-border px-2 py-1 rounded-full font-mono">
                        {workshop.durationMin ?? sessions.reduce((sum, session) => sum + (session.durationMin ?? 0), 0)}{t("workshop.duration")}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-[11px] font-medium text-muted mb-1.5 font-mono tracking-wide">
                      {workshop.presenter ?? t("workshops.presenter.default")} · {workshop.recordedDate ?? t("workshops.recorded.default")}
                    </p>
                    <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">
                      {title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed mb-4 line-clamp-2">
                      {description}
                    </p>
                    <div className="mb-4 rounded-xl border border-border bg-surface-elevated/35 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                          <ListVideo size={12} className="text-primary" />
                          {sessions.length} {sessions.length === 1 ? t("workshops.sessions.one") : t("workshops.sessions.many")}
                        </span>
                        {workshop.googleDriveFolderUrl && (
                          <a href={toExternalUrl(workshop.googleDriveFolderUrl)} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] text-muted hover:text-foreground">
                            <FolderOpen size={11} />
                            {t("workshops.drive.label")}
                          </a>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {sessions.slice(0, 3).map((session) => {
                          const isExpanded = expandedSessionId === session.sessionId;
                          return (
                            <div key={session.sessionId} className="space-y-1.5">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedSessionId(isExpanded ? null : session.sessionId)}
                                  className="flex flex-1 min-h-9 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground"
                                  aria-expanded={isExpanded}
                                >
                                  <span className="flex items-center gap-2 text-start">
                                    <Play size={9} fill="currentColor" className={`shrink-0 transition-colors ${isExpanded ? "text-primary" : "text-muted"}`} />
                                    <span className="line-clamp-1">{lang === "ar" && session.titleAr ? session.titleAr : session.title}</span>
                                  </span>
                                  {session.durationMin && <span className="shrink-0 font-mono text-[10px]">{session.durationMin}m</span>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveVideo({
                                    watchId: `workshop-${workshop.workshopId}-session-${session.sessionId}`,
                                    driveUrl: session.googleDriveUrl,
                                    title: session.title,
                                    titleAr: session.titleAr,
                                    durationSec: session.durationMin ? session.durationMin * 60 : undefined,
                                  })}
                                  title={lang === "ar" ? "ملء الشاشة" : "Open full player"}
                                  aria-label={lang === "ar" ? "ملء الشاشة" : "Open full player"}
                                  className="rounded-lg border border-border bg-surface/40 p-1.5 text-muted transition-colors hover:border-primary/30 hover:text-foreground"
                                >
                                  <Maximize2 size={11} />
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="rounded-xl border border-border bg-background/50 p-1.5">
                                  <DriveVideoPlayer
                                    watchId={`workshop-${workshop.workshopId}-session-${session.sessionId}`}
                                    driveUrl={session.googleDriveUrl}
                                    title={session.title}
                                    titleAr={session.titleAr}
                                    durationSec={session.durationMin ? session.durationMin * 60 : undefined}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {sessions.length > 3 && <p className="px-2 text-[11px] text-muted">+{sessions.length - 3} {t("workshops.sessions.moreDrive")}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => sessions[0]
                        ? setActiveVideo({
                            watchId: `workshop-${workshop.workshopId}-session-${sessions[0].sessionId}`,
                            driveUrl: sessions[0].googleDriveUrl,
                            title: sessions[0].title,
                            titleAr: sessions[0].titleAr,
                            durationSec: sessions[0].durationMin ? sessions[0].durationMin * 60 : undefined,
                          })
                        : window.open(primaryLink, "_blank")}
                      className="inline-flex min-h-9 items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 hover:opacity-90"
                      style={{ color: accent, borderColor: `${accent}40`, background: `${accent}10` }}
                    >
                      <Play size={10} fill="currentColor" />
                      {t("workshop.watch")}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      </section>

      <PublicCustomSegments page="workshops" />

      {/* Registration modal */}
      <AnimatePresence>
        {activeReg && (
          <RegistrationModal workshop={activeReg} onClose={() => setActiveReg(null)} />
        )}
      </AnimatePresence>

      {/* In-page video player modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setActiveVideo(null)}
          >
            <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveVideo(null)}
                aria-label={lang === "ar" ? "إغلاق" : "Close"}
                className="absolute -top-3 end-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-lg transition-colors hover:border-primary/30"
              >
                <X size={16} />
              </button>
              <DriveVideoPlayer
                watchId={activeVideo.watchId}
                driveUrl={activeVideo.driveUrl}
                title={activeVideo.title}
                titleAr={activeVideo.titleAr}
                durationSec={activeVideo.durationSec}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
