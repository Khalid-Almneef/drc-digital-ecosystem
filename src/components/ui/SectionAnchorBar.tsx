"use client";

import Link from "next/link";

export interface SectionAnchorItem {
  href: string;
  label: string;
}

interface SectionAnchorBarProps {
  items: SectionAnchorItem[];
  title?: string;
  lang?: string;
  className?: string;
}

export function SectionAnchorBar({ items, title, lang = "en", className = "" }: SectionAnchorBarProps) {
  return (
    <div className={`sticky top-20 z-20 px-6 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="rounded-full border border-border/80 bg-background/78 px-3 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {title ? (
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/75">
                {title}
              </p>
            ) : null}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
