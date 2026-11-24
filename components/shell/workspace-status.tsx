import { HardDrive } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import type { WorkspaceStatus } from "@/types/domain";

function formatGb(bytes: number): string {
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

export function WorkspaceStatusPanel({
  status,
  compact = false,
}: {
  status: WorkspaceStatus;
  compact?: boolean;
}) {
  const percent = Math.min(100, Math.round((status.storageUsedBytes / status.storageLimitBytes) * 100));

  return (
    <div className={cn("rounded-md border border-term-border bg-term-surface", compact ? "p-3" : "p-4")}>
      <p className="flex items-center gap-2 text-xs font-medium text-term-text">
        <StatusDot />
        {status.label}
      </p>
      <p className="mt-1 text-[11px] text-term-muted">{status.detail}</p>
      <div className="mt-3 flex items-center gap-2">
        <HardDrive className="size-3.5 shrink-0 text-term-muted" aria-hidden="true" />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-term-bg">
          <div className="h-full rounded-full bg-term-accent" style={{ width: `${percent}%` }} />
        </div>
        <span className="font-mono text-[10px] text-term-muted">{percent}%</span>
      </div>
      <p className="mt-2 font-mono text-[10px] text-term-muted">
        {formatGb(status.storageUsedBytes)} / {formatGb(status.storageLimitBytes)}
      </p>
    </div>
  );
}
