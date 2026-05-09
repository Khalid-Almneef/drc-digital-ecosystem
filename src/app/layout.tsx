import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://drc.club";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "DRC — Drones & Robotics Club", template: "%s | DRC" },
  description: "Engineer the future of flight — student-led drones and robotics club.",
  keywords: ["drones", "robotics", "club", "DRC", "innovation", "engineering", "students"],
  authors: [{ name: "Drones & Robotics Club" }],
  alternates: {
    canonical: "/",
    languages: { en: "/", ar: "/?lang=ar" },
  },
  openGraph: {
    title: "DRC — Drones & Robotics Club",
    description: "Engineer the future of flight — student-led drones and robotics club.",
    type: "website",
    url: SITE_URL,
    siteName: "DRC",
    locale: "en_US",
    alternateLocale: "ar_SA",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DRC — Drones & Robotics Club" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DRC — Drones & Robotics Club",
    description: "Engineer the future of flight.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const storedLang = cookieStore.get("drc-lang")?.value;
  const storedTheme = cookieStore.get("drc-theme")?.value;
  const lang = storedLang === "ar" ? "ar" : "en";
  const theme = storedTheme === "light" ? "light" : "dark";

  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      data-theme={theme}
      className={`${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const theme = localStorage.getItem("drc-theme");
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    const rawPalette = localStorage.getItem("drc-palette");
    if (!rawPalette) return;
    const palette = JSON.parse(rawPalette);
    const valid = ["primary", "secondary", "accent"].every((key) => /^#[0-9a-fA-F]{6}$/.test(palette?.[key]));
    if (!valid) return;
    const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
    const toRgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
    const toHex = ({ r, g, b }) => "#" + [r, g, b].map((value) => clamp(value).toString(16).padStart(2, "0")).join("");
    const mix = (fromHex, toHexValue, weight) => {
      const from = toRgb(fromHex);
      const to = toRgb(toHexValue);
      return toHex({ r: from.r + (to.r - from.r) * weight, g: from.g + (to.g - from.g) * weight, b: from.b + (to.b - from.b) * weight });
    };
    const activeTheme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const primaryDim = mix(palette.primary, "#001814", activeTheme === "light" ? 0.22 : 0.28);
    const primaryBright = mix(palette.primary, "#ffffff", activeTheme === "light" ? 0.18 : 0.22);
    const secondaryLight = mix(palette.secondary, "#ffffff", activeTheme === "light" ? 0.14 : 0.18);
    const borderHighlight = mix(palette.primary, "#ffffff", 0.28);
    document.documentElement.style.setProperty("--primary", palette.primary);
    document.documentElement.style.setProperty("--primary-dim", primaryDim);
    document.documentElement.style.setProperty("--primary-bright", primaryBright);
    document.documentElement.style.setProperty("--secondary", palette.secondary);
    document.documentElement.style.setProperty("--secondary-light", secondaryLight);
    document.documentElement.style.setProperty("--accent", palette.accent);
    document.documentElement.style.setProperty("--border-highlight", borderHighlight + "55");
    document.documentElement.style.setProperty("--accent-glow", activeTheme === "light" ? palette.accent + "22" : palette.accent + "1f");
    document.documentElement.style.setProperty("--cursor-glow-primary", activeTheme === "light" ? palette.primary + "2e" : palette.primary + "1f");
    document.documentElement.style.setProperty("--cursor-glow-secondary", activeTheme === "light" ? palette.secondary + "22" : palette.secondary + "18");
  } catch {}
})();
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <AuthProvider>
          <ThemeProvider initialTheme={theme}>
            <LanguageProvider initialLang={lang}>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  classNames: {
                    toast: "border border-border bg-surface text-foreground shadow-xl",
                    title: "font-semibold text-foreground",
                    description: "text-muted",
                    success: "border-emerald-500/30 bg-emerald-500/10",
                    error: "border-red-500/30 bg-red-500/10",
                    warning: "border-amber-500/30 bg-amber-500/10",
                  },
                }}
              />
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
