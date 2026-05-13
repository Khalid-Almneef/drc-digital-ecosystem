"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHero } from "@/components/ui/PageHero";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import {
  Eye, Target, Lightbulb, Users, Camera, DollarSign, Truck,
  Shield, UserCheck, Code2, Megaphone, GraduationCap,
} from "lucide-react";
import {
  AboutTimelineItem,
  AboutValueItem,
  DEFAULT_ABOUT_TIMELINE,
  DEFAULT_ABOUT_VALUES,
  localizedValue,
  parseCollection,
} from "@/lib/public-content";

const VALUE_ICON_MAP: Record<string, React.ElementType> = {
  lightbulb: Lightbulb,
  users: Users,
  target: Target,
  shield: Shield,
};

const departments = [
  { icon: Shield,       slug: "executive"   },
  { icon: UserCheck,    slug: "hr"          },
  { icon: Code2,        slug: "development" },
  { icon: Lightbulb,   slug: "innovation"  },
  { icon: Camera,       slug: "media"       },
  { icon: Megaphone,    slug: "pr"          },
  { icon: DollarSign,   slug: "finance"     },
  { icon: Truck,        slug: "logistics"   },
  { icon: GraduationCap, slug: "madarat"   },
];

export default function AboutPage() {
  const { t, lang } = useLang();
  const [values, setValues] = useState<AboutValueItem[]>(DEFAULT_ABOUT_VALUES);
  const [timeline, setTimeline] = useState<AboutTimelineItem[]>(DEFAULT_ABOUT_TIMELINE);

  useEffect(() => {
    api.get<{ key: string; json: AboutValueItem[] | null }>("/api/site-content/about.values.items")
      .then((d) => setValues(parseCollection(d?.json, DEFAULT_ABOUT_VALUES)))
      .catch(() => {});

    api.get<{ key: string; json: AboutTimelineItem[] | null }>("/api/site-content/about.timeline.items")
      .then((d) => setTimeline(parseCollection(d?.json, DEFAULT_ABOUT_TIMELINE)))
      .catch(() => {});
  }, []);

  return (
    <div className="relative">
      <PageHero
        label={t("about.hero.label")}
        title={t("about.hero.title")}
        accentText={t("about.hero.accent")}
        description={t("about.hero.desc")}
      />

      {/* ═══ MISSION & VISION ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card p-8 md:p-10"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                <Eye size={22} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">{t("about.vision.title")}</h3>
              <p className="text-muted leading-relaxed">{t("about.vision.body")}</p>
              <p className="text-muted/60 mt-3 text-sm" dir="rtl">{t("about.vision.tagline")}</p>
            </motion.div>

            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card p-8 md:p-10"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center mb-5">
                <Target size={22} className="text-secondary-light" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">{t("about.mission.title")}</h3>
              <p className="text-muted leading-relaxed">{t("about.mission.body")}</p>
              <p className="text-muted/60 mt-3 text-sm" dir="rtl">{t("about.mission.tagline")}</p>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ VALUES ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("about.values.label")}
            title={t("about.values.title")}
            centered
          />

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((item, i) => {
              const Icon = VALUE_ICON_MAP[item.icon] ?? Lightbulb;
              return (
              <motion.div
                key={`${item.titleEn}-${i}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-8 card-hover text-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/15 transition-colors">
                  <Icon size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {localizedValue(lang, item.titleEn, item.titleAr)}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {localizedValue(lang, item.descriptionEn, item.descriptionAr)}
                </p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ DEPARTMENTS ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("about.depts.label")}
            title={t("about.depts.title")}
            description={t("about.depts.desc")}
          />

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept, i) => (
              <motion.div
                key={dept.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-6 card-hover flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0 group-hover:border-primary/20 transition-colors">
                  <dept.icon size={18} className="text-primary/70" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{t(`dept.${dept.slug}.name`)}</h4>
                  <p className="text-xs text-muted mt-1">{t(`dept.${dept.slug}.desc`)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ TIMELINE — compact summary ═══ */}
      <section className="relative py-14 px-6">
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            label={t("about.timeline.label")}
            title={t("about.timeline.title")}
            centered
          />

          <p className="mt-4 text-center text-sm leading-7 text-muted">
            {lang === "ar"
              ? "من تدشين النادي عام 2022 باسم DAAS إلى نادي الدرونز والروبوت اليوم بتسع لجان متخصصة — هذه أبرز محطاتنا."
              : "From the 2022 inauguration as DAAS to today's nine-committee Drones & Robotics Club — the milestones in brief."}
          </p>

          <div className="mt-10 relative">
            {/* Vertical guide line */}
            <div className="absolute start-3.5 top-1 bottom-1 w-px bg-gradient-to-b from-primary/30 via-primary/15 to-transparent" />

            <ul className="space-y-3">
              {timeline.map((item, i) => (
                <motion.li
                  key={`${item.year}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-4 ps-10"
                >
                  <span className="absolute start-2 top-2 h-3 w-3 rounded-full bg-surface border-2 border-primary/60" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-primary">{item.year}</span>
                      <h4 className="text-sm font-semibold text-foreground">
                        {localizedValue(lang, item.eventEn, item.eventAr)}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {localizedValue(lang, item.detailEn, item.detailAr)}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <PublicCustomSegments page="about" />
    </div>
  );
}
