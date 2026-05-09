"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { Users } from "lucide-react";
import { AdminLink } from "@/lib/ui-helpers";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { MonthMember } from "@/hooks/useHomeData";

interface MOTMGridProps {
  visible: boolean;
  motm: MonthMember[];
  adminManage: string;
  lang: string;
  t: (key: string) => string;
}

export function MOTMGrid({ visible, motm, adminManage, lang, t }: MOTMGridProps) {
  if (!visible || motm.length === 0) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-4">
          <SectionHeader label={t("home.motm.label")} title={t("home.motm.title")} description={t("home.motm.desc")} />
          <AdminLink href="/dashboard/hr" label={adminManage} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {motm.map((member, index) => (
            <MOTMCard key={member.memberId} member={member} index={index} lang={lang} />
          ))}
        </div>

        <Link href="/team" className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-bright transition-colors">
          {t("home.motm.viewteam")}
        </Link>
      </div>
    </section>
  );
}

function MOTMCard({ member, index, lang }: { member: MonthMember; index: number; lang: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 14 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card flex items-center gap-3 p-4"
    >
      <div className="flex h-11 w-11 items-center justify-center border border-primary/20 bg-primary/10">
        <Users size={17} className="text-primary/70" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{lang === "ar" && member.fullNameAr ? member.fullNameAr : member.fullName}</p>
        <p className="truncate text-xs text-primary/80">{lang === "ar" && member.departmentNameAr ? member.departmentNameAr : member.departmentName}</p>
      </div>
    </motion.div>
  );
}
