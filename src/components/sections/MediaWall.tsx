"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminLink, ContentImage } from "@/lib/ui-helpers";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { MediaWallItem } from "@/hooks/useHomeData";

interface MediaWallProps {
  mediaWallItems: MediaWallItem[];
  mediaWallLoading: boolean;
  adminManage: string;
  lang: string;
  t: (key: string) => string;
}

export function MediaWall({ mediaWallItems, mediaWallLoading, adminManage, lang, t }: MediaWallProps) {
  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-4">
          <SectionHeader label={t("home.mediawall.label")} title={t("home.mediawall.title")} description={t("home.mediawall.desc")} />
          <AdminLink href="/dashboard/media" label={adminManage} />
        </div>

        {mediaWallLoading ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div className="card-feature min-h-[24rem] animate-pulse bg-surface-elevated" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="glass-card min-h-[12rem] animate-pulse bg-surface-elevated" />
              ))}
            </div>
          </div>
        ) : mediaWallItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/45 p-8">
            <p className="text-base font-semibold text-foreground">{t("home.mediawall.emptyTitle")}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("home.mediawall.emptyBody")}</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <LeadMediaCard item={mediaWallItems[0]} lang={lang} t={t} />

            <div className="grid gap-4 sm:grid-cols-2">
              {mediaWallItems.slice(1).map((item, index) => (
                <MediaCard key={item.id} item={item} index={index} lang={lang} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LeadMediaCard({ item, lang, t }: { item: MediaWallItem; lang: string; t: (key: string) => string }) {
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
      className="card-feature group overflow-hidden"
    >
      <div className="relative min-h-[25rem]">
        <ContentImage src={item.imageUrl} alt={item.title} sizes="(max-width: 1280px) 100vw, 44vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/52 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="badge badge-primary text-[10px] uppercase tracking-[0.18em]">{t(`home.mediawall.badge.${item.kind}`)}</span>
            <span className="rounded-full border border-white/10 bg-background/55 px-3 py-1 text-[11px] text-primary">{item.meta}</span>
          </div>
          <h2 className="max-w-2xl text-2xl font-semibold leading-tight text-white sm:text-3xl">{item.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/78 sm:text-base">{item.body || t("home.mediawall.desc")}</p>
          {item.href && (
            <Link href={item.href} className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-bright transition-colors">
              {t("home.mediawall.cta")}
              <ChevronRight size={15} className={lang === "ar" ? "rotate-180" : ""} />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MediaCard({ item, index, lang, t }: { item: MediaWallItem; index: number; lang: string; t: (key: string) => string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cardContent = (
    <div className="relative h-40">
      <ContentImage src={item.imageUrl} alt={item.title} sizes="(max-width: 1280px) 50vw, 22vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{t(`home.mediawall.badge.${item.kind}`)}</span>
        <h3 className="mt-2 text-base font-semibold leading-tight text-white">{item.title}</h3>
        <p className="mt-1 text-xs text-slate-300">{item.meta}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 14 }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      {item.href ? (
        <Link href={item.href} className="glass-card group block overflow-hidden">
          {cardContent}
        </Link>
      ) : (
        <div className="glass-card overflow-hidden">
          {cardContent}
        </div>
      )}
    </motion.div>
  );
}
