import { cn } from "@/lib/utils";

/** Shared geometric TERMNOTE wordmark. */
export function BrandMark({
  size = "sm",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-mono font-bold uppercase text-term-accent",
        size === "sm" ? "text-sm tracking-[0.16em]" : "text-5xl tracking-[-0.06em] sm:text-6xl",
        className,
      )}
    >
      TERMNOTE
      <span className="inline-block h-[0.28em] w-[0.28em] translate-y-[-0.02em] bg-term-accent" aria-hidden="true" />
    </span>
  );
}
