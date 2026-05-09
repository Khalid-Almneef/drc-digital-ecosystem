"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import type { Workshop } from "@/data/workshops";
import {
  DEFAULT_HOME_ANNOUNCEMENT_CARDS,
  DEFAULT_HOME_HERO_BANNERS,
  DEFAULT_HOME_FEATURE_SPOTLIGHTS,
  DEFAULT_HOME_HIGHLIGHTS,
  localizedValue,
  parseCollection,
  type HomeAnnouncementCardItem,
  type HomeFeatureSpotlightItem,
  type HomeHeroBannerItem,
  type HomeHighlightItem,
} from "@/lib/public-content";

export type { HomeAnnouncementCardItem, HomeFeatureSpotlightItem, HomeHeroBannerItem, HomeHighlightItem } from "@/lib/public-content";
import {
  Camera,
  Code2,
  BookOpen,
  Megaphone,
  UsersRound,
  Wallet,
  Wrench,
  Cpu,
} from "lucide-react";

export interface HomeStats {
  projects: string;
  competitions: string;
  members: string;
  departments: string;
}

export interface FeaturedProject {
  projectId: number;
  title: string;
  description: string;
  category: string;
  status: string;
  imageUrl?: string | null;
  techStack?: string[] | null;
  leadName?: string | null;
}

export interface Announcement {
  announcementId: number;
  title: string;
  body: string | null;
  imageUrl?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  isPinned: boolean;
  createdAt: string;
}

export interface MonthMember {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  departmentName: string;
  departmentNameAr: string | null;
}

export interface SectionVisibility {
  announcements: boolean;
  motm: boolean;
  whatwedo: boolean;
  workshops: boolean;
  projects: boolean;
}

export interface PublicWorkshopRecord {
  workshopId: number;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  category: Workshop["category"];
  durationMin: number | null;
  recordedDate: string | null;
  presenter: string | null;
  videoUrl: string | null;
  thumbnailUrl?: string | null;
}

export interface PublicEvent {
  eventId: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: string;
  category?: string | null;
  startTime: string;
  endTime?: string | null;
  location: string | null;
}

export interface PublicEventFeed {
  upcoming: PublicEvent[];
  past: PublicEvent[];
}

export interface PublicMediaItem {
  contentId: number;
  title: string;
  type: "post" | "story" | "reel" | "video" | "photo" | "article";
  platform: string | null;
  description: string | null;
  fileUrl: string | null;
  status: "draft" | "in_review" | "scheduled" | "published" | "archived";
  scheduledDate: string | null;
  publishedDate: string | null;
  views: number;
  likes: number;
  shares: number;
}

export type MediaWallItem = {
  id: string;
  kind: "reel" | "photo" | "video" | "post" | "project" | "event" | "announcement";
  title: string;
  body: string;
  imageUrl: string;
  href: string | null;
  meta: string;
};

export type PulseLevel = "high" | "medium" | "quiet";

export type PulseItem = {
  key: "innovation" | "development" | "media" | "pr" | "hr" | "finance" | "logistics" | "madarat";
  icon: React.ElementType;
  level: PulseLevel;
  summary: string;
  detail: string;
  tone: string;
};

// First-paint defaults are placeholders only — every value gets replaced by
// real numbers from /api/stats/overview before the user sees them. Using
// "—" everywhere ensures we never flash an invented number like "200+".
const DEFAULT_STATS: HomeStats = {
  projects: "—",
  competitions: "—",
  members: "—",
  departments: "—",
};

const DEFAULT_VISIBILITY: SectionVisibility = {
  announcements: true,
  motm: true,
  whatwedo: true,
  workshops: true,
  projects: true,
};

// No baked-in projects — real ones come from /api/projects/featured (empty
// array until committee leads publish work).
const fallbackProjects: FeaturedProject[] = [];

export function formatShortDate(iso: string, lang: string) {
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function projectStatusKey(status: string) {
  if (status === "completed") return "project.status.completed";
  if (status === "in_progress") return "project.status.inprogress";
  return "project.status.planned";
}

export function priorityDot(priority: string) {
  if (priority === "critical") return "var(--error)";
  if (priority === "high") return "var(--warning)";
  if (priority === "medium") return "var(--primary)";
  return "var(--muted)";
}

export function pulseLevelValue(level: PulseLevel) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

export function useHomeData() {
  const { lang } = useLang();

  const [displayWorkshops, setDisplayWorkshops] = useState<Workshop[]>([]);
  const [projects, setProjects] = useState<FeaturedProject[]>(fallbackProjects);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [motm, setMotm] = useState<MonthMember[]>([]);
  const [visibility, setVisibility] = useState<SectionVisibility>(DEFAULT_VISIBILITY);
  const [homeStats, setHomeStats] = useState<HomeStats>(DEFAULT_STATS);
  const [homeHighlights, setHomeHighlights] = useState<HomeHighlightItem[]>(DEFAULT_HOME_HIGHLIGHTS);
  const [announcementCards, setAnnouncementCards] = useState<HomeAnnouncementCardItem[]>(DEFAULT_HOME_ANNOUNCEMENT_CARDS);
  const [heroBanners, setHeroBanners] = useState<HomeHeroBannerItem[]>(DEFAULT_HOME_HERO_BANNERS);
  const [featureSpotlights, setFeatureSpotlights] = useState<HomeFeatureSpotlightItem[]>(DEFAULT_HOME_FEATURE_SPOTLIGHTS);
  const [mediaItems, setMediaItems] = useState<PublicMediaItem[]>([]);
  const [events, setEvents] = useState<PublicEventFeed>({ upcoming: [], past: [] });
  const [joinAccepting, setJoinAccepting] = useState(true);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [mediaWallLoading, setMediaWallLoading] = useState(true);

  useEffect(() => {
    api.get<PublicWorkshopRecord[]>("/api/workshops/public")
      .then((data) => {
        if (!data?.length) return;
        setDisplayWorkshops(
          data.slice(0, 3).map((workshop) => ({
            id: workshop.workshopId,
            title: workshop.title,
            titleAr: workshop.titleAr ?? "",
            description: workshop.description ?? "",
            descriptionAr: workshop.descriptionAr ?? "",
            category: workshop.category as Workshop["category"],
            categoryAr: workshop.category,
            duration: workshop.durationMin ?? 0,
            date: workshop.recordedDate
              ? new Date(workshop.recordedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
              : "",
            presenter: workshop.presenter ?? "",
            videoUrl: workshop.videoUrl ?? "#",
          })),
        );
      })
      .catch(() => {});

    api.get<FeaturedProject[]>("/api/projects/featured")
      .then((data) => { if (data?.length) setProjects(data); })
      .catch(() => {});

    api.get<Announcement[]>("/api/announcements/latest")
      .then((data) => { if (data?.length) setAnnouncements(data); })
      .catch(() => {});

    api.get<PublicMediaItem[]>("/api/media/public")
      .then((data) => { if (data?.length) setMediaItems(data); })
      .catch(() => {})
      .finally(() => setMediaWallLoading(false));

    Promise.allSettled([
      api.get<PublicEventFeed>("/api/events/public"),
      api.get<{ json: { accepting: boolean } | null }>("/api/site-content/join.accepting"),
    ])
      .then(([eventsResult, joinResult]) => {
        if (eventsResult.status === "fulfilled") {
          setEvents({
            upcoming: eventsResult.value.upcoming ?? [],
            past: eventsResult.value.past ?? [],
          });
        }
        if (joinResult.status === "fulfilled" && joinResult.value?.json) {
          setJoinAccepting(Boolean(joinResult.value.json.accepting));
        }
      })
      .finally(() => setSignalsLoading(false));

    api.get<{ key: string; json: HomeAnnouncementCardItem[] | null }>("/api/site-content/home.announcementCards")
      .then((d) => setAnnouncementCards(parseCollection(d?.json, DEFAULT_HOME_ANNOUNCEMENT_CARDS)))
      .catch(() => {});

    api.get<{ key: string; json: HomeHeroBannerItem[] | null }>("/api/site-content/home.heroBanners")
      .then((d) => setHeroBanners(parseCollection(d?.json, DEFAULT_HOME_HERO_BANNERS)))
      .catch(() => {});

    api.get<{ key: string; json: HomeFeatureSpotlightItem[] | null }>("/api/site-content/home.featureSpotlights")
      .then((d) => setFeatureSpotlights(parseCollection(d?.json, DEFAULT_HOME_FEATURE_SPOTLIGHTS)))
      .catch(() => {});

    api.get<MonthMember[]>("/api/members/month")
      .then((data) => { if (data?.length) setMotm(data); })
      .catch(() => {});

    api.get<{ key: string; json: SectionVisibility | null }>("/api/site-content/home.sections")
      .then((d) => { if (d?.json) setVisibility({ ...DEFAULT_VISIBILITY, ...d.json }); })
      .catch(() => {});

    // Live counts from the DB. The endpoint already merges in the manual
    // home.stats override per-field, so a number leadership pinned wins
    // over the live count and a blank value falls back to the count.
    api.get<{ projects: number | string; competitions: number | string; members: number | string; departments: number | string }>("/api/stats/overview")
      .then((d) => {
        if (!d) return;
        setHomeStats({
          projects: String(d.projects ?? "—"),
          competitions: String(d.competitions ?? "—"),
          members: String(d.members ?? "—"),
          departments: String(d.departments ?? "—"),
        });
      })
      .catch(() => {});

    api.get<{ key: string; json: HomeHighlightItem[] | null }>("/api/site-content/home.highlights")
      .then((d) => setHomeHighlights(parseCollection(d?.json, DEFAULT_HOME_HIGHLIGHTS)))
      .catch(() => {});
  }, []);

  const mediaWallItems = useMemo<MediaWallItem[]>(() => {
    const next: MediaWallItem[] = [];
    const seen = new Set<string>();

    const pushItem = (item: MediaWallItem | null) => {
      if (!item || !item.imageUrl) return;
      const key = `${item.kind}:${item.title}:${item.imageUrl}`;
      if (seen.has(key)) return;
      seen.add(key);
      next.push(item);
    };

    mediaItems.forEach((item) => {
      pushItem({
        id: `media-${item.contentId}`,
        kind: item.type === "photo" ? "photo" : item.type === "video" ? "video" : item.type === "reel" ? "reel" : "post",
        title: item.title,
        body: item.description ?? "",
        imageUrl: item.fileUrl ?? "",
        href: null,
        meta: item.platform ? item.platform.toUpperCase() : item.status,
      });
    });

    projects.forEach((project) => {
      pushItem({
        id: `project-${project.projectId}`,
        kind: "project",
        title: project.title,
        body: project.description,
        imageUrl: project.imageUrl ?? "",
        href: "/projects",
        meta: project.category,
      });
    });

    [...events.upcoming, ...events.past].slice(0, 4).forEach((event) => {
      pushItem({
        id: `event-${event.eventId}`,
        kind: "event",
        title: event.title,
        body: event.description ?? "",
        imageUrl: event.imageUrl ?? "",
        href: "/events",
        meta: event.location || formatShortDate(event.startTime, lang),
      });
    });

    announcementCards.forEach((card, index) => {
      pushItem({
        id: `announcement-card-${index}`,
        kind: "announcement",
        title: localizedValue(lang, card.titleEn, card.titleAr),
        body: localizedValue(lang, card.bodyEn, card.bodyAr),
        imageUrl: card.imageUrl || "",
        href: card.href || null,
        meta: localizedValue(lang, card.badgeEn, card.badgeAr),
      });
    });

    announcements.forEach((announcement) => {
      pushItem({
        id: `announcement-${announcement.announcementId}`,
        kind: "announcement",
        title: announcement.title,
        body: announcement.body ?? "",
        imageUrl: announcement.imageUrl ?? "",
        href: null,
        meta: formatShortDate(announcement.createdAt, lang),
      });
    });

    return next.slice(0, 5);
  }, [announcementCards, announcements, events, lang, mediaItems, projects]);

  const pulseItems = useMemo<PulseItem[]>(() => {
    const technicalProjects = projects.filter((project) => {
      const category = project.category.toLowerCase();
      return category.includes("aerial") || category.includes("robot") || category.includes("drone");
    });
    const softwareProjects = projects.filter((project) => {
      const category = project.category.toLowerCase();
      return category.includes("software") || category.includes("tool") || category.includes("internal");
    });
    const imageAnnouncements = announcements.filter((announcement) => Boolean(announcement.imageUrl));
    const nextEvent = events.upcoming[0] ?? null;
    const recentEvent = events.past[0] ?? null;
    const activeWorkshop = displayWorkshops[0] ?? null;
    const mediaFeature = mediaItems[0] ?? null;

    return [
      {
        key: "innovation",
        icon: Cpu,
        level: technicalProjects.length > 1 ? "high" : technicalProjects.length > 0 ? "medium" : "quiet",
        summary: technicalProjects.length > 0
          ? (lang === "ar" ? "النماذج الهندسية تتحرك هذا الأسبوع." : "Engineering builds are moving this week.")
          : (lang === "ar" ? "لا يوجد تحديث هندسي منشور هذا الأسبوع." : "No technical build is publicly active this week."),
        detail: technicalProjects[0]?.title ?? (lang === "ar" ? "بانتظار نشر البناء التالي." : "Waiting on the next published build."),
        tone: "from-cyan-400/16 to-sky-400/10",
      },
      {
        key: "development",
        icon: Code2,
        level: softwareProjects.length > 0 || displayWorkshops.length > 0 ? "high" : "quiet",
        summary: softwareProjects.length > 0
          ? (lang === "ar" ? "أدوات ومنصات النادي في دورة تطوير." : "Club tools and software layers are in motion.")
          : (lang === "ar" ? "لا توجد أداة منشورة جديدة هذا الأسبوع." : "No new public tool update is visible this week."),
        detail: softwareProjects[0]?.title ?? activeWorkshop?.title ?? (lang === "ar" ? "بانتظار دفعة التطوير التالية." : "Waiting on the next development release."),
        tone: "from-primary/16 to-emerald-400/10",
      },
      {
        key: "media",
        icon: Camera,
        level: mediaItems.length > 1 || imageAnnouncements.length > 0 ? "high" : mediaItems.length > 0 ? "medium" : "quiet",
        summary: mediaItems.length > 0
          ? (lang === "ar" ? "التغطية البصرية والنشر نشطان." : "Visual coverage and publishing are active.")
          : (lang === "ar" ? "لا توجد مواد مرئية منشورة حاليًا." : "No fresh public media item is visible right now."),
        detail: mediaFeature?.title ?? imageAnnouncements[0]?.title ?? (lang === "ar" ? "الواجهة تنتظر المادة التالية." : "The wall is waiting on the next asset."),
        tone: "from-fuchsia-400/16 to-orange-400/10",
      },
      {
        key: "pr",
        icon: Megaphone,
        level: announcements.length > 0 || events.upcoming.length > 0 ? "medium" : "quiet",
        summary: announcements.length > 0
          ? (lang === "ar" ? "التواصل العام والإشعارات الجارية واضحة هذا الأسبوع." : "Public communication is clearly active this week.")
          : (lang === "ar" ? "لا توجد حملة علنية بارزة هذا الأسبوع." : "No major public-facing campaign is visible this week."),
        detail: announcements[0]?.title ?? nextEvent?.title ?? (lang === "ar" ? "بانتظار التحديث العام التالي." : "Waiting on the next public update."),
        tone: "from-amber-400/16 to-orange-400/10",
      },
      {
        key: "hr",
        icon: UsersRound,
        level: joinAccepting ? "medium" : "quiet",
        summary: joinAccepting
          ? (lang === "ar" ? "استقبال الأعضاء مفتوح حاليًا." : "Member intake is open right now.")
          : (lang === "ar" ? "الاستقبال متوقف حاليًا." : "Intake is currently paused."),
        detail: joinAccepting
          ? (lang === "ar" ? "صفحة الانضمام جاهزة لاستقبال الطلبات الجديدة." : "The join flow is ready for new applications.")
          : (lang === "ar" ? "بانتظار فتح نافذة الانضمام القادمة." : "Waiting for the next application window."),
        tone: "from-rose-400/16 to-pink-400/10",
      },
      {
        key: "finance",
        icon: Wallet,
        level: projects.length > 0 || events.upcoming.length > 0 ? "medium" : "quiet",
        summary: projects.length > 0 || events.upcoming.length > 0
          ? (lang === "ar" ? "هناك أعمال نشطة تحتاج دعمًا تشغيليًا وتمويليًا." : "Active builds and events imply live budget support work.")
          : (lang === "ar" ? "أسبوع هادئ ماليًا على الواجهة العامة." : "It looks like a quiet finance week on the public surface."),
        detail: nextEvent?.title ?? technicalProjects[0]?.title ?? (lang === "ar" ? "لا يوجد بند ظاهر هذا الأسبوع." : "No visible public budget line this week."),
        tone: "from-lime-400/16 to-emerald-400/10",
      },
      {
        key: "logistics",
        icon: Wrench,
        level: events.upcoming.length > 0 ? "high" : recentEvent ? "medium" : "quiet",
        summary: events.upcoming.length > 0
          ? (lang === "ar" ? "الجاهزية الميدانية مرتبطة بالفعالية القادمة." : "On-ground readiness is tied to the next event.")
          : (lang === "ar" ? "لا توجد فعالية قادمة تتطلب تجهيزًا الآن." : "No upcoming public event needs setup right now."),
        detail: nextEvent ? `${nextEvent.title}${nextEvent.location ? ` · ${nextEvent.location}` : ""}` : (recentEvent?.title ?? (lang === "ar" ? "العمليات هادئة هذا الأسبوع." : "Operations are quiet this week.")),
        tone: "from-slate-300/14 to-slate-500/10",
      },
      {
        key: "madarat",
        icon: BookOpen,
        level: displayWorkshops.length > 1 ? "high" : displayWorkshops.length > 0 ? "medium" : "quiet",
        summary: displayWorkshops.length > 0
          ? (lang === "ar" ? "التعلّم المستمر ظاهر عبر الورش الحالية." : "Learning is active through the current workshop stream.")
          : (lang === "ar" ? "لا توجد مادة تعليمية منشورة هذا الأسبوع." : "No learning item is published this week."),
        detail: activeWorkshop?.title ?? (lang === "ar" ? "بانتظار مسار التعلّم التالي." : "Waiting on the next learning track."),
        tone: "from-violet-400/16 to-sky-400/10",
      },
    ];
  }, [announcements, displayWorkshops, events, joinAccepting, lang, mediaItems, projects]);

  const heroSignals = useMemo(() => {
    const nextEvent = events.upcoming[0] ?? null;
    return [
      {
        title: "home.signal.event",
        value: nextEvent ? nextEvent.title : "home.signal.event.empty",
        detail: nextEvent
          ? `${formatShortDate(nextEvent.startTime, lang)}${nextEvent.location ? ` · ${nextEvent.location}` : ""}`
          : "home.signal.event.detail",
      },
      {
        title: "home.signal.media",
        value: mediaWallItems.length > 0 ? String(mediaWallItems.length) : "home.signal.media.empty",
        detail: mediaWallItems.length > 0 ? "home.signal.media.detail" : "home.signal.media.detailEmpty",
      },
      {
        title: "home.signal.join",
        value: joinAccepting ? "home.signal.join.open" : "home.signal.join.closed",
        detail: joinAccepting ? "home.signal.join.detailOpen" : "home.signal.join.detailClosed",
      },
    ];
  }, [events.upcoming, joinAccepting, lang, mediaWallItems.length]);

  return {
    displayWorkshops,
    projects,
    announcements,
    motm,
    visibility,
    homeStats,
    homeHighlights,
    announcementCards,
    heroBanners,
    featureSpotlights,
    mediaItems,
    events,
    joinAccepting,
    signalsLoading,
    mediaWallLoading,
    mediaWallItems,
    pulseItems,
    heroSignals,
    leadBanner: heroBanners[0] ?? DEFAULT_HOME_HERO_BANNERS[0],
    secondaryBanners: heroBanners.slice(1, 3),
    leadSpotlight: featureSpotlights[0] ?? DEFAULT_HOME_FEATURE_SPOTLIGHTS[0],
    secondarySpotlights: featureSpotlights.slice(1),
  };
}
