"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/base/Card";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  color?: string;
  /** When set, the card becomes a link to this URL. */
  href?: string;
  /** When set, the card becomes a button calling this handler (mutually exclusive with href). */
  onClick?: () => void;
}

export function StatCard({ label, value, change, icon: Icon, color = "text-primary", href, onClick }: StatCardProps) {
  const interactive = Boolean(href || onClick);

  const inner = (
    <CardBody className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 shadow-[0_0_16px_color-mix(in_srgb,var(--primary)_10%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)]" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, transparent), color-mix(in srgb, var(--secondary) 10%, transparent))" }}>
          <Icon size={16} className={color} />
        </div>
        <div className="flex items-center gap-2">
          {change && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              change.startsWith("+") ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
            }`}>
              {change}
            </span>
          )}
          {interactive && (
            <ArrowUpRight size={14} className="text-muted/50 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </div>
      </div>
      <p className="text-3xl font-extrabold tracking-[-0.03em] text-primary">{value}</p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{label}</p>
    </CardBody>
  );

  const cardClass = `p-0 ${interactive ? "group transition-all duration-200 hover:border-primary/30 cursor-pointer focus-within:border-primary/30" : ""}`;

  if (href) {
    return (
      <Link href={href} className="block">
        <Card variant="glass" className={cardClass}>{inner}</Card>
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-start">
        <Card variant="glass" className={cardClass}>{inner}</Card>
      </button>
    );
  }
  return <Card variant="glass" className="p-0">{inner}</Card>;
}
