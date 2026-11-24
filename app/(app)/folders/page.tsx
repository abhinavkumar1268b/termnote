import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { FolderExplorer } from "@/features/folders/components/folder-explorer";
import { listFiles, listFolders, listNotes } from "@/lib/data/queries";

export const metadata = { title: "Folders — TermNote" };
export const dynamic = "force-dynamic";

export default async function FoldersPage() {
  const [folders, notes, files] = await Promise.all([listFolders(), listNotes(), listFiles()]);
  const error = folders.error ?? notes.error ?? files.error;

  return (
    <>
      <PageHeader
        eyebrow="Organise"
        title="Folder explorer"
        description="Nested folders in this workspace."
      />
      {error ? (
        error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />
      ) : (
        <FolderExplorer
          folders={(folders.data ?? []).map((folder) => ({
            ...folder,
            noteCount: (notes.data ?? []).filter((note) => note.folderId === folder.id).length,
          }))}
          notes={notes.data ?? []}
          files={files.data ?? []}
        />
      )}
    </>
  );
}
