"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { AdminLink, ContentImage } from "@/lib/ui-helpers";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { localizedValue } from "@/lib/public-content";
import type { HomeFeatureSpotlightItem } from "@/hooks/useHomeData";

interface SpotlightGridProps {
  featureSpotlights: HomeFeatureSpotlightItem[];
  leadSpotlight: HomeFeatureSpotlightItem;
  secondarySpotlights: HomeFeatureSpotlightItem[];
  adminManage: string;
  lang: "en" | "ar";
  t: (key: string) => string;
}

export function SpotlightGrid({ featureSpotlights, leadSpotlight, secondarySpotlights, adminManage, lang, t }: SpotlightGridProps) {
  if (featureSpotlights.length === 0) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-4">
          <SectionHeader label={t("section.story.label")} title={t("section.story.title")} description={t("section.story.desc")} />
          <AdminLink href="/dashboard/media" label={adminManage} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <LeadSpotlightCard leadSpotlight={leadSpotlight} lang={lang} />

          <div className="grid gap-4">
            {secondarySpotlights.map((spotlight, index) => (
              <SecondarySpotlightCard key={`${spotlight.titleEn}-${index}`} spotlight={spotlight} index={index} lang={lang} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LeadSpotlightCard({ leadSpotlight, lang }: { leadSpotlight: HomeFeatureSpotlightItem; lang: "en" | "ar" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.76, x: -18 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0.76, x: -18 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="card-feature overflow-hidden group"
    >
      <div className="grid min-h-[22rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="flex flex-col justify-between p-6 sm:p-8">
          <div>
            <span className="badge badge-primary text-[10px] uppercase tracking-[0.18em]">{localizedValue(lang, leadSpotlight.labelEn, leadSpotlight.labelAr)}</span>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{localizedValue(lang, leadSpotlight.titleEn, leadSpotlight.titleAr)}</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted sm:text-base">{localizedValue(lang, leadSpotlight.descriptionEn, leadSpotlight.descriptionAr)}</p>
          </div>
          <Link href={leadSpotlight.href || "/projects"} className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:text-primary-bright transition-colors group/link">
            {localizedValue(lang, leadSpotlight.ctaEn, leadSpotlight.ctaAr)}
            <ArrowUpRight size={15} className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </Link>
        </div>
        <div className="relative min-h-[16rem] overflow-hidden">
          <ContentImage src={leadSpotlight.imageUrl || "/logo-full.png"} alt={localizedValue(lang, leadSpotlight.titleEn, leadSpotlight.titleAr)} sizes="(max-width: 1280px) 100vw, 36vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent" />
        </div>
      </div>
    </motion.div>
  );
}

function SecondarySpotlightCard({ spotlight, index, lang }: { spotlight: HomeFeatureSpotlightItem; index: number; lang: "en" | "ar" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 16 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card overflow-hidden group"
    >
      <div className="grid min-h-[14rem] grid-cols-[8.5rem_1fr] sm:grid-cols-[10rem_1fr]">
        <div className="relative overflow-hidden">
          <ContentImage src={spotlight.imageUrl || "/logo-full.png"} alt={localizedValue(lang, spotlight.titleEn, spotlight.titleAr)} sizes="(max-width: 1280px) 40vw, 18vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-background/45 via-transparent to-transparent" />
        </div>
        <div className="p-5 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{localizedValue(lang, spotlight.labelEn, spotlight.labelAr)}</span>
          <h3 className="mt-3 text-lg font-semibold leading-tight text-foreground">{localizedValue(lang, spotlight.titleEn, spotlight.titleAr)}</h3>
          <p className="mt-3 text-sm leading-7 text-muted line-clamp-2">{localizedValue(lang, spotlight.descriptionEn, spotlight.descriptionAr)}</p>
          <Link href={spotlight.href || "/"} className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-bright transition-colors">
            {localizedValue(lang, spotlight.ctaEn, spotlight.ctaAr)}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
