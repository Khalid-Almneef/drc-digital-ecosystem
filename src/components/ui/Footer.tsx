"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";

interface SocialHandles {
  x?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  // Kept only for parsing legacy handle-style values stored in social.handles —
  // never displayed in the footer (Instagram + YouTube were removed).
  twitter?: string | null;
}

// Tight inline SVGs for platforms lucide-react doesn't ship — keeps the footer
// self-contained without pulling in another icon dep.
const XLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2H21.5L14.05 10.516 22.78 22h-6.94l-5.43-7.06L4.21 22H.949l7.96-9.1L.5 2h7.094l4.91 6.49L18.244 2zm-1.22 18h1.928L7.05 4H5.02l12.004 16z" />
  </svg>
);
const LinkedInLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.45 20.45h-3.555v-5.57c0-1.328-.024-3.037-1.85-3.037-1.852 0-2.135 1.446-2.135 2.94v5.667H9.355V9h3.414v1.561h.046c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.265 2.37 4.265 5.455v6.284zM5.339 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.118 20.45H3.557V9h3.561v11.45zM22.227 0H1.77C.792 0 0 .774 0 1.728v20.544C0 23.226.792 24 1.77 24h20.452c.978 0 1.778-.774 1.778-1.728V1.728C24 .774 23.2 0 22.227 0z" />
  </svg>
);
const TikTokLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.74a8.16 8.16 0 0 0 4.77 1.52V6.81a4.85 4.85 0 0 1-1.84-.12z" />
  </svg>
);

export function Footer() {
  const { t, lang } = useLang();
  const [social, setSocial] = useState<SocialHandles>({});
  const [contactEmail, setContactEmail] = useState("partnerships@drc.club");

  useEffect(() => {
    api.get<{ json: SocialHandles }>("/api/site-content/social.handles")
      .then((d) => { if (d?.json) setSocial(d.json); })
      .catch(() => {});

    api.get<{ en: string | null }>("/api/site-content/contact.email")
      .then((d) => {
        if (d?.en?.trim()) setContactEmail(d.en.trim());
      })
      .catch(() => {});
  }, []);

  // Resolve each platform: prefer full URL, fall back to handle-style legacy
  // values for X (the only platform we still support legacy handles for).
  const xUrl = social.x || (social.twitter ? `https://x.com/${social.twitter}` : null);

  const socialPlatforms: Array<{ key: string; label: string; href: string; Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement }> = [
    xUrl ? { key: "x", label: "X", href: xUrl, Icon: XLogo } : null,
    social.linkedin ? { key: "linkedin", label: "LinkedIn", href: social.linkedin, Icon: LinkedInLogo } : null,
    social.tiktok ? { key: "tiktok", label: "TikTok", href: social.tiktok, Icon: TikTokLogo } : null,
  ].filter((p): p is { key: string; label: string; href: string; Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement } => p !== null);

  const footerLinks = {
    club: [
      { label: t("footer.club.about"), href: "/about" },
      { label: t("footer.club.projects"), href: "/projects" },
      { label: t("footer.club.events"), href: "/events" },
      { label: t("footer.club.team"), href: "/team" },
    ],
  };

  return (
    <footer className="relative border-t border-border bg-surface/50">
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-gradient-to-t from-primary/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-5">
              <Logo width={44} height={44} className="drop-shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_30%,transparent)]" />
              <div>
                <span className="font-bold text-lg text-foreground tracking-tight">{t("footer.brand.name")}</span>
                <span className="block text-xs text-muted">{t("footer.brand.subtitle")}</span>
              </div>
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              {t("footer.brand.description")}
            </p>
            {lang === "ar" && (
              <p className="text-sm text-muted mt-2 font-medium" dir="rtl">
                {t("footer.brand.arabic")}
              </p>
            )}
          </div>

          {/* Club Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">{t("footer.club.title")}</h4>
            <ul className="space-y-3">
              {footerLinks.club.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted hover:text-primary transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect — social icons */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">{t("footer.connect.title")}</h4>
            {socialPlatforms.length === 0 ? (
              <p className="text-sm text-muted/55">{t("footer.connect.empty")}</p>
            ) : (
              <ul className="flex flex-wrap items-center gap-2">
                {socialPlatforms.map((p) => (
                  <li key={p.key}>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={p.label}
                      title={p.label}
                      className="group inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated/45 text-muted transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
                    >
                      <p.Icon className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-surface-elevated/45 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Mail size={17} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{t("footer.contact.title")}</h4>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{t("footer.contact.desc")}</p>
              </div>
            </div>
            <a href={`mailto:${contactEmail}`} className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
              {contactEmail}
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="section-divider mt-12 mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted/60">
            © {new Date().getFullYear()} {t("footer.brand.subtitle")}. {t("footer.bottom.copyright")}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs text-primary/80">{t("footer.bottom.status")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
