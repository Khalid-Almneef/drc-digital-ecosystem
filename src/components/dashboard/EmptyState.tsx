import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {body && <p className="max-w-sm text-xs leading-6 text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
