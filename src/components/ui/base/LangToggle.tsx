"use client";

import React from "react";
import { useLang } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LangToggleProps {
  showLabel?: boolean;
  collapsed?: boolean;
}

export function LangToggle({ showLabel = false, collapsed = false }: LangToggleProps) {
  const { lang, toggleLang } = useLang();

  return (
    <button
      onClick={toggleLang}
      className={`
        flex items-center gap-3 rounded-xl transition-all duration-300
        ${showLabel ? "w-full px-3 py-2 text-xs text-muted hover:bg-surface hover:text-foreground" : "p-2 text-muted hover:text-foreground hover:bg-surface-elevated"}
        ${collapsed ? "justify-center" : ""}
      `}
      aria-label="Toggle language"
    >
      <Languages size={showLabel ? 14 : 16} className="shrink-0" />
      
      {showLabel && !collapsed && (
        <>
          <span className="flex-1 text-left">
            {lang === "en" ? "Language" : "اللغة"}
          </span>
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-bold text-foreground">
            {lang === "en" ? "AR" : "EN"}
          </span>
        </>
      )}

      {!showLabel && (
        <AnimatePresence mode="wait">
          <motion.span
            key={lang}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] font-bold"
          >
            {lang === "en" ? "ع" : "EN"}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );
}
