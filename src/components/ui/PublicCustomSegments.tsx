"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Quote } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import {
  CustomPageSegmentItem,
  CustomSegmentTemplate,
  DEFAULT_CUSTOM_PAGE_SEGMENTS,
  getCustomSegmentsKey,
  localizedValue,
  parseCollection,
  PublicPageKey,
} from "@/lib/public-content";

const TONE_GRADIENT: Record<CustomPageSegmentItem["tone"], string> = {
  accent: "from-primary/14 via-secondary/8 to-transparent",
  neutral: "from-foreground/6 via-foreground/2 to-transparent",
  warm: "from-amber-400/14 via-orange-400/8 to-transparent",
  cool: "from-sky-400/14 via-cyan-400/8 to-transparent",
};

const TONE_SOLID: Record<CustomPageSegmentItem["tone"], string> = {
  accent: "from-primary/40 via-secondary/30 to-primary/20",
  neutral: "from-foreground/20 via-foreground/10 to-transparent",
  warm: "from-amber-500/40 via-orange-500/25 to-rose-500/15",
  cool: "from-sky-500/40 via-cyan-500/25 to-blue-500/15",
};

function SegmentImage({
  src,
  alt,
  sizes,
  fill = true,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  fill?: boolean;
  className?: string;
}) {
  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        sizes={sizes}
        className={className ?? "object-cover"}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className ?? "absolute inset-0 h-full w-full object-cover"}
    />
  );
}

export function PublicCustomSegments({ page }: { page: PublicPageKey }) {
  const { lang } = useLang();
  const [segments, setSegments] = useState<CustomPageSegmentItem[]>(DEFAULT_CUSTOM_PAGE_SEGMENTS);

  useEffect(() => {
    api.get<{ key: string; json: CustomPageSegmentItem[] | null }>(`/api/site-content/${getCustomSegmentsKey(page)}`)
      .then((data) => setSegments(parseCollection(data?.json, DEFAULT_CUSTOM_PAGE_SEGMENTS)))
      .catch(() => {});
  }, [page]);

  if (!segments.length) return null;

  return (
    <>
      {segments.map((segment, index) => {
        const title = localizedValue(lang, segment.titleEn, segment.titleAr);
        const body = localizedValue(lang, segment.bodyEn, segment.bodyAr);
        const badge = localizedValue(lang, segment.badgeEn, segment.badgeAr);
        const cta = localizedValue(lang, segment.ctaEn, segment.ctaAr);
        const template: CustomSegmentTemplate = segment.template ?? "split-feature";
        const key = `${page}-${segment.titleEn || segment.titleAr || index}`;

        switch (template) {
          case "hero-banner":
            return (
              <HeroBanner
                key={key}
                segment={segment}
                title={title}
                body={body}
                badge={badge}
                cta={cta}
              />
            );
          case "stacked":
            return (
              <Stacked
                key={key}
                segment={segment}
                title={title}
                body={body}
                badge={badge}
                cta={cta}
                index={index}
              />
            );
          case "quote-card":
            return (
              <QuoteCard
                key={key}
                segment={segment}
                title={title}
                body={body}
              />
            );
          case "gallery":
            return (
              <Gallery
                key={key}
                segment={segment}
                title={title}
                body={body}
                badge={badge}
                cta={cta}
                index={index}
              />
            );
          case "cta-banner":
            return (
              <CtaBanner
                key={key}
                segment={segment}
                title={title}
                body={body}
                cta={cta}
              />
            );
          case "split-feature":
          default:
            return (
              <SplitFeature
                key={key}
                segment={segment}
                title={title}
                body={body}
                badge={badge}
                cta={cta}
                index={index}
              />
            );
        }
      })}
    </>
  );
}

interface SegmentRenderProps {
  segment: CustomPageSegmentItem;
  title: string;
  body: string;
  badge?: string;
  cta?: string;
  index?: number;
}

function SplitFeature({ segment, title, body, badge, cta, index = 0 }: SegmentRenderProps) {
  const showPrimaryImage = segment.mediaMode !== "none" && Boolean(segment.imageUrl);
  const showSecondaryImage = segment.mediaMode === "double" && Boolean(segment.secondaryImageUrl);
  const reverse = segment.align === "right";

  return (
    <section className="relative px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="card-feature overflow-hidden"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${TONE_GRADIENT[segment.tone] ?? TONE_GRADIENT.accent}`} />
          <div className={`relative grid gap-0 ${showPrimaryImage ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]" : "grid-cols-1"}`}>
            <div className={`p-8 sm:p-10 lg:p-14 ${reverse && showPrimaryImage ? "lg:order-2" : ""}`}>
              {badge ? (
                <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/90">
                  {badge}
                </span>
              ) : null}
              <h3 className="mt-5 max-w-3xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {title}
              </h3>
              {body ? (
                <p className="mt-5 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                  {body}
                </p>
              ) : null}
              {segment.href && cta ? (
                <div className="mt-7">
                  <Link href={segment.href} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                    {cta}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ) : null}
            </div>

            {showPrimaryImage ? (
              <div className={`relative min-h-[260px] border-t border-border/70 lg:min-h-[420px] lg:border-l lg:border-t-0 ${reverse ? "lg:order-1 lg:border-l-0 lg:border-r" : ""}`}>
                <div className={`grid h-full gap-3 p-3 ${showSecondaryImage ? "grid-rows-[1.35fr_0.9fr]" : "grid-rows-1"}`}>
                  <div className="relative overflow-hidden rounded-[26px] border border-border bg-surface-elevated">
                    <SegmentImage src={segment.imageUrl} alt={title || `segment-${index + 1}`} sizes="(min-width: 1024px) 40vw, 100vw" />
                  </div>
                  {showSecondaryImage && segment.secondaryImageUrl ? (
                    <div className="relative overflow-hidden rounded-[22px] border border-border bg-surface-elevated">
                      <SegmentImage src={segment.secondaryImageUrl} alt={`${title || `segment-${index + 1}`} secondary`} sizes="(min-width: 1024px) 40vw, 100vw" />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroBanner({ segment, title, body, badge, cta }: SegmentRenderProps) {
  const hasImage = Boolean(segment.imageUrl);
  return (
    <section className="relative px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border bg-surface min-h-[420px]"
        >
          {hasImage ? (
            <div className="absolute inset-0">
              <SegmentImage src={segment.imageUrl} alt={title || "banner"} sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/40 to-black/20" />
              <div className={`absolute inset-0 bg-gradient-to-br ${TONE_GRADIENT[segment.tone] ?? TONE_GRADIENT.accent} mix-blend-overlay`} />
            </div>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${TONE_SOLID[segment.tone] ?? TONE_SOLID.accent}`} />
          )}

          <div className="relative px-8 py-20 sm:px-12 sm:py-28 text-center max-w-3xl mx-auto">
            {badge ? (
              <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm">
                {badge}
              </span>
            ) : null}
            <h3 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl drop-shadow-lg">
              {title}
            </h3>
            {body ? (
              <p className="mt-5 text-base leading-7 text-white/80 sm:text-lg max-w-2xl mx-auto">
                {body}
              </p>
            ) : null}
            {segment.href && cta ? (
              <div className="mt-7">
                <Link href={segment.href} className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm">
                  {cta}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stacked({ segment, title, body, badge, cta, index = 0 }: SegmentRenderProps) {
  const hasImage = segment.mediaMode !== "none" && Boolean(segment.imageUrl);
  return (
    <section className="relative px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border bg-surface"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${TONE_GRADIENT[segment.tone] ?? TONE_GRADIENT.accent}`} />
          {hasImage ? (
            <div className="relative h-64 sm:h-80">
              <SegmentImage src={segment.imageUrl} alt={title || `segment-${index + 1}`} sizes="(min-width: 768px) 768px, 100vw" />
            </div>
          ) : null}
          <div className="relative p-7 sm:p-10">
            {badge ? (
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/90">
                {badge}
              </span>
            ) : null}
            <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h3>
            {body ? (
              <p className="mt-4 text-sm leading-7 text-muted sm:text-base">{body}</p>
            ) : null}
            {segment.href && cta ? (
              <div className="mt-6">
                <Link href={segment.href} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                  {cta}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            ) : null}
          </div>
        </motion.article>
      </div>
    </section>
  );
}

function QuoteCard({ segment, title, body }: SegmentRenderProps) {
  return (
    <section className="relative px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.figure
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-12 sm:px-12 sm:py-16 text-center bg-gradient-to-br ${TONE_GRADIENT[segment.tone] ?? TONE_GRADIENT.accent}`}
        >
          <Quote size={36} className="mx-auto text-primary/60" />
          <blockquote className="mt-6 text-xl font-medium leading-9 text-foreground sm:text-2xl sm:leading-10">
            “{body || title}”
          </blockquote>
          {body && title ? (
            <figcaption className="mt-6 text-sm font-semibold text-primary/80 uppercase tracking-[0.18em]">
              — {title}
            </figcaption>
          ) : null}
        </motion.figure>
      </div>
    </section>
  );
}

function Gallery({ segment, title, body, badge, cta, index = 0 }: SegmentRenderProps) {
  const images = [segment.imageUrl, segment.secondaryImageUrl].filter(Boolean);
  return (
    <section className="relative px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          {badge ? (
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/90">
              {badge}
            </span>
          ) : null}
          <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h3>
          {body ? (
            <p className="mt-4 text-sm leading-7 text-muted sm:text-base">{body}</p>
          ) : null}
          {segment.href && cta ? (
            <div className="mt-6">
              <Link href={segment.href} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                {cta}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : null}
        </motion.div>

        {images.length ? (
          <div className={`grid gap-4 ${images.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
            {images.map((src, i) => (
              <motion.div
                key={`${src}-${i}`}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface-elevated"
              >
                <SegmentImage src={src} alt={`${title || `segment-${index + 1}`} ${i + 1}`} sizes="(min-width: 768px) 50vw, 100vw" />
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CtaBanner({ segment, title, body, cta }: SegmentRenderProps) {
  return (
    <section className="relative px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r ${TONE_SOLID[segment.tone] ?? TONE_SOLID.accent} px-8 py-8 sm:px-12 sm:py-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h3>
            {body ? (
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base max-w-2xl">{body}</p>
            ) : null}
          </div>
          {segment.href && cta ? (
            <Link href={segment.href} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm shrink-0 self-start sm:self-center">
              {cta}
              <ArrowUpRight size={14} />
            </Link>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
