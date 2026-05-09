"use client";

import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  const { user } = useAuth();
  return (
    <div className="mb-8 rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-elevated)_34%,transparent),transparent_28%),color-mix(in_srgb,var(--surface)_88%,transparent)] p-5 shadow-[0_18px_45px_rgba(2,10,24,0.16)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90">
            {user?.department}
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-[2.15rem]">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted sm:text-base">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
