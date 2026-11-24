import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";
import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { FileList } from "@/features/files/components/file-list";
import { NoteList } from "@/features/notes/components/note-list";
import { listFolders, listStarred } from "@/lib/data/queries";

export const metadata = { title: "Starred — TermNote" };
export const dynamic = "force-dynamic";

export default async function StarredPage() {
  const [starred, folders] = await Promise.all([listStarred(), listFolders()]);
  const error = starred.error ?? folders.error;
  const folderNames = Object.fromEntries((folders.data ?? []).map((folder) => [folder.id, folder.name]));

  return (
    <>
      <PageHeader eyebrow="Organise" title="Starred" description="Notes and files you marked as important." />
      {error ? (
        error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Starred notes</CardTitle>
              <CardMeta>{starred.data?.notes.length ?? 0} items</CardMeta>
            </CardHeader>
            <CardContent>
              <NoteList notes={starred.data?.notes ?? []} folderNames={folderNames} emptyTitle="No starred notes" emptyDescription="Star a note to pin it here." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Starred files</CardTitle>
              <CardMeta>{starred.data?.files.length ?? 0} items</CardMeta>
            </CardHeader>
            <CardContent>
              <FileList files={starred.data?.files ?? []} folderNames={folderNames} emptyTitle="No starred files" emptyDescription="Star a file to pin it here." />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
