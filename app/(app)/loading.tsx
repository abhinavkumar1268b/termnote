export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading workspace">
      <div className="h-8 w-48 animate-pulse rounded bg-term-surface" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-lg border border-term-border bg-term-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-term-border bg-term-surface" />
      <span className="sr-only">Loading workspace data…</span>
    </div>
  );
}
