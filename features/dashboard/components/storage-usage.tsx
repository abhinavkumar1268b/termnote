import { HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";
import type { WorkspaceStatus } from "@/types/domain";

export function StorageUsage({ status }: { status: WorkspaceStatus }) {
  const { storageUsedBytes, storageLimitBytes } = status;
  const usedGb = (storageUsedBytes / 1_000_000_000).toFixed(2);
  const limitGb = (storageLimitBytes / 1_000_000_000).toFixed(1);
  const percent = Math.round((storageUsedBytes / storageLimitBytes) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage usage</CardTitle>
        <CardMeta>private bucket</CardMeta>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-2xl text-term-text">{usedGb} GB</p>
          <p className="font-mono text-xs text-term-muted">of {limitGb} GB</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-term-bg">
          <div className="h-full rounded-full bg-term-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 flex items-center gap-2 font-mono text-[10px] text-term-muted">
          <HardDrive className="size-3" aria-hidden="true" /> {percent}% used · files are stored privately
        </p>
      </CardContent>
    </Card>
  );
}
