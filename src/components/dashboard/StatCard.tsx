"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Tone = "neutral" | "warning" | "success" | "danger";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  /** Legacy tint prop — only used as a fallback when `tone` is not provided. */
  color?: string;
  /** Semantic tone — controls the small leading dot and (when interactive) hover accent. */
  tone?: Tone;
  /** When set, the card becomes a link to this URL. */
  href?: string;
  /** When set, the card becomes a button calling this handler (mutually exclusive with href). */
  onClick?: () => void;
}

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-primary",
  warning: "bg-amber-300",
  success: "bg-emerald-300",
  danger: "bg-red-300",
};

export function StatCard({ label, value, change, icon: Icon, color, tone, href, onClick }: StatCardProps) {
  const interactive = Boolean(href || onClick);
  const dotClass = TONE_DOT[tone ?? "neutral"];

  const inner = (
    <div className="rounded-2xl border border-border/60 bg-surface/30 px-4 py-3 transition-colors group-hover:border-primary/30 sm:px-5 sm:py-4">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
        <span className="truncate">{label}</span>
        <Icon size={13} className={`ms-auto shrink-0 ${color ?? "text-muted/60"}`} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p
          data-stat-value
          className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-[1.6rem]"
        >
          {value}
        </p>
        <div className="flex items-center gap-1.5">
          {change && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                change.startsWith("+") ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
              }`}
            >
              {change}
            </span>
          )}
          {interactive && (
            <ArrowUpRight size={13} className="text-muted/40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          )}
        </div>
      </div>
    </div>
  );

  const wrapperClass = interactive
    ? "group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl"
    : "block";

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${wrapperClass} w-full text-start`}>
        {inner}
      </button>
    );
  }
  return <div className={wrapperClass}>{inner}</div>;
}
