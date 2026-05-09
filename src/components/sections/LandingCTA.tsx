"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface LandingCTAProps {
  t: (key: string) => string;
}

export function LandingCTA({ t }: LandingCTAProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0.8, y: 22 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 22 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="card-feature overflow-hidden p-8 sm:p-12 md:p-16 relative"
        >
          <div className="relative text-center">
            <h2 className="gradient-text text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{t("section.cta.title")}</h2>
            <div className="mx-auto mt-5 max-w-2xl space-y-2">
              <p className="text-base leading-8 text-muted sm:text-lg">{t("section.cta.desc1")}</p>
              <p className="text-base leading-8 text-muted sm:text-lg">{t("section.cta.desc2")}</p>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/join" className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm">
                {t("section.cta.apply")}
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/about" className="btn-secondary inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm">
                {t("section.cta.learn")}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
