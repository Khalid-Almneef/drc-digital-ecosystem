"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Calendar, ChevronRight, Clock, Eye } from "lucide-react";
import { AdminLink } from "@/lib/ui-helpers";
import { toExternalUrl } from "@/lib/url";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Announcement } from "@/hooks/useHomeData";
import type { HomeAnnouncementCardItem } from "@/lib/public-content";

interface AnnouncementDeckProps {
  visible: boolean;
  announcements: Announcement[];
  announcementCards: HomeAnnouncementCardItem[];
  adminManage: string;
  lang: string;
  t: (key: string) => string;
}

export function AnnouncementDeck({ visible, announcements, announcementCards, adminManage, lang, t }: AnnouncementDeckProps) {
  const { isAnyLeader } = useAuth();

  if (!visible) return null;
  if (announcements.length === 0 && announcementCards.length === 0) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-4">
          <SectionHeader
            label={t("home.announcements.label")}
            title={t("home.announcements.title")}
            description={t("home.announcements.desc")}
          />
          {isAnyLeader && <AdminLink href="/dashboard/leaders" label={adminManage} />}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {announcementCards.length > 0 && <FeaturedCard card={announcementCards[0]} lang={lang} />}

          <div className="space-y-4">
            {announcements.map((item, index) => (
              <NewsCard key={item.announcementId} item={item} index={index} lang={lang} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({ card, lang }: { card: HomeAnnouncementCardItem; lang: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const title = lang === "ar" ? card.titleAr : card.titleEn;
  const body = lang === "ar" ? card.bodyAr : card.bodyEn;
  const badge = lang === "ar" ? card.badgeAr : card.badgeEn;
  const cta = lang === "ar" ? card.ctaAr : card.ctaEn;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.76, x: -18 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0.76, x: -18 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="card-feature group relative min-h-[20rem] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-surface-elevated/80 to-primary/15" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative flex h-full flex-col justify-between p-7 sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center border border-primary/25 bg-primary/12">
            <Eye size={20} className="text-primary" />
          </div>
          <span className="rounded-full border border-primary/10 bg-surface/55 px-3 py-1 text-[11px] font-bold text-primary">{badge}</span>
        </div>
        <div className="max-w-lg">
          <h3 className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{title}</h3>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted sm:text-base">{body}</p>
          <Link href={card.href || "/"} className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-surface/55 px-4 py-2 text-sm text-primary transition-colors hover:border-primary/40 hover:text-primary-bright">
            {cta}
            <ArrowUpRight size={14} className={lang === "ar" ? "rotate-180" : ""} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function NewsCard({ item, index, lang, t }: { item: Announcement; index: number; lang: string; t: (key: string) => string }) {
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
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      {(() => {
        const inner = (
          <div className="flex items-start gap-4">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.title} className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover" loading="lazy" />
            ) : null}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">{item.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{item.body || ""}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US") : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={11} />
                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
            </div>
            {item.linkUrl ? <ChevronRight size={16} className="mt-1 shrink-0 text-muted transition-colors group-hover:text-primary" /> : null}
          </div>
        );
        return item.linkUrl ? (
          <a href={toExternalUrl(item.linkUrl)} target="_blank" rel="noreferrer" className="glass-card group block p-5 transition-colors hover:bg-surface/65">
            {inner}
          </a>
        ) : (
          <div className="glass-card group p-5">{inner}</div>
        );
      })()}
    </motion.div>
  );
}
