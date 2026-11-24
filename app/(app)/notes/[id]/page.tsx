import { notFound } from "next/navigation";
import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { NoteEditor } from "@/features/editor/components/note-editor";
import { getNote, getNoteAccess, listFiles, listFolders } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [note, folders, access, files] = await Promise.all([
    getNote(id), listFolders(), getNoteAccess(id), listFiles(),
  ]);
  const error = note.error ?? folders.error ?? access.error ?? files.error;

  if (error) {
    if (error.includes("not found")) notFound();
    return error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />;
  }

  if (!note.data) notFound();
  const folderName = (folders.data ?? []).find((folder) => folder.id === note.data?.folderId)?.name;

  return (
    <NoteEditor
      note={note.data}
      folderName={folderName}
      canEdit={isSupabaseConfigured() && (access.data === "owner" || access.data === "editor")}
      canExport={isSupabaseConfigured()}
      canManageSharing={access.data === "owner"}
      files={(files.data ?? []).map((file) => ({ id: file.id, name: file.name }))}
    />
  );
}
