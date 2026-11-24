import { Card, CardContent } from "@/components/ui/card";
import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { NotesManager } from "@/features/notes/components/notes-manager";
import { listFolders, listNotes } from "@/lib/data/queries";

export const metadata = { title: "All notes — TermNote" };
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notes, folders] = await Promise.all([listNotes(), listFolders()]);
  const error = notes.error ?? folders.error;
  const folderNames = Object.fromEntries((folders.data ?? []).map((folder) => [folder.id, folder.name]));

  return (
    <>
      <PageHeader eyebrow="Notes" title="All notes" description="Create, search, move and organise persisted notes." />
      {error ? (
        error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />
      ) : (
        <Card>
          <CardContent>
            <NotesManager notes={notes.data ?? []} folderNames={folderNames} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
