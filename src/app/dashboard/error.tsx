"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
        <AlertTriangle size={20} />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Something went wrong</h2>
        <p className="max-w-xs text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      </div>
      <button
        onClick={unstable_retry}
        className="rounded-full border border-border bg-surface-elevated px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
      >
        Try again
      </button>
    </div>
  );
}
