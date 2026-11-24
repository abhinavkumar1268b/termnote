import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { SharedTabs } from "@/features/sharing/components/shared-tabs";
import { listShares, listSharedWithMe } from "@/lib/data/queries";

export const metadata = { title: "Shared notes — TermNote" };
export const dynamic = "force-dynamic";

export default async function SharedPage() {
  const [byMe, withMe] = await Promise.all([listShares(), listSharedWithMe()]);
  const error = byMe.error ?? withMe.error;

  return (
    <>
      <PageHeader
        eyebrow="Sharing"
        title="Shared notes"
        description="Individual notes only. The workspace stays private."
      />
      {error ? (
        error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />
      ) : (
        <SharedTabs byMe={byMe.data ?? []} withMe={withMe.data ?? []} />
      )}
      <p className="mt-4 font-mono text-[10px] text-term-muted">
        Invitation tokens are hashed at rest. Revoked collaborators lose access immediately.
      </p>
    </>
  );
}
