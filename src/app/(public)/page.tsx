"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Cpu, RadioTower, Trophy, Users, Zap } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Logo } from "@/components/ui/Logo";
import { PixelDrone, PixelDroneArt } from "@/components/ui/PixelDrone";
import { AnnouncementDeck } from "@/components/sections/AnnouncementDeck";
import { HighlightGrid } from "@/components/sections/HighlightGrid";
import { AlumniSection } from "@/components/sections/AlumniSection";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { useHomeData } from "@/hooks/useHomeData";
import type { HomeStats } from "@/hooks/useHomeData";
import { api } from "@/lib/client";

export default function Home() {
  const { lang, t } = useLang();
  const {
    announcements,
    visibility,
    homeStats,
    homeHighlights,
    announcementCards,
  } = useHomeData();
  const [contactEmail, setContactEmail] = useState("partnerships@drc.club");

  const adminManage = t("home.admin.manage");

  useEffect(() => {
    api.get<{ en: string | null }>("/api/site-content/contact.email")
      .then((row) => {
        if (row?.en?.trim()) setContactEmail(row.en.trim());
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      <PixelDrone />

      {/* 1. HERO SECTION */}
      <Hero lang={lang} t={t} contactEmail={contactEmail} stats={homeStats} />

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

function Hero({ lang, t, contactEmail, stats }: { lang: string; t: (k: string) => string; contactEmail: string; stats: HomeStats }) {
  const { theme } = useTheme();

  return (
    <section className="relative min-h-[calc(100dvh-1rem)] overflow-hidden px-6 pb-20 pt-28 sm:pt-36">
      <div className="absolute inset-x-6 top-24 bottom-8 -z-10 rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--surface)_74%,transparent),color-mix(in_srgb,var(--surface-elevated)_38%,transparent))] shadow-[0_28px_100px_rgba(2,10,24,0.24)]" />
      {/* Single subtle accent — kept low-intensity to avoid the layered-blob look. */}
      <div className="absolute left-[8%] top-[18%] -z-10 h-48 w-48 rounded-full bg-primary/8 blur-[70px]" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.82fr)] lg:items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <RadioTower size={14} />
            {t("home.hero.kicker")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl text-5xl font-extrabold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl xl:text-[5.8rem] xl:leading-[0.95]"
          >
            <span className="gradient-text leading-[1.02]">{t("home.hero1")}</span>
            <br />
            <span className="gradient-text-accent leading-[1.02]">{t("home.hero2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-2xl text-lg leading-8 text-muted sm:text-xl"
          >
            {t("home.sub")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.75, delay: 0.28 }}
            {...(lang === "ar" ? { dir: "rtl" } : {})}
            className="mt-4 max-w-xl text-base font-medium leading-7 text-primary/75 sm:text-lg"
          >
            {t("home.tagline")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <Link href="/projects" className="btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold">
              {t("home.cta.projects")}
              <ArrowUpRight size={16} className={lang === "ar" ? "rotate-180" : ""} />
            </Link>
            <Link href="/workshops" className="btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold">
              {t("home.cta.workshops")}
            </Link>
            <a href={`mailto:${contactEmail}`} className="btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold">
              <BriefcaseBusiness size={16} />
              {t("home.cta.partner")}
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3"
          >
            {[
              { label: t("home.proof.systems"), value: "PX4 · ROS 2 · OpenCV" },
              {
                label: t("home.proof.output"),
                value: stats.projects === "—" || stats.competitions === "—"
                  ? t("home.proof.output.value")
                  : `${stats.projects} ${t("stats.projects").toLowerCase()} · ${stats.competitions} ${t("stats.competitions").toLowerCase()}`,
              },
              { label: t("home.proof.partner"), value: contactEmail },
            ].map((item) => (
              <div key={item.label} className="control-surface p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-foreground break-words">{item.value}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-md lg:max-w-lg"
        >
          <div className="card-feature relative overflow-hidden p-6 sm:p-8">
            <div className={`absolute left-1/2 top-20 h-56 w-56 -translate-x-1/2 rounded-full blur-[70px] transition-all duration-500 ${
              theme === 'light' ? 'bg-primary/10 group-hover:bg-primary/20' : 'bg-primary/20 group-hover:bg-primary/30'
            }`} />
            <div className="relative">
              <div className="mb-8 flex items-center justify-between">
                <Logo
                  width={76}
                  height={76}
                  className={theme === "light" ? "drop-shadow-[0_4px_18px_rgba(0,36,156,0.16)]" : "drop-shadow-[0_0_28px_rgba(0,217,172,0.22)]"}
                  priority
                />
                <span className="tech-label">{t("home.status")}</span>
              </div>

              <PixelDroneArt large />

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-surface/50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("stats.projects")}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{stats.projects}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface/50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("stats.competitions")}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{stats.competitions}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-border-highlight to-transparent" />
    </section>
  );
}


function StatsRow({ stats, t }: { stats: HomeStats; t: (k: string) => any }) {
  const items = [
    { icon: Zap, label: "stats.projects", value: stats.projects },
    { icon: Trophy, label: "stats.competitions", value: stats.competitions },
    { icon: Users, label: "stats.members", value: stats.members },
    { icon: Cpu, label: "stats.departments", value: stats.departments },
  ];

  return (
    <section className="relative border-y border-border/50 bg-surface/28 px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
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
