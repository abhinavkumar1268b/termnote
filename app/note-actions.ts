"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/lib/data/client";
import { saveNoteSchema, type SaveNoteInput, type SaveResult } from "@/lib/editor/save";
import { getOptionalClient } from "@/lib/supabase/server";

export async function saveNoteAction(input: SaveNoteInput): Promise<SaveResult> {
  const parsed = saveNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.issues[0]?.message ?? "Invalid note data." };
  }

  let content: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(parsed.data.content);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid document");
    content = value as Record<string, unknown>;
  } catch {
    return { ok: false, code: "INVALID", message: "The document is not valid Tiptap JSON." };
  }

  const context = await getWorkspaceContext();
  if (!context.data) {
    return { ok: false, code: "FORBIDDEN", message: context.error ?? "Not authorised to edit this note." };
  }

  const supabase = await getOptionalClient();
  if (!supabase) {
    return { ok: false, code: "ERROR", message: "Supabase is not configured." };
  }

  // Ownership is verified on the server, independently of client state.
  const { data: current, error: readError } = await supabase
    .from("notes")
    .select("updated_at")
    .eq("id", parsed.data.noteId)
    .eq("workspace_id", context.data.workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (readError) return { ok: false, code: "ERROR", message: readError.message };
  if (!current) return { ok: false, code: "FORBIDDEN", message: "Note not found in this workspace." };

  // Optimistic concurrency: never overwrite content saved after this editor loaded.
  if (current.updated_at !== parsed.data.expectedUpdatedAt) {
    return { ok: false, code: "CONFLICT", message: "This note was updated elsewhere. Reload before saving." };
  }

  const { data: saved, error } = await supabase
    .from("notes")
    .update({
      title: parsed.data.title,
      content,
      markdown: parsed.data.markdown,
      word_count: parsed.data.markdown.split(/\s+/).filter(Boolean).length,
    })
    .eq("id", parsed.data.noteId)
    .eq("workspace_id", context.data.workspaceId)
    .eq("updated_at", parsed.data.expectedUpdatedAt)
    .select("updated_at")
    .single();

  if (error) return { ok: false, code: "ERROR", message: error.message };

  revalidatePath(`/notes/${parsed.data.noteId}`);
  revalidatePath("/notes");
  revalidatePath("/");

  return { ok: true, savedAt: saved.updated_at };
}
