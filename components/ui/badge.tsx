import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "accent" | "success" | "warning";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-term-border bg-term-elevated text-term-muted",
  accent: "border-term-accent/30 bg-term-accent/10 text-term-accent",
  success: "border-term-success/30 bg-term-success/10 text-term-success",
  warning: "border-term-bright/30 bg-term-bright/10 text-term-bright",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
