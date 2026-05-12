"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  GitBranch,
  Link2,
  MapPin,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import { firstAndLastName } from "@/lib/format-name";
import { toExternalUrl } from "@/lib/url";
import { ContentImage } from "@/lib/ui-helpers";
import {
  archiveStateFromEventDates,
  archiveStateFromProjectStatus,
  galleryForItem,
  normalizeArchiveConfig,
  type ArchiveConfig,
  type ArchiveSectionKey,
} from "@/lib/project-archive";

type RouteKind = "projects" | "events" | "competitions";

interface Contributor {
  memberId: number;
  role: string;
  fullName: string;
  bio: string | null;
  linkedinUrl: string | null;
}

interface ProjectItem {
  projectId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  githubUrl: string | null;
  category: string | null;
  status: string;
  techStack: string[] | null;
  contributors: Contributor[];
  applicationsEnabled?: boolean;
  applicationRoles?: string[];
  myApplicationRoles?: string[];
}

interface EventItem {
  eventId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: string;
  category: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  seatsAvailable: number | null;
  requirements?: string | null;
}

function stateClass(state: "upcoming" | "live" | "completed") {
  if (state === "completed") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (state === "live") return "border-primary/25 bg-primary/10 text-primary";
  return "border-info/20 bg-info/10 text-info";
}

function stateDot(state: "upcoming" | "live" | "completed") {
  if (state === "completed") return "bg-emerald-400";
  if (state === "live") return "bg-primary";
  return "bg-amber-300";
}

const ARABIC_LOCALE = "ar-u-ca-gregory";

function formatDateRange(startTime: string, endTime: string | null, lang: "en" | "ar") {
  const locale = lang === "ar" ? ARABIC_LOCALE : "en-US";
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  const date = start.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  const startClock = start.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const endClock = end ? end.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }) : null;
  return endClock ? `${date} · ${startClock} - ${endClock}` : `${date} · ${startClock}`;
}

function MemberDialog({
  member,
  onClose,
}: {
  member: Contributor;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-[1.2rem] border border-border bg-surface p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
          Team Member
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {firstAndLastName(member.fullName)}
        </h2>
        {member.bio ? (
          <p className="mt-4 text-sm leading-7 text-muted">{member.bio}</p>
        ) : (
          <p className="mt-4 text-sm leading-7 text-muted">No public profile summary available yet.</p>
        )}
        {member.linkedinUrl ? (
          <a
            href={toExternalUrl(member.linkedinUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm text-primary transition-colors hover:border-primary/35 hover:text-primary-bright"
          >
            <Link2 size={14} />
            LinkedIn
            <ArrowUpRight size={13} />
          </a>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function ProjectApplicationPanel({
  project,
  t,
}: {
  project: ProjectItem;
  t: (key: string) => string;
}) {
  const roles = project.applicationRoles ?? [];
  const appliedRoles = new Set(project.myApplicationRoles ?? []);
  const [selectedRole, setSelectedRole] = useState<string>(roles[0] ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; body: string } | null>(null);

  useEffect(() => {
    if (!roles.includes(selectedRole)) setSelectedRole(roles[0] ?? "");
  }, [roles, selectedRole]);

  if (!project.applicationsEnabled || roles.length === 0) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRole || appliedRoles.has(selectedRole)) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post(`/api/projects/${project.projectId}/applications`, {
        role: selectedRole,
        note: note.trim() || undefined,
      });
      setMessage({ type: "success", body: t("projects.apply.success") });
      setNote("");
    } catch {
      setMessage({ type: "error", body: t("projects.apply.error") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
        {t("projects.apply.label")}
      </p>
      <h2 className="mt-3 text-xl font-semibold text-foreground">{t("projects.apply.title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{t("projects.apply.desc")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {roles.map((role) => {
          const applied = appliedRoles.has(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              disabled={applied}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                applied
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : selectedRole === role
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-surface-elevated text-muted hover:border-primary/25 hover:text-foreground"
              }`}
            >
              {role}
              {applied ? ` · ${t("projects.apply.applied")}` : ""}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("projects.apply.note")}
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder={t("projects.apply.notePlaceholder")}
            className="w-full rounded-[1rem] border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted/45 focus:border-primary/35 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </label>

        {message ? (
          <p className={`rounded-xl border px-3 py-2 text-xs ${message.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-400/20 bg-red-400/10 text-red-300"}`}>
            {message.body}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !selectedRole || appliedRoles.has(selectedRole)}
          className="btn-primary px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {saving ? t("projects.apply.submitting") : `${t("projects.apply.cta")} · ${selectedRole}`}
        </button>
      </form>
    </section>
  );
}

export default function ArchiveDetailPage() {
  const params = useParams<{ kind: RouteKind; id: string }>();
  const { t, lang } = useLang();
  const kind = (params.kind ?? "projects") as RouteKind;
  const id = Number(params.id);

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [eventItem, setEventItem] = useState<EventItem | null>(null);
  const [config, setConfig] = useState<ArchiveConfig>(normalizeArchiveConfig(null));
  const [selectedMember, setSelectedMember] = useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const configPromise = api
          .get<{ json: ArchiveConfig | null }>("/api/site-content/projects.archive.config")
          .then((response) => normalizeArchiveConfig(response?.json))
          .catch(() => normalizeArchiveConfig(null));

        if (kind === "projects") {
          const [projectList, archiveConfig] = await Promise.all([
            api.get<ProjectItem[]>("/api/projects/public").catch(() => []),
            configPromise,
          ]);
          if (!cancelled) {
            setProject(projectList.find((item) => item.projectId === id) ?? null);
            setConfig(archiveConfig);
          }
        } else {
          const [singleEvent, archiveConfig] = await Promise.all([
            api.get<EventItem>(`/api/events/${id}`).catch(() => null),
            configPromise,
          ]);
          if (!cancelled) {
            setEventItem(singleEvent && (kind === "competitions" ? singleEvent.type === "competition" : singleEvent.type !== "competition") ? singleEvent : null);
            setConfig(archiveConfig);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  const detail = useMemo(() => {
    if (kind === "projects" && project) {
      const section: ArchiveSectionKey = "projects";
      return {
        section,
        title: project.title,
        description: project.description,
        imageUrl: project.imageUrl,
        gallery: galleryForItem(config, section, project.projectId, project.imageUrl),
        state: archiveStateFromProjectStatus(project.status),
        category: project.category,
      };
    }

    if (eventItem) {
      const section = kind === "competitions" ? "competitions" : "events";
      return {
        section,
        title: eventItem.title,
        description: eventItem.description,
        imageUrl: eventItem.imageUrl,
        gallery: galleryForItem(config, section, eventItem.eventId, eventItem.imageUrl),
        state: archiveStateFromEventDates(eventItem.startTime, eventItem.endTime),
        category: eventItem.category,
      };
    }

    return null;
  }, [config, eventItem, kind, project]);

  if (loading) {
    return (
      <div className="px-6 py-32 text-center text-muted">Loading archive item…</div>
    );
  }

  if (!detail) {
    return (
      <div className="px-6 py-32 text-center">
        <p className="text-lg font-semibold text-foreground">Archive item not found.</p>
        <Link href="/projects" className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft size={14} />
          {t("projects.detail.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative px-6 pb-16 pt-28">
      <div className="mx-auto max-w-7xl">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
          <ArrowLeft size={14} />
          {t("projects.detail.back")}
        </Link>

        <section className="mt-6 card-feature overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="relative min-h-[15rem] border-b border-border bg-gradient-to-br from-surface-elevated via-secondary/10 to-primary/6 lg:min-h-[21rem] lg:border-b-0 lg:border-r">
              {detail.imageUrl ? (
                <ContentImage
                  src={detail.imageUrl}
                  alt={detail.title}
                  sizes="(max-width: 1280px) 100vw, 42vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-secondary/10 to-primary/6" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,15,0.06),rgba(3,7,15,0.12)_50%,rgba(3,7,15,0.34)_100%)]" />
              <div className="absolute inset-0 bg-circuit opacity-25" />
            </div>

            <div className="p-6 sm:p-8">
              <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${stateClass(detail.state)}`}>
                <span className={`h-2 w-2 rounded-full ${stateDot(detail.state)}`} />
                {t(`projects.state.${detail.state}`)}
              </span>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
                {detail.title}
              </h1>
              {detail.description ? (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                  {detail.description}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_22rem]">
          <div className="space-y-6">
            {detail.gallery.length > 0 ? (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                  {t("projects.detail.gallery")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {detail.gallery.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      className="group relative aspect-[4/3] overflow-hidden rounded-[1.1rem] border border-border bg-surface-elevated"
                    >
                      <ContentImage
                        src={imageUrl}
                        alt={`${detail.title} ${index + 1}`}
                        sizes="(max-width: 1280px) 50vw, 18vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,15,0.02),rgba(3,7,15,0.18)_65%,rgba(3,7,15,0.38)_100%)]" />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {kind === "projects" && project ? (
              <>
                {project.techStack && project.techStack.length > 0 ? (
                  <section className="glass-card p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                      {t("projects.detail.stack")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.techStack.map((item) => (
                        <span key={item} className="rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-muted">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="glass-card p-5">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary/75" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                      {t("projects.detail.members")}
                    </p>
                  </div>
                  {project.contributors.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {project.contributors.map((member) => (
                        <button
                          key={member.memberId}
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="rounded-[1.2rem] border border-border bg-surface/50 p-4 text-left transition-colors hover:border-primary/20 hover:bg-surface-elevated"
                        >
                          <p className="text-sm font-semibold text-foreground">{firstAndLastName(member.fullName)}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary/70">{member.role}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">{t("projects.detail.noMembers")}</p>
                  )}
                </section>

                <ProjectApplicationPanel project={project} t={t} />
              </>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="glass-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                {t("projects.detail.about")}
              </p>
              <div className="mt-4 space-y-4">
                {detail.category ? (
                  <div className="flex items-start gap-3">
                    <Wrench size={15} className="mt-0.5 text-primary/75" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {t("projects.detail.meta.category")}
                      </p>
                      <p className="mt-1 text-sm text-foreground">{detail.category}</p>
                    </div>
                  </div>
                ) : null}

                {kind !== "projects" && eventItem ? (
                  <>
                    <div className="flex items-start gap-3">
                      <CalendarDays size={15} className="mt-0.5 text-primary/75" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                          {t("projects.detail.meta.date")}
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {formatDateRange(eventItem.startTime, eventItem.endTime, lang)}
                        </p>
                      </div>
                    </div>

                    {eventItem.location ? (
                      <div className="flex items-start gap-3">
                        <MapPin size={15} className="mt-0.5 text-primary/75" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                            {t("projects.detail.meta.location")}
                          </p>
                          <p className="mt-1 text-sm text-foreground">{eventItem.location}</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-start gap-3">
                      <Trophy size={15} className="mt-0.5 text-primary/75" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                          {t("projects.detail.meta.type")}
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {t(eventItem.type === "competition" ? "events.type.competition" : eventItem.type === "workshop" ? "events.type.workshop" : eventItem.type === "meetup" ? "events.type.meetup" : "events.type.general")}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}

                {kind === "projects" && project?.githubUrl ? (
                  <a
                    href={toExternalUrl(project.githubUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:border-primary/35 hover:text-primary-bright"
                  >
                    <GitBranch size={14} />
                    {t("projects.detail.github")}
                    <ArrowUpRight size={13} />
                  </a>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {selectedMember ? <MemberDialog member={selectedMember} onClose={() => setSelectedMember(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
