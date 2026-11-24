import { AppShell } from "@/components/shell/app-shell";
import { getWorkspaceSummary } from "@/lib/data/queries";
import { getSessionUser } from "@/lib/data/session";
import type { WorkspaceStatus } from "@/types/domain";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [session, summary] = await Promise.all([getSessionUser(), getWorkspaceSummary()]);

  const status: WorkspaceStatus | null = summary.data
    ? {
        label: "Workspace ready",
        detail: "Private storage · RLS enforced",
        storageUsedBytes: summary.data.storageUsedBytes,
        storageLimitBytes: summary.data.storageLimitBytes,
      }
    : null;

  return (
    <AppShell user={session.data} status={status}>
      {children}
    </AppShell>
  );
}
