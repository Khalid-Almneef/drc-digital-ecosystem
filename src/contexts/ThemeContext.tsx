"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "dark" | "light";

interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  palette: ThemePalette;
  hasCustomPalette: boolean;
  setPalette: (palette: ThemePalette) => void;
  resetPalette: () => void;
  /** Cursor / touch glow overlay. Off by default. */
  glowEnabled: boolean;
  setGlowEnabled: (next: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = "drc-theme";
const PALETTE_STORAGE_KEY = "drc-palette";
const GLOW_STORAGE_KEY = "drc-glow";

const DEFAULT_PALETTES: Record<Theme, ThemePalette> = {
  dark: {
    primary: "#00d9ac",
    secondary: "#00249c",
    accent: "#00d9ac",
  },
  light: {
    primary: "#007f68",
    secondary: "#00249c",
    accent: "#008a6d",
  },
};

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light";
}

function isPalette(value: unknown): value is ThemePalette {
  if (!value || typeof value !== "object") return false;
  const palette = value as Partial<ThemePalette>;
  return [palette.primary, palette.secondary, palette.accent].every((entry) => (
    typeof entry === "string" && /^#[0-9a-fA-F]{6}$/.test(entry)
  ));
}

function readStoredPalette(key: string): ThemePalette | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPalette(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredTheme(key: string): Theme | null {
  try {
    const storedTheme = localStorage.getItem(key);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function writeStoredPalette(key: string, palette: ThemePalette | null) {
  try {
    if (palette) localStorage.setItem(key, JSON.stringify(palette));
    else localStorage.removeItem(key);
  } catch {}
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, "0")).join("")}`;
}

function mix(hex: string, target: string, weight: number) {
  const from = hexToRgb(hex);
  const to = hexToRgb(target);
  return rgbToHex({
    r: from.r + (to.r - from.r) * weight,
    g: from.g + (to.g - from.g) * weight,
    b: from.b + (to.b - from.b) * weight,
  });
}

export function ThemeProvider({
  children,
  initialTheme = "dark",
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const { user, isLoading } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme(THEME_STORAGE_KEY) ?? initialTheme);
  const [customPalette, setCustomPalette] = useState<ThemePalette | null>(() => readStoredPalette(PALETTE_STORAGE_KEY));
  const [glowEnabled, setGlowEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GLOW_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [accountReady, setAccountReady] = useState(false);
  const localPreferenceWinsRef = useRef(false);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
        setTheme(event.newValue);
      }
      if (event.key === PALETTE_STORAGE_KEY) {
        setCustomPalette(readStoredPalette(PALETTE_STORAGE_KEY));
      }
      if (event.key === GLOW_STORAGE_KEY) {
        setGlowEnabledState(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!user?.id) {
      setAccountReady(true);
      return;
    }

    let cancelled = false;
    setAccountReady(false);

    const scopedThemeKey = `${THEME_STORAGE_KEY}:${user.id}`;
    const scopedPaletteKey = `${PALETTE_STORAGE_KEY}:${user.id}`;
    const storedTheme = readStoredTheme(scopedThemeKey);
    const storedPalette = readStoredPalette(scopedPaletteKey);

    localPreferenceWinsRef.current = Boolean(storedTheme || storedPalette);

    if (storedTheme) setTheme(storedTheme);
    if (storedPalette) setCustomPalette(storedPalette);

    fetch("/api/members/preferences", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        const preferences = body?.data?.preferences;
        if (!localPreferenceWinsRef.current && isTheme(preferences?.theme)) {
          setTheme(preferences.theme);
          try {
            localStorage.setItem(scopedThemeKey, preferences.theme);
          } catch {}
        }
        if (localPreferenceWinsRef.current) {
          return;
        }
        if (preferences?.palette === null) {
          setCustomPalette(null);
          writeStoredPalette(scopedPaletteKey, null);
        } else if (isPalette(preferences?.palette)) {
          setCustomPalette(preferences.palette);
          writeStoredPalette(scopedPaletteKey, preferences.palette);
        }
        if (typeof preferences?.glowEnabled === "boolean") {
          setGlowEnabledState(preferences.glowEnabled);
          try { localStorage.setItem(GLOW_STORAGE_KEY, String(preferences.glowEnabled)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAccountReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user?.id]);

  const palette = useMemo(
    () => customPalette ?? DEFAULT_PALETTES[theme],
    [customPalette, theme],
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    const primaryDim = mix(palette.primary, "#001814", theme === "light" ? 0.22 : 0.28);
    const primaryBright = mix(palette.primary, "#ffffff", theme === "light" ? 0.18 : 0.22);
    const secondaryLight = mix(palette.secondary, "#ffffff", theme === "light" ? 0.14 : 0.18);
    const borderHighlight = mix(palette.primary, "#ffffff", 0.28);
    const primaryRgb = hexToRgb(palette.primary);
    const secondaryRgb = hexToRgb(palette.secondary);
    const rgba = (rgb: { r: number; g: number; b: number }, a: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;

    root.classList.add("theme-switching");
    root.setAttribute("data-theme", theme);
    root.style.setProperty("--primary", palette.primary);
    root.style.setProperty("--primary-dim", primaryDim);
    root.style.setProperty("--primary-bright", primaryBright);
    root.style.setProperty("--secondary", palette.secondary);
    root.style.setProperty("--secondary-light", secondaryLight);
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--border", rgba(primaryRgb, theme === "light" ? 0.1 : 0.08));
    root.style.setProperty("--border-highlight", `${borderHighlight}55`);
    root.style.setProperty("--hud-line", rgba(primaryRgb, theme === "light" ? 0.1 : 0.12));
    root.style.setProperty("--prop-wash", rgba(theme === "light" ? secondaryRgb : primaryRgb, theme === "light" ? 0.05 : 0.06));
    root.style.setProperty("--accent-glow", theme === "light" ? `${palette.accent}22` : `${palette.accent}1f`);
    root.style.setProperty("--cursor-glow-primary", theme === "light" ? `${palette.primary}2e` : `${palette.primary}1f`);
    root.style.setProperty("--cursor-glow-secondary", theme === "light" ? `${palette.secondary}22` : `${palette.secondary}18`);

    const id = window.setTimeout(() => {
      root.classList.remove("theme-switching");
    }, 80);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      document.cookie = `drc-theme=${theme}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
      writeStoredPalette(PALETTE_STORAGE_KEY, customPalette);
      if (user?.id) {
        localStorage.setItem(`${THEME_STORAGE_KEY}:${user.id}`, theme);
        writeStoredPalette(`${PALETTE_STORAGE_KEY}:${user.id}`, customPalette);
      }
    } catch {}

    return () => window.clearTimeout(id);
  }, [customPalette, palette, theme, user?.id]);

  useEffect(() => {
    if (!accountReady || !user?.id) return;

    void fetch("/api/members/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme,
        palette: customPalette,
        glowEnabled,
      }),
    }).catch(() => {});
  }, [accountReady, customPalette, theme, glowEnabled, user?.id]);

  const setGlowEnabled = (next: boolean) => {
    localPreferenceWinsRef.current = true;
    setGlowEnabledState(next);
    try {
      localStorage.setItem(GLOW_STORAGE_KEY, String(next));
      if (user?.id) localStorage.setItem(`${GLOW_STORAGE_KEY}:${user.id}`, String(next));
    } catch {}
  };

  const toggleTheme = () => {
    localPreferenceWinsRef.current = true;
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const updateTheme = (nextTheme: Theme) => {
    localPreferenceWinsRef.current = true;
    setTheme(nextTheme);
  };

  const updatePalette = (nextPalette: ThemePalette) => {
    localPreferenceWinsRef.current = true;
    setCustomPalette(nextPalette);
  };

  const resetPalette = () => {
    localPreferenceWinsRef.current = true;
    setCustomPalette(null);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: updateTheme,
        toggleTheme,
        palette,
        hasCustomPalette: Boolean(customPalette),
        setPalette: updatePalette,
        resetPalette,
        glowEnabled,
        setGlowEnabled,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
