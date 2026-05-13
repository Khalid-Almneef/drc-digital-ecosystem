"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Lightbulb, Code2, UsersRound, Cpu, Zap } from "lucide-react";
import { AdminLink } from "@/lib/ui-helpers";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { localizedValue } from "@/lib/public-content";
import type { HomeHighlightItem } from "@/hooks/useHomeData";

const HIGHLIGHT_ICON_MAP: Record<string, React.ElementType> = {
  lightbulb: Lightbulb,
  code2: Code2,
  "users-round": UsersRound,
  cpu: Cpu,
  zap: Zap,
};

interface HighlightGridProps {
  visible: boolean;
  homeHighlights: HomeHighlightItem[];
  adminManage: string;
  lang: "en" | "ar";
  t: (key: string) => string;
}

export function HighlightGrid({ visible, homeHighlights, adminManage, lang, t }: HighlightGridProps) {
  if (!visible) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-4">
          <SectionHeader label={t("section.whatwedo.label")} title={t("section.whatwedo.title")} description={t("section.whatwedo.desc")} />
          <AdminLink href="/dashboard/content" label={adminManage} />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {homeHighlights.map((item, index) => {
            const Icon = HIGHLIGHT_ICON_MAP[item.icon] ?? Lightbulb;
            return (
              <HighlightCard key={`${item.titleEn}-${item.titleAr}-${index}`} item={item} Icon={Icon} index={index} lang={lang} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HighlightCard({ item, Icon, index, lang }: { item: HomeHighlightItem; Icon: React.ElementType; index: number; lang: "en" | "ar" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 18 }}
      transition={{ duration: 0.55, delay: Math.min(index, 6) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="card-feature p-7 group"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center border border-primary/20 bg-primary/10 transition-colors group-hover:bg-primary/[0.15] group-hover:border-primary/30">
        <Icon size={21} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{localizedValue(lang, item.titleEn, item.titleAr)}</h3>
      <p className="mt-3 text-sm leading-7 text-muted">{localizedValue(lang, item.descriptionEn, item.descriptionAr)}</p>
    </motion.div>
  );
}
