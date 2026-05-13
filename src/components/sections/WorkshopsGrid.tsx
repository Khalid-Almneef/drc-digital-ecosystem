"use client";

import { useRef, useState, useEffect } from "react";
import { CSSProperties } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Play } from "lucide-react";
import { AdminLink } from "@/lib/ui-helpers";
import { toExternalUrl } from "@/lib/url";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CATEGORY_COLORS } from "@/data/workshops";
import type { Workshop } from "@/data/workshops";

interface WorkshopsGridProps {
  visible: boolean;
  workshops: Workshop[];
  adminManage: string;
  lang: string;
  t: (key: string) => string;
}

export function WorkshopsGrid({ visible, workshops, adminManage, lang, t }: WorkshopsGridProps) {
  if (!visible) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-4">
          <SectionHeader label={t("section.workshops.label")} title={t("section.workshops.title")} description={t("section.workshops.desc")} />
          <div className="flex items-center gap-4">
            <AdminLink href="/dashboard/development" label={adminManage} />
            <Link href="/workshops" className="hidden items-center gap-1.5 text-sm text-primary hover:text-primary-bright md:flex transition-colors">
              {t("section.workshops.viewall")}
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {workshops.map((workshop, index) => (
            <WorkshopCard key={workshop.id} workshop={workshop} index={index} lang={lang} t={t} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href="/workshops" className="btn-secondary inline-flex items-center gap-1.5 px-6 py-2.5 text-sm">
            {t("section.workshops.viewall")}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function WorkshopCard({ workshop, index, lang, t }: { workshop: Workshop; index: number; lang: string; t: (key: string) => string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const accent = CATEGORY_COLORS[workshop.category] ?? "var(--primary)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 18 }}
      transition={{ duration: 0.55, delay: Math.min(index, 6) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{ "--card-accent": accent } as CSSProperties}
      className="card-feature card-accent-top overflow-hidden group"
    >
      <div
        className="relative h-36 overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--surface-elevated) 0%, color-mix(in srgb, ${accent} 10%, transparent) 100%)` }}
      >
        <div className="absolute inset-0 bg-circuit opacity-15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center border transition-all duration-300 group-hover:scale-110"
            style={{ background: `${accent}18`, borderColor: `${accent}50` }}
          >
            <Play size={18} style={{ color: accent }} className="ml-0.5" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-3 left-3">
          <span
            className="rounded-full border px-2.5 py-1 text-xs font-semibold"
            style={{ color: accent, background: `${accent}15`, borderColor: `${accent}35` }}
          >
            {lang === "ar" ? workshop.categoryAr : workshop.category}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 rounded-full border border-border bg-surface/80 px-2 py-1 text-xs font-mono text-muted">
          {workshop.duration}{t("workshop.duration")}
        </div>
      </div>
      <div className="p-5">
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted">
          {workshop.presenter} · {workshop.date}
        </p>
        <h3 className="text-base font-semibold leading-snug text-foreground">{lang === "ar" ? workshop.titleAr : workshop.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">{lang === "ar" ? workshop.descriptionAr : workshop.description}</p>
        <a
          href={toExternalUrl(workshop.videoUrl)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-opacity-20"
          style={{ color: accent, borderColor: `${accent}35`, background: `${accent}08` }}
        >
          <Play size={10} fill="currentColor" />
          {t("workshop.watch")}
        </a>
      </div>
    </motion.div>
  );
}
