import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-term-border bg-term-surface/50 px-6 py-14 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-md border border-term-border bg-term-elevated">
        <Icon className="size-5 text-term-accent" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-medium text-term-text">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-term-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
