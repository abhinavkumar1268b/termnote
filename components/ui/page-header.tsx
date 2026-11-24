import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-term-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-term-accent">{eyebrow}</p>
        ) : null}
        <h1 className="font-mono text-lg font-semibold tracking-tight text-term-text">{title}</h1>
        {description ? <p className="mt-1.5 text-xs text-term-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
