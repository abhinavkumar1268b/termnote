"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/types";
import { getWorkspaceContext } from "@/lib/data/client";
import { generateInvitationToken, hashInvitationToken, isInvitationExpired } from "@/lib/sharing/token";
import type { Permission } from "@/types/domain";
import { getOptionalClient } from "@/lib/supabase/server";

async function context() {
  const result = await getWorkspaceContext();
  if (!result.data) return null;
  const supabase = await getOptionalClient();
  if (!supabase) return null;
  return { ...result.data, supabase };
}

function fail<T>(code: "INVALID" | "FORBIDDEN" | "NOT_FOUND" | "ERROR", message: string): ActionResult<T> {
  return { ok: false, code, message };
}

export async function inviteCollaboratorAction(input: {
  noteId: string;
  email: string;
  permission: Permission;
  expiresInDays?: number;
}): Promise<ActionResult<{ token: string; shareId: string }>> {
  const parsed = z.object({
    noteId: z.uuid(),
    email: z.email().transform((value) => value.toLowerCase()),
    permission: z.enum(["viewer", "editor"]),
    expiresInDays: z.number().int().min(1).max(365).optional(),
  }).safeParse(input);
  if (!parsed.success) return fail("INVALID", parsed.error.issues[0]?.message ?? "Invalid invitation.");

  const ctx = await context();
  if (!ctx) return fail("FORBIDDEN", "Not authorised.");

  const { data: note } = await ctx.supabase
    .from("notes")
    .select("id")
    .eq("id", parsed.data.noteId)
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!note) return fail("NOT_FOUND", "Note not found in this workspace.");

  const token = generateInvitationToken();
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString()
    : null;

  const { data, error } = await ctx.supabase
    .from("note_shares")
    .upsert({
      note_id: parsed.data.noteId,
      owner_id: ctx.userId,
      collaborator_email: parsed.data.email,
      permission: parsed.data.permission,
      token_hash: hashInvitationToken(token),
      expires_at: expiresAt,
      collaborator_id: null,
    }, { onConflict: "note_id,collaborator_email" })
    .select("id")
    .single();

  if (error) return fail("ERROR", error.message);
  revalidatePath("/shared");
  return { ok: true, data: { token, shareId: data.id } };
}

export async function acceptInvitationAction(input: { token: string }): Promise<ActionResult<{ noteId: string }>> {
  const parsed = z.object({ token: z.string().min(20) }).safeParse(input);
  if (!parsed.success) return fail("INVALID", "Invalid invitation token.");

  const supabase = await getOptionalClient();
  if (!supabase) return fail("FORBIDDEN", "Supabase is not configured.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return fail("FORBIDDEN", "Sign in to accept an invitation.");

  const { data: share, error } = await supabase
    .from("note_shares")
    .select("id,note_id,collaborator_email,expires_at")
    .eq("token_hash", hashInvitationToken(parsed.data.token))
    .maybeSingle();
  if (error || !share) return fail("NOT_FOUND", "Invitation not found or already used.");

  if (share.collaborator_email.toLowerCase() !== auth.user.email.toLowerCase()) {
    return fail("FORBIDDEN", "This invitation was sent to a different email address.");
  }
  if (isInvitationExpired(share.expires_at)) {
    return fail("INVALID", "This invitation has expired.");
  }

  const { error: updateError } = await supabase
    .from("note_shares")
    .update({ collaborator_id: auth.user.id })
    .eq("id", share.id);
  if (updateError) return fail("ERROR", updateError.message);

  revalidatePath("/shared");
  return { ok: true, data: { noteId: share.note_id } };
}

export async function revokeShareAction(input: { shareId: string }): Promise<ActionResult> {
  const parsed = z.object({ shareId: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail("INVALID", "Invalid share id.");
  const ctx = await context();
  if (!ctx) return fail("FORBIDDEN", "Not authorised.");

  const { error } = await ctx.supabase
    .from("note_shares")
    .delete()
    .eq("id", parsed.data.shareId)
    .eq("owner_id", ctx.userId);
  if (error) return fail("ERROR", error.message);
  revalidatePath("/shared");
  return { ok: true, data: null };
}

export async function listCollaboratorsAction(input: { noteId: string }): Promise<ActionResult<Array<{
  id: string;
  email: string;
  permission: Permission;
  expiresAt: string | null;
  accepted: boolean;
}>>> {
  const parsed = z.object({ noteId: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail("INVALID", "Invalid note id.");
  const ctx = await context();
  if (!ctx) return fail("FORBIDDEN", "Not authorised.");

  const { data, error } = await ctx.supabase
    .from("note_shares")
    .select("id,collaborator_email,permission,expires_at,collaborator_id")
    .eq("note_id", parsed.data.noteId)
    .eq("owner_id", ctx.userId);
  if (error) return fail("ERROR", error.message);

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      email: row.collaborator_email,
      permission: row.permission as Permission,
      expiresAt: row.expires_at,
      accepted: Boolean(row.collaborator_id),
    })),
  };
}

export async function attachFileToNoteAction(input: { noteId: string; fileId: string }): Promise<ActionResult> {
  const parsed = z.object({ noteId: z.uuid(), fileId: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail("INVALID", "Invalid attachment.");
  const ctx = await context();
  if (!ctx) return fail("FORBIDDEN", "Not authorised.");

  const { data: permission } = await ctx.supabase.rpc("can_edit_note", { p_note_id: parsed.data.noteId });
  const { data: note } = await ctx.supabase
    .from("notes")
    .select("id")
    .eq("id", parsed.data.noteId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (!note && permission !== true) return fail("FORBIDDEN", "Only the owner or an editor can attach files.");

  const { data: readable } = await ctx.supabase.rpc("can_read_file", { p_file_id: parsed.data.fileId });
  if (readable !== true) return fail("FORBIDDEN", "File is not accessible.");

  const { error } = await ctx.supabase.from("note_attachments").insert({
    note_id: parsed.data.noteId,
    file_id: parsed.data.fileId,
    granted_by: ctx.userId,
  });
  // A duplicate attachment is already correctly authorised.
  if (error && error.code !== "23505") return fail("ERROR", error.message);
  revalidatePath(`/notes/${parsed.data.noteId}`);
  return { ok: true, data: null };
}

export async function listNoteAttachmentsAction(input: { noteId: string }): Promise<ActionResult<Array<{
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}>>> {
  const parsed = z.object({ noteId: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail("INVALID", "Invalid note id.");
  const supabase = await getOptionalClient();
  if (!supabase) return fail("FORBIDDEN", "Not authorised.");

  const { data, error } = await supabase
    .from("note_attachments")
    .select("files(id,name,mime_type,size_bytes)")
    .eq("note_id", parsed.data.noteId);
  if (error) return fail("ERROR", error.message);

  return {
    ok: true,
    data: (data ?? []).flatMap((row) => {
      const file = row.files as unknown as Array<{ id: string; name: string; mime_type: string; size_bytes: number }> | null;
      if (!file || file.length === 0) return [];
      return [{ id: file[0].id, name: file[0].name, mimeType: file[0].mime_type, sizeBytes: Number(file[0].size_bytes) }];
    }),
  };
}

export async function getSharedFileUrlAction(input: { fileId: string }): Promise<ActionResult<{ url: string; name: string }>> {
  const parsed = z.object({ fileId: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail("INVALID", "Invalid file id.");
  const supabase = await getOptionalClient();
  if (!supabase) return fail("FORBIDDEN", "Not authorised.");

  const { data: file } = await supabase.from("files").select("storage_path,name").eq("id", parsed.data.fileId).maybeSingle();
  if (!file) return fail("NOT_FOUND", "File not found or not shared with you.");

  const { data, error } = await supabase.storage.from("note-files").createSignedUrl(file.storage_path, 3600);
  if (error) return fail("ERROR", error.message);
  return { ok: true, data: { url: data.signedUrl, name: file.name } };
}
