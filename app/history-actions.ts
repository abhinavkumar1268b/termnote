"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/types";
import { getNoteAccess } from "@/lib/data/queries";
import { getOptionalClient } from "@/lib/supabase/server";

export async function restoreNoteVersionAction(input: {
  noteId: string;
  versionId: string;
}): Promise<ActionResult<{ versionId: string }>> {
  const parsed = z.object({ noteId: z.uuid(), versionId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID", message: "Invalid restore request." };

  const access = await getNoteAccess(parsed.data.noteId);
  if (!access.data || access.data === "viewer" || access.data === "none") {
    return { ok: false, code: "FORBIDDEN", message: "Only the owner or an editor can restore a version." };
  }

  const supabase = await getOptionalClient();
  if (!supabase) return { ok: false, code: "FORBIDDEN", message: "Supabase is not configured." };

  // RLS restricts this to notes the caller may read.
  const { data: version, error: versionError } = await supabase
    .from("note_versions")
    .select("id,note_id,content,markdown,title")
    .eq("id", parsed.data.versionId)
    .eq("note_id", parsed.data.noteId)
    .maybeSingle();
  if (versionError) return { ok: false, code: "ERROR", message: versionError.message };
  if (!version) return { ok: false, code: "NOT_FOUND", message: "Version not found." };

  // Updating the note makes the trigger snapshot the current state as a new
  // historical version. The historical row being restored is never modified.
  const { error: updateError } = await supabase
    .from("notes")
    .update({
      title: version.title || "Untitled note",
      content: version.content,
      markdown: version.markdown,
      word_count: version.markdown.split(/\s+/).filter(Boolean).length,
    })
    .eq("id", parsed.data.noteId)
    .is("deleted_at", null);
  if (updateError) return { ok: false, code: "ERROR", message: updateError.message };

  // Record the restored state explicitly as a new, immutable snapshot.
  const { data: saved, error: snapshotError } = await supabase
    .from("note_versions")
    .insert({
      note_id: parsed.data.noteId,
      content: version.content,
      markdown: version.markdown,
      title: version.title || "Untitled note",
    })
    .select("id")
    .single();
  if (snapshotError) return { ok: false, code: "ERROR", message: snapshotError.message };

  revalidatePath(`/notes/${parsed.data.noteId}`);
  revalidatePath(`/notes/${parsed.data.noteId}/history`);
  return { ok: true, data: { versionId: saved.id } };
}
