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
  instagram?: string | null;
  twitter?: string | null;
  youtube_channel_id?: string | null;
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
const InstagramLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zm0-2.16C8.74 0 8.33.01 7.05.07 5.78.13 4.91.33 4.14.63a5.86 5.86 0 0 0-2.13 1.39A5.86 5.86 0 0 0 .63 4.14C.33 4.91.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.14.56 2.91a5.86 5.86 0 0 0 1.39 2.13 5.86 5.86 0 0 0 2.13 1.39c.77.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.14-.26 2.91-.56a5.86 5.86 0 0 0 2.13-1.39 5.86 5.86 0 0 0 1.39-2.13c.3-.77.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.14-.56-2.91a5.86 5.86 0 0 0-1.39-2.13A5.86 5.86 0 0 0 19.86.63c-.77-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
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

  // Resolve each platform: prefer full URL, fall back to handle-style legacy fields.
  const xUrl = social.x || (social.twitter ? `https://x.com/${social.twitter}` : null);
  const instagramUrl = social.instagram?.startsWith("http")
    ? social.instagram
    : social.instagram
      ? `https://instagram.com/${social.instagram}`
      : null;

  const socialPlatforms: Array<{ key: string; label: string; href: string; Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement }> = [
    xUrl ? { key: "x", label: "X", href: xUrl, Icon: XLogo } : null,
    social.linkedin ? { key: "linkedin", label: "LinkedIn", href: social.linkedin, Icon: LinkedInLogo } : null,
    social.tiktok ? { key: "tiktok", label: "TikTok", href: social.tiktok, Icon: TikTokLogo } : null,
    instagramUrl ? { key: "instagram", label: "Instagram", href: instagramUrl, Icon: InstagramLogo } : null,
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
              <Logo width={44} height={44} className="drop-shadow-[0_0_12px_rgba(0,217,172,0.3)]" />
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
