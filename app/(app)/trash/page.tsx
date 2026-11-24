import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { TrashManager } from "@/features/trash/components/trash-manager";
import { listTrash } from "@/lib/data/queries";

export const metadata = { title: "Trash — TermNote" };
export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const trash = await listTrash();

  return (
    <>
      <PageHeader
        eyebrow="Recovery"
        title="Trash"
        description="Soft-deleted items. Restore or permanently delete them explicitly."
      />
      {trash.error ? (
        trash.error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={trash.error} />
      ) : (
        <TrashManager items={trash.data ?? []} />
      )}
    </>
  );
}
