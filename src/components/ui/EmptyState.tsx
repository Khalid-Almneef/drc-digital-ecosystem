import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-border bg-surface/40 px-6 py-12 text-center ${className ?? ""}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
