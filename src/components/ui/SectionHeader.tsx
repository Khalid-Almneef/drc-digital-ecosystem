"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface SectionHeaderProps {
  label: string;
  title: string;
  description?: string;
  centered?: boolean;
  index?: number;
}

export function SectionHeader({ label, title, description, centered = false, index }: SectionHeaderProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.72, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.72, y: 28 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={centered ? "text-center" : ""}
    >
      <p className="mb-5">
        <span className="tech-label">{label}</span>
      </p>
      <h2 className="gradient-text max-w-3xl text-3xl font-bold tracking-[-0.03em] leading-[1.04] sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className={`mt-6 text-base leading-8 text-muted sm:text-lg ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
