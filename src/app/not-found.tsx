import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted">
        <SearchX size={24} />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Page not found</h2>
        <p className="max-w-sm text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      </div>
      <Link
        href="/"
        className="rounded-full border border-border bg-surface-elevated px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
      >
        Go home
      </Link>
    </div>
  );
}
