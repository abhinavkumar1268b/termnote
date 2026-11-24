import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";
import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { StorageUsage } from "@/features/dashboard/components/storage-usage";
import { FileManager } from "@/features/files/components/file-manager";
import { getWorkspaceSummary, listFiles, listFolders } from "@/lib/data/queries";
import { getMaxUploadBytes } from "@/lib/uploads/config";
import type { WorkspaceStatus } from "@/types/domain";

export const metadata = { title: "Files — TermNote" };
export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const [files, folders, summary] = await Promise.all([listFiles(), listFolders(), getWorkspaceSummary()]);
  const error = files.error ?? folders.error ?? summary.error;
  const folderNames = Object.fromEntries((folders.data ?? []).map((folder) => [folder.id, folder.name]));
  const status: WorkspaceStatus | null = summary.data
    ? {
        label: "Workspace ready",
        detail: "Private storage · RLS enforced",
        storageUsedBytes: summary.data.storageUsedBytes,
        storageLimitBytes: summary.data.storageLimitBytes,
      }
    : null;

  return (
    <>
      <PageHeader eyebrow="Storage" title="File manager" description="Metadata for privately stored files." />
      {error ? (
        error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>All files</CardTitle>
              <CardMeta>{files.data?.length ?? 0} items</CardMeta>
            </CardHeader>
            <CardContent>
              <FileManager files={files.data ?? []} folderNames={folderNames} maxUploadBytes={getMaxUploadBytes()} />
            </CardContent>
          </Card>
          {status ? <StorageUsage status={status} /> : null}
        </div>
      )}
    </>
  );
}
