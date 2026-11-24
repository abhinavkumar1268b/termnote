import { getWorkspaceSummary } from "@/lib/data/queries";
import { getSessionUser } from "@/lib/data/session";
import { TerminalHome } from "@/features/workspace/components/terminal-home";
import type { WorkspaceStatus } from "@/types/domain";

export const metadata = { title: "TermNote" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
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
    <TerminalHome
      user={session.data}
      workspaceName={session.data?.workspaceName ?? "Private Workspace"}
      status={status}
    />
  );
}
