"use client";

export function HUDLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-primary">
      <span className="inline-block h-px w-3 bg-primary/40" />
      {children}
      <span className="inline-block h-px w-3 bg-primary/40" />
    </span>
  );
}
