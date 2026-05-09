"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { pulseLevelValue } from "@/hooks/useHomeData";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { PulseItem } from "@/hooks/useHomeData";

interface PulseGridProps {
  pulseItems: PulseItem[];
  signalsLoading: boolean;
  lang: string;
  t: (key: string) => string;
}

export function PulseGrid({ pulseItems, signalsLoading, lang, t }: PulseGridProps) {
  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <SectionHeader label={t("home.pulse.label")} title={t("home.pulse.title")} description={t("home.pulse.desc")} />
        </div>

        {signalsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border border-border/80 bg-surface/48 p-5">
                <div className="h-4 w-20 animate-pulse rounded bg-surface-elevated" />
                <div className="mt-5 h-20 animate-pulse rounded-xl bg-surface-elevated" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pulseItems.map((item, index) => (
              <PulseCard key={item.key} item={item} index={index} t={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PulseCard({ item, index, t }: { item: PulseItem; index: number; t: (key: string) => string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 16 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="card-feature p-6"
    >
      <div className={`mb-4 h-1.5 w-full bg-gradient-to-r ${item.tone}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">{t("home.pulse.thisWeek")}</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{t(`dept.${item.key}.name`)}</h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center border border-primary/20 bg-background/35 text-primary">
          <item.icon size={17} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{item.summary}</span>
        <span className="rounded-full border border-border bg-background/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{t(`home.pulse.state.${item.level}`)}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((bar) => (
          <span key={bar} className={`h-1.5 flex-1 ${bar < pulseLevelValue(item.level) ? "bg-primary" : "bg-background/65"}`} />
        ))}
      </div>
    </motion.div>
  );
}
