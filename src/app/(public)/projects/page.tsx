"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, Lightbulb, Trophy } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RevealFade } from "@/components/ui/Reveal";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import { ContentImage } from "@/lib/ui-helpers";
import {
  archiveStateFromEventDates,
  archiveStateFromProjectStatus,
  eventArchiveSection,
  galleryForItem,
  normalizeArchiveConfig,
  sortArchiveItems,
  type ArchiveConfig,
  type ArchiveSectionKey,
} from "@/lib/project-archive";

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
  isFeatured: boolean;
  contributors: Contributor[];
}

interface EventItem {
  eventId: number | string;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  seatsAvailable?: number | null;
  imageUrl: string | null;
}

interface ArchiveCardItem {
  id: number;
  section: ArchiveSectionKey;
  title: string;
  imageUrl: string | null;
  coverImages: string[];
  href: string;
  state: "upcoming" | "live" | "completed";
  sortStamp: string;
}

type ArchiveFilter = "all" | ArchiveSectionKey;

// All public content comes from the API. No baked-in projects or events —
// when the database is empty, the page shows clean empty states until
// committee leads publish real work via their dashboards.
const fallbackProjects: ProjectItem[] = [];
const fallbackEvents: EventItem[] = [];

function sectionNaturalSort(a: ArchiveCardItem, b: ArchiveCardItem) {
  return b.sortStamp.localeCompare(a.sortStamp);
}

function cardStateClass(state: ArchiveCardItem["state"]) {
  if (state === "completed") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (state === "live") return "border-primary/25 bg-primary/10 text-primary";
  return "border-info/20 bg-info/10 text-info";
}

function statusDotClass(state: ArchiveCardItem["state"]) {
  if (state === "completed") return "bg-emerald-400";
  if (state === "live") return "bg-primary";
  return "bg-amber-300";
}

function sectionIcon(section: ArchiveSectionKey) {
  if (section === "projects") return Lightbulb;
  if (section === "competitions") return Trophy;
  return CalendarDays;
}

function sectionTitleKey(section: ArchiveSectionKey) {
  if (section === "projects") return "projects.section.projects";
  if (section === "competitions") return "projects.section.competitions";
  return "projects.section.events";
}

function ArchiveCard({
  item,
  index,
  t,
}: {
  item: ArchiveCardItem;
  index: number;
  t: (key: string) => string;
}) {
  const Icon = sectionIcon(item.section);

  return (
    <RevealFade delay={index * 0.05}>
      <Link
        href={item.href}
        className="card-feature card-hover group block overflow-hidden"
      >
        <div
          className={`h-1 w-full ${
            item.section === "projects"
              ? "bg-gradient-to-r from-primary to-secondary-light"
              : item.section === "competitions"
                ? "bg-gradient-to-r from-amber-400 to-primary"
                : "bg-gradient-to-r from-info to-primary"
          }`}
        />
        <div className="relative h-44 overflow-hidden border-b border-border bg-gradient-to-br from-surface-elevated via-secondary/[0.06] to-primary/[0.04]">
          {item.coverImages[0] ? (
            <ContentImage
              src={item.coverImages[0]}
              alt={item.title}
              sizes="(max-width: 1280px) 100vw, 32vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-secondary/[0.06] to-primary/[0.04]" />
          )}
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/[0.08] blur-[48px] transition-colors duration-500 group-hover:bg-primary/[0.12]" />
          <div className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/85 text-primary shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur">
            <Icon size={17} />
          </div>
          <div className="absolute right-4 top-4">
            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${cardStateClass(item.state)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(item.state)}`} />
              {t(`projects.state.${item.state}`)}
            </span>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-3">
            <span className="badge border-border bg-surface-elevated text-muted">
              {t(`${sectionTitleKey(item.section)}.title`)}
            </span>
          </p>
          <h3 className="text-lg font-semibold leading-tight text-foreground">
            {item.title}
          </h3>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary/80 transition-colors group-hover:text-primary">
            {t("projects.card.open")}
            <ArrowUpRight size={13} />
          </p>
        </div>
      </Link>
    </RevealFade>
  );
}

function ArchiveCollection({
  items,
  activeFilter,
  onFilterChange,
  t,
}: {
  items: ArchiveCardItem[];
  activeFilter: ArchiveFilter;
  onFilterChange: (filter: ArchiveFilter) => void;
  t: (key: string) => string;
}) {
  const filters: Array<{ key: ArchiveFilter; label: string }> = [
    { key: "all", label: t("projects.filter.all") },
    { key: "projects", label: t("projects.section.projects.title") },
    { key: "competitions", label: t("projects.section.competitions.title") },
  ];
  const title =
    activeFilter === "all"
      ? t("projects.section.projects.title")
      : t(`${sectionTitleKey(activeFilter)}.title`);
  const description =
    activeFilter === "all"
      ? t("projects.hero.desc")
      : t(`${sectionTitleKey(activeFilter)}.desc`);

  return (
    <section id="archive-collection" className="relative px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          label={t("projects.hero.label")}
          title={title}
          description={description}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                activeFilter === filter.key
                  ? "border-primary/30 bg-primary/10 text-primary shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
                  : "border-border bg-surface-elevated text-muted hover:border-primary/20 hover:text-foreground"
              }`}
              data-active={activeFilter === filter.key}
              onClick={() => onFilterChange(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[1.6rem] border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted">
            {t("projects.section.empty")}
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <ArchiveCard key={`${item.section}-${item.id}`} item={item} index={index} t={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function ProjectsPage() {
  const { t } = useLang();
  const [projects, setProjects] = useState<ProjectItem[]>(fallbackProjects);
  const [events, setEvents] = useState<EventItem[]>(fallbackEvents);
  const [config, setConfig] = useState<ArchiveConfig>(normalizeArchiveConfig(null));
  const [activeFilter, setActiveFilter] = useState<ArchiveFilter>("all");

  useEffect(() => {
    void Promise.allSettled([
      api.get<ProjectItem[]>("/api/projects/public"),
      api.get<{ upcoming: EventItem[]; past: EventItem[] }>("/api/events/public"),
      api.get<{ json: ArchiveConfig | null }>("/api/site-content/projects.archive.config"),
    ]).then(([projectsResult, eventsResult, configResult]) => {
      if (projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value) && projectsResult.value.length > 0) {
        setProjects(projectsResult.value);
      }

      if (eventsResult.status === "fulfilled") {
        const allEvents = [...(eventsResult.value.upcoming ?? []), ...(eventsResult.value.past ?? [])];
        if (allEvents.length > 0) setEvents(allEvents);
      }

      if (configResult.status === "fulfilled") {
        setConfig(normalizeArchiveConfig(configResult.value?.json));
      }
    });
  }, []);

  const projectCards = useMemo(() => {
    const items = projects.map<ArchiveCardItem>((project) => ({
      id: project.projectId,
      section: "projects",
      title: project.title,
      imageUrl: project.imageUrl,
      coverImages: galleryForItem(config, "projects", project.projectId, project.imageUrl),
      href: `/projects/projects/${project.projectId}`,
      state: archiveStateFromProjectStatus(project.status),
      sortStamp: project.status === "completed" ? "0001" : project.status === "planning" ? "5000" : "9999",
    }));
    return sortArchiveItems(items, config.order.projects, sectionNaturalSort);
  }, [config, projects]);

  const eventCards = useMemo(() => {
    const mapped = events.map<ArchiveCardItem>((event) => {
      const section = eventArchiveSection(event.type);
      const id = Number(event.eventId);
      return {
        id,
        section,
        title: event.title,
        imageUrl: event.imageUrl,
        coverImages: galleryForItem(config, section, id, event.imageUrl),
        href: `/projects/${section}/${id}`,
        state: archiveStateFromEventDates(event.startTime, event.endTime),
        sortStamp: event.startTime,
      };
    });

    const baseSort = (items: ArchiveCardItem[]) => sortArchiveItems(items, [], (a, b) => b.sortStamp.localeCompare(a.sortStamp));

    return {
      events: sortArchiveItems(
        baseSort(mapped.filter((item) => item.section === "events")),
        config.order.events,
        sectionNaturalSort,
      ),
      competitions: sortArchiveItems(
        baseSort(mapped.filter((item) => item.section === "competitions")),
        config.order.competitions,
        sectionNaturalSort,
      ),
    };
  }, [config, events]);

  const allCards = useMemo(() => {
    const combined = [...projectCards, ...eventCards.competitions];
    return combined.sort(sectionNaturalSort);
  }, [eventCards.competitions, projectCards]);

  const visibleCards = useMemo(() => {
    if (activeFilter === "all") return allCards;
    return allCards.filter((item) => item.section === activeFilter);
  }, [activeFilter, allCards]);

  return (
    <div className="relative">
      <PageHero
        label={t("projects.hero.label")}
        title={t("projects.hero.title")}
        accentText={t("projects.hero.accent")}
        description={t("projects.hero.desc")}
      />

      <ArchiveCollection
        items={visibleCards}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        t={t}
      />

      <PublicCustomSegments page="projects" />
    </div>
  );
}
