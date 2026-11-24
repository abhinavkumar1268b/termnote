import { cn } from "@/lib/utils";

export function StatusDot({ tone = "success" }: { tone?: "success" | "muted" }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        tone === "success" ? "bg-term-success" : "bg-term-muted",
      )}
      aria-hidden="true"
    />
  );
}
