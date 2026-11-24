import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-term-border bg-term-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-term-muted">{label}</span>
        <Icon className="size-4 text-term-accent" aria-hidden="true" />
      </div>
      <p className="mt-3 font-mono text-2xl font-medium text-term-text">{value}</p>
      <p className="mt-1 font-mono text-[10px] text-term-muted">{hint}</p>
    </div>
  );
}
