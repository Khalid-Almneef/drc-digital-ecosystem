"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  once?: boolean;
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  distance = 24,
  duration = 0.6,
  once = true,
}: RevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: "-80px" });
  const offsets = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  };

  const offset = offsets[direction];

  // Always render visible; only animate after mount + in view
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0.74, x: offset.x * 0.5, y: offset.y * 0.5 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0.74, x: offset.x * 0.5, y: offset.y * 0.5 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// Simpler fade-only variant for cards/grids
export function RevealFade({
  children,
  className = "",
  delay = 0,
  duration = 0.55,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0.78, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.78, y: 10 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
