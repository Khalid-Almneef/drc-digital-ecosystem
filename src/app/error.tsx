"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
        <AlertTriangle size={24} />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      </div>
      <button
        onClick={unstable_retry}
        className="rounded-full border border-border bg-surface-elevated px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
      >
        Try again
      </button>
    </div>
  );
}
