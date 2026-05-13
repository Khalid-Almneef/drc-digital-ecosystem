"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  showLabel?: boolean;
  collapsed?: boolean;
}

export function ThemeToggle({ showLabel = false, collapsed = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-3 rounded-xl transition-all duration-300
        ${showLabel ? "w-full px-3 py-2 text-xs text-muted hover:bg-surface hover:text-foreground" : "p-2 text-muted hover:text-foreground hover:bg-surface-elevated"}
        ${collapsed ? "justify-center" : ""}
      `}
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4 shrink-0">
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </div>
      
      {showLabel && !collapsed && (
        <>
          <span className="flex-1 text-left">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-bold text-foreground">
            {theme === "dark" ? "LIGHT" : "DARK"}
          </span>
        </>
      )}
    </button>
  );
}
