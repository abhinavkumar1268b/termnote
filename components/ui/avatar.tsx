import { cn } from "@/lib/utils";

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-term-accent/30 bg-term-accent/10 font-mono text-[11px] font-medium text-term-accent",
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
