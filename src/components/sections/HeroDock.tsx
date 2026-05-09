"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Cpu, Trophy, Users, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { HUDLabel } from "@/components/drone/HUDLabel";
import { AdminLink, ContentImage } from "@/lib/ui-helpers";
import { localizedValue } from "@/lib/public-content";
import type { HomeStats, HomeHeroBannerItem } from "@/hooks/useHomeData";

const BASE_STATS = [
  { icon: Zap, valueKey: "projects" as keyof HomeStats, labelKey: "stats.projects" },
  { icon: Trophy, valueKey: "competitions" as keyof HomeStats, labelKey: "stats.competitions" },
  { icon: Users, valueKey: "members" as keyof HomeStats, labelKey: "stats.members" },
  { icon: Cpu, valueKey: "departments" as keyof HomeStats, labelKey: "stats.departments" },
];

interface HeroDockProps {
  heroSignals: Array<{ title: string; value: string; detail: string }>;
  homeStats: HomeStats;
  leadBanner: HomeHeroBannerItem;
  secondaryBanners: HomeHeroBannerItem[];
  adminManage: string;
  lang: "en" | "ar";
  t: (key: string) => string;
}

export function HeroDock({ heroSignals, homeStats, leadBanner, secondaryBanners, adminManage, lang, t }: HeroDockProps) {
  const { isAnyLeader } = useAuth();

  const primaryPaths = [
    { href: "/join", icon: Users, label: t("home.paths.join.label"), title: t("home.paths.join.title"), description: t("home.paths.join.desc"), cta: t("home.paths.join.cta") },
    { href: "/projects", icon: Cpu, label: t("home.paths.projects.label"), title: t("home.paths.projects.title"), description: t("home.paths.projects.desc"), cta: t("home.paths.projects.cta") },
    { href: "/workshops", icon: Zap, label: t("home.paths.workshops.label"), title: t("home.paths.workshops.title"), description: t("home.paths.workshops.desc"), cta: t("home.paths.workshops.cta") },
  ];

  return (
    <section className="relative overflow-hidden px-6 pb-12 pt-28 sm:pt-32 lg:pb-18">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.92fr)] lg:items-start">
          {/* Left column */}
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between gap-4">
              <HUDLabel>{t("home.hero.kicker")}</HUDLabel>
              {isAnyLeader && <AdminLink href="/dashboard/media" label={adminManage} />}
            </div>

            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-accent-glow px-4 py-2 text-xs font-medium text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-80" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              {t("home.status")}
            </div>

            <div className="mb-7">
              <div className="relative inline-flex">
                <Logo width={78} height={78} className="drop-shadow-[0_0_24px_rgba(0,217,172,0.18)]" priority />
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-[28px]" />
              </div>
            </div>

            <h1 className="max-w-4xl text-5xl font-extrabold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl xl:text-[4.65rem] xl:leading-[0.96]">
              <span className="gradient-text">{t("home.hero1")}</span>
              <br />
              <span className="gradient-text-accent">{t("home.hero2")}</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              {t("home.sub")}
            </p>

            <p dir="rtl" className="mt-2 max-w-xl text-sm font-medium text-primary/70 sm:text-base">
              {t("home.tagline")}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:max-w-3xl">
              {heroSignals.map((signal) => (
                <div key={signal.title} className="border border-border/80 bg-surface/45 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">{t(signal.title)}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{t(signal.value)}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{signal.detail.startsWith("home.") ? t(signal.detail) : signal.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 lg:max-w-3xl sm:flex-row sm:flex-wrap">
              <Link href="/join" className="btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm">
                {t("home.cta.join")}
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/projects" className="btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm">
                {t("home.cta.projects")}
              </Link>
              <Link href="/workshops" className="btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm">
                {t("home.cta.workshops")}
              </Link>
            </div>

            <div className="mt-8 max-w-5xl">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <HUDLabel>{t("home.paths.label")}</HUDLabel>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">{t("home.paths.title")}</h2>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted">{t("home.paths.desc")}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {primaryPaths.map((path) => (
                  <Link key={path.href} href={path.href} className="glass-card group p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <path.icon size={16} />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">{path.label}</span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{path.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{path.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary transition-colors group-hover:text-primary-bright">
                      {path.cta}
                      <ArrowUpRight size={14} className={lang === "ar" ? "rotate-180" : ""} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-7 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {BASE_STATS.map((stat) => (
                <div key={stat.labelKey} className="glass-card px-4 py-4">
                  <stat.icon size={15} className="mb-2 text-primary/70" />
                  <p className="text-2xl font-bold tracking-tight text-foreground">{homeStats[stat.valueKey]}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted">{t(stat.labelKey)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — banners */}
          <div className="relative">
            <motion.div initial={{ opacity: 0.78, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} className="relative">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(14rem,0.88fr)]">
                <div className="card-feature overflow-hidden">
                  <div className="relative min-h-[20rem] sm:min-h-[24rem]">
                    <ContentImage src={leadBanner.imageUrl || "/logo-full.png"} alt={localizedValue(lang, leadBanner.titleEn, leadBanner.titleAr)} sizes="(max-width: 1280px) 100vw, 42vw" priority className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-br from-background/92 via-background/72 to-background/25" />
                    <div className="relative flex h-full flex-col justify-between p-6 sm:p-7">
                      <div className="flex items-center justify-between gap-3">
                        <span className="badge badge-primary text-[10px] uppercase tracking-[0.18em]">{localizedValue(lang, leadBanner.eyebrowEn, leadBanner.eyebrowAr)}</span>
                        <span className="rounded-full border border-white/10 bg-background/55 px-3 py-1 text-[11px] text-primary">{leadBanner.metric}</span>
                      </div>
                      <div className="max-w-lg">
                        <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{localizedValue(lang, leadBanner.titleEn, leadBanner.titleAr)}</h2>
                        <p className="mt-4 max-w-md text-sm leading-7 text-slate-200/78 sm:text-base">{localizedValue(lang, leadBanner.descriptionEn, leadBanner.descriptionAr)}</p>
                        <Link href={leadBanner.href || "/projects"} className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/55 px-4 py-2 text-sm text-primary transition-colors hover:border-primary/40 hover:text-primary-bright">
                          {localizedValue(lang, leadBanner.ctaEn, leadBanner.ctaAr)}
                          <ArrowUpRight size={14} className={lang === "ar" ? "rotate-180" : ""} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  {secondaryBanners.map((banner, index) => (
                    <div key={`${banner.titleEn}-${index}`} className="card-feature overflow-hidden">
                      <div className="relative min-h-[11rem]">
                        <ContentImage src={banner.imageUrl || "/logo-full.png"} alt={localizedValue(lang, banner.titleEn, banner.titleAr)} sizes="(max-width: 1280px) 50vw, 22vw" className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/35 to-background/90" />
                        <div className="relative flex h-full flex-col justify-end p-5">
                          <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">{localizedValue(lang, banner.eyebrowEn, banner.eyebrowAr)}</span>
                          <h3 className="text-lg font-semibold leading-tight text-white">{localizedValue(lang, banner.titleEn, banner.titleAr)}</h3>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-300">{banner.metric}</span>
                            <Link href={banner.href || "/"} className="text-xs text-primary hover:text-primary-bright transition-colors">{localizedValue(lang, banner.ctaEn, banner.ctaAr)}</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
