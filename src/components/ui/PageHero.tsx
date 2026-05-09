"use client";

import { motion } from "framer-motion";

interface PageHeroProps {
  label: string;
  title: string;
  accentText?: string;
  description: string;
}

export function PageHero({ label, title, accentText, description }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-22 sm:pt-36 sm:pb-24">
      {/* Ambient */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[420px] w-[840px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/7 via-secondary/4 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute top-20 right-0 h-[300px] w-[300px] rounded-full bg-gradient-to-bl from-secondary/10 to-transparent blur-[80px]" />
      <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-border-highlight to-transparent" />

      <div className="relative mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex justify-center"
        >
          <span className="tech-label">{label}</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl gradient-text text-4xl font-bold tracking-[-0.04em] leading-[0.98] sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {title}
          {accentText && (
            <>
              <br />
              <span className="gradient-text-accent">{accentText}</span>
            </>
          )}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mt-7 max-w-2xl text-base leading-8 text-muted sm:text-lg"
        >
          {description}
        </motion.p>
      </div>
    </section>
  );
}
