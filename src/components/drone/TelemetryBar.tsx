"use client";

import { motion } from "framer-motion";

export function TelemetryBar() {
  return (
    <div className="flex items-center gap-3 font-mono text-[0.6875rem] font-medium tracking-wide text-muted">
      {[
        { label: "ALT", value: "240m" },
        { label: "SIG", value: "98%" },
        { label: "BAT", value: "84%" },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="text-primary/60">{item.label}</span>
          <motion.span
            className="text-foreground/80"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {item.value}
          </motion.span>
        </div>
      ))}
    </div>
  );
}
