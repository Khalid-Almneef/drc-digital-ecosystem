"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Cpu, RadioTower, Trophy, Users, Zap } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { PixelDrone } from "@/components/ui/PixelDrone";
import { AnnouncementDeck } from "@/components/sections/AnnouncementDeck";
import { HighlightGrid } from "@/components/sections/HighlightGrid";
import { AlumniSection } from "@/components/sections/AlumniSection";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { useHomeData } from "@/hooks/useHomeData";
import type { HomeStats } from "@/hooks/useHomeData";

export default function Home() {
  const { lang, t } = useLang();
  const {
    announcements,
    visibility,
    homeStats,
    homeHighlights,
    announcementCards,
  } = useHomeData();

  const adminManage = t("home.admin.manage");

  return (
    <div className="relative overflow-x-hidden">
      <PixelDrone />

      {/* 1. HERO SECTION */}
      <Hero lang={lang} t={t} />

      {/* 2. STATS ROW */}
      <StatsRow stats={homeStats} t={t} />

      {/* 3. ANNOUNCEMENTS (New dynamic functionality kept) */}
      <AnnouncementDeck
        visible={visibility.announcements}
        announcementCards={announcementCards}
        announcements={announcements}
        adminManage={adminManage}
        lang={lang}
        t={t}
      />

      {/* 4. WHAT WE DO SECTION */}
      <HighlightGrid
        visible={visibility.whatwedo}
        homeHighlights={homeHighlights}
        adminManage={adminManage}
        lang={lang}
        t={t}
      />

      {/* 5. ALUMNI SECTION */}
      <AlumniSection adminManage={adminManage} />

      {/* 6. DYNAMIC CMS SEGMENTS */}
      <PublicCustomSegments page="main" />
    </div>
  );
}

function Hero({ lang, t }: { lang: string; t: (k: string) => string }) {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-28 sm:pt-36">
      <div className="absolute inset-x-6 top-24 bottom-8 -z-10 rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--surface)_74%,transparent),color-mix(in_srgb,var(--surface-elevated)_38%,transparent))] shadow-[0_28px_100px_rgba(2,10,24,0.24)]" />
      {/* Single subtle accent — kept low-intensity to avoid the layered-blob look. */}
      <div className="pointer-events-none absolute left-[10%] top-[20%] -z-10 h-56 w-56 rounded-full bg-primary/8 blur-[80px]" />
      <div className="pointer-events-none absolute right-[8%] bottom-[18%] -z-10 h-48 w-48 rounded-full bg-accent/8 blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary whitespace-nowrap"
        >
          <RadioTower size={14} />
          {t("home.hero.kicker")}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl text-5xl font-extrabold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl"
        >
          <span className="gradient-text leading-[1.18] pb-1 inline-block">{t("home.hero1")}</span>
          <br />
          <span className="gradient-text-accent leading-[1.18] pb-1 inline-block">{t("home.hero2")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-muted sm:text-xl"
        >
          {t("home.sub")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.75, delay: 0.28 }}
          {...(lang === "ar" ? { dir: "rtl" } : {})}
          className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-primary/75 sm:text-lg"
        >
          {t("home.tagline")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
        >
          <Link href="/projects" className="btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold">
            {t("home.cta.projects")}
            <ArrowUpRight size={16} className={lang === "ar" ? "rotate-180" : ""} />
          </Link>
          <Link href="/workshops" className="btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold">
            {t("home.cta.workshops")}
          </Link>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-border-highlight to-transparent" />
    </section>
  );
}


function StatsRow({ stats, t }: { stats: HomeStats; t: (k: string) => any }) {
  // Only show stats that have a real number — anything still showing the
  // em-dash placeholder is hidden so we never display "—" or fake counts.
  const items = [
    { icon: Zap, label: "stats.projects", value: stats.projects },
    { icon: Trophy, label: "stats.competitions", value: stats.competitions },
    { icon: Users, label: "stats.members", value: stats.members },
    { icon: Cpu, label: "stats.departments", value: stats.departments },
  ].filter((stat) => stat.value && stat.value !== "—" && stat.value !== "0");

  if (items.length === 0) return null;

  return (
    <section className="relative border-y border-border/50 bg-surface/28 px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <div className={`grid gap-4 md:gap-5 ${items.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : items.length === 2 ? "grid-cols-2 max-w-2xl mx-auto" : items.length === 3 ? "grid-cols-3 max-w-4xl mx-auto" : "grid-cols-2 md:grid-cols-4"}`}>
          {items.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card px-4 py-5 text-center"
            >
              <div className="mb-3 flex justify-center">
                <stat.icon size={18} className="text-primary/70" />
              </div>
              <p className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {t(stat.label)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
