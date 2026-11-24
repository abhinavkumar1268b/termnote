"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/data/client";
import { folderDescendants, wouldCreateCycle } from "@/lib/folders/tree";
import type { ActionResult, ItemCounts } from "@/lib/actions/types";
import { fileKindForMime, getMaxUploadBytes, isSafeStoragePath, normalizeFileName } from "@/lib/uploads/config";
import { getOptionalClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const nameSchema = z.string().trim().min(1).max(120);
const parentSchema = z.union([z.uuid(), z.literal("root")]).nullable();

async function context() {
  const result = await getWorkspaceContext();
  if (!result.data) return null;
  const supabase = await getOptionalClient();
  if (!supabase) return null;
  return { ...result.data, supabase };
}

function invalid<T>(message: string): ActionResult<T> {
  return { ok: false, code: "INVALID", message };
}

function fromError<T>(error: { message: string }): ActionResult<T> {
  return { ok: false, code: "ERROR", message: error.message };
}

function refresh() {
  revalidatePath("/notes");
  revalidatePath("/folders");
  revalidatePath("/files");
  revalidatePath("/starred");
  revalidatePath("/trash");
  revalidatePath("/");
}

async function allFolders(supabase: NonNullable<Awaited<ReturnType<typeof getOptionalClient>>>, workspaceId: string) {
  const { data, error } = await supabase
    .from("folders")
    .select("id,parent_id,name")
    .eq("workspace_id", workspaceId);
  return error
    ? []
    : (data ?? []).map((row) => ({ id: row.id, parentId: row.parent_id, name: row.name }));
}

async function duplicateFolder(supabase: NonNullable<Awaited<ReturnType<typeof getOptionalClient>>>, workspaceId: string, parentId: string | null, name: string, excludeId?: string) {
  let query = supabase.from("folders").select("id").eq("workspace_id", workspaceId).ilike("name", name).is("deleted_at", null);
  if (parentId) query = query.eq("parent_id", parentId);
  else query = query.is("parent_id", null);
  const { data } = await query;
  return (data ?? []).some((row) => row.id !== excludeId);
}

export async function createFolderAction(input: { name: string; parentId?: string | null }): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ name: nameSchema, parentId: parentSchema.optional() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Invalid folder name.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const parentId = parsed.data.parentId === "root" ? null : (parsed.data.parentId ?? null);
  if (parentId) {
    const { data: parent } = await ctx.supabase.from("folders").select("id").eq("id", parentId).eq("workspace_id", ctx.workspaceId).is("deleted_at", null).maybeSingle();
    if (!parent) return { ok: false, code: "NOT_FOUND", message: "Parent folder not found." };
  }
  if (await duplicateFolder(ctx.supabase, ctx.workspaceId, parentId, parsed.data.name)) {
    return { ok: false, code: "DUPLICATE", message: "A folder with that name already exists here." };
  }

  const { data, error } = await ctx.supabase
    .from("folders")
    .insert({ workspace_id: ctx.workspaceId, parent_id: parentId, name: parsed.data.name })
    .select("id")
    .single();
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function renameFolderAction(input: { id: string; name: string }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema, name: nameSchema }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Invalid folder.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const { data: folder } = await ctx.supabase.from("folders").select("parent_id").eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (!folder) return { ok: false, code: "NOT_FOUND", message: "Folder not found." };
  if (await duplicateFolder(ctx.supabase, ctx.workspaceId, folder.parent_id, parsed.data.name, parsed.data.id)) {
    return { ok: false, code: "DUPLICATE", message: "A folder with that name already exists here." };
  }

  const { error } = await ctx.supabase.from("folders").update({ name: parsed.data.name }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function moveFolderAction(input: { id: string; parentId: string | null }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema, parentId: parentSchema }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Invalid move.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const parentId = parsed.data.parentId === "root" ? null : parsed.data.parentId;
  const folders = await allFolders(ctx.supabase, ctx.workspaceId);
  if (!folders.some((folder) => folder.id === parsed.data.id)) return { ok: false, code: "NOT_FOUND", message: "Folder not found." };
  if (wouldCreateCycle(folders, parsed.data.id, parentId)) return invalid("Cannot move a folder inside itself or its own descendant.");
  if (parentId && !folders.some((folder) => folder.id === parentId)) return { ok: false, code: "NOT_FOUND", message: "Destination folder not found." };

  const { error } = await ctx.supabase.from("folders").update({ parent_id: parentId }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

async function folderCounts(ctx: { supabase: NonNullable<Awaited<ReturnType<typeof getOptionalClient>>>; workspaceId: string }, folderIds: string[]): Promise<ItemCounts> {
  if (folderIds.length === 0) return { notes: 0, folders: 0, files: 0 };
  const [notes, folders, files] = await Promise.all([
    ctx.supabase.from("notes").select("id", { count: "exact", head: true }).in("folder_id", folderIds).is("deleted_at", null),
    ctx.supabase.from("folders").select("id", { count: "exact", head: true }).in("parent_id", folderIds).is("deleted_at", null),
    ctx.supabase.from("files").select("id", { count: "exact", head: true }).in("folder_id", folderIds).is("deleted_at", null),
  ]);
  return { notes: notes.count ?? 0, folders: folders.count ?? 0, files: files.count ?? 0 };
}

export async function deleteFolderAction(input: { id: string; includeContents?: boolean }): Promise<ActionResult<ItemCounts>> {
  const parsed = z.object({ id: idSchema, includeContents: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Invalid folder.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const folders = await allFolders(ctx.supabase, ctx.workspaceId);
  if (!folders.some((folder) => folder.id === parsed.data.id)) return { ok: false, code: "NOT_FOUND", message: "Folder not found." };
  const ids = [parsed.data.id, ...folderDescendants(folders, parsed.data.id)];
  const counts = await folderCounts(ctx, ids);
  const total = counts.notes + counts.folders + counts.files;

  if (total > 0 && !parsed.data.includeContents) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "This folder still contains items.",
      details: [`${counts.notes} notes, ${counts.folders} folders, ${counts.files} files`, "Pass includeContents to move all of them to trash."],
    };
  }

  const now = new Date().toISOString();
  await ctx.supabase.from("notes").update({ deleted_at: now }).in("folder_id", ids).is("deleted_at", null);
  await ctx.supabase.from("files").update({ deleted_at: now }).in("folder_id", ids).is("deleted_at", null);
  const { error } = await ctx.supabase.from("folders").update({ deleted_at: now }).in("id", ids).is("deleted_at", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: counts };
}

export async function restoreFolderAction(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return invalid("Invalid folder id.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const { data: folder } = await ctx.supabase.from("folders").select("parent_id").eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (!folder) return { ok: false, code: "NOT_FOUND", message: "Folder not found." };

  let parentId = folder.parent_id;
  if (parentId) {
    const { data: parent } = await ctx.supabase.from("folders").select("id").eq("id", parentId).is("deleted_at", null).maybeSingle();
    if (!parent) parentId = null;
  }

  const { error } = await ctx.supabase.from("folders").update({ deleted_at: null, parent_id: parentId }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function createNoteAction(input: { title: string; folderId?: string | null }): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ title: z.string().trim().min(1).max(200), folderId: parentSchema.optional() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Invalid note title.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const folderId = parsed.data.folderId === "root" ? null : (parsed.data.folderId ?? null);
  const { data, error } = await ctx.supabase
    .from("notes")
    .insert({
      workspace_id: ctx.workspaceId,
      folder_id: folderId,
      title: parsed.data.title,
      content: { type: "doc", content: [{ type: "paragraph" }] },
      markdown: "",
      word_count: 0,
    })
    .select("id")
    .single();
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function renameNoteAction(input: { id: string; title: string }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema, title: z.string().trim().min(1).max(200) }).safeParse(input);
  if (!parsed.success) return invalid("Invalid note title.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };
  const { error } = await ctx.supabase.from("notes").update({ title: parsed.data.title }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).is("deleted_at", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function moveNoteAction(input: { id: string; folderId: string | null }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema, folderId: parentSchema }).safeParse(input);
  if (!parsed.success) return invalid("Invalid destination.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };
  const folderId = parsed.data.folderId === "root" ? null : parsed.data.folderId;
  const { error } = await ctx.supabase.from("notes").update({ folder_id: folderId }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).is("deleted_at", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function deleteNoteAction(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return invalid("Invalid note id.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };
  const { error } = await ctx.supabase.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).is("deleted_at", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function restoreNoteAction(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return invalid("Invalid note id.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };
  const { error } = await ctx.supabase.from("notes").update({ deleted_at: null }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function setStarAction(input: { type: "note" | "file"; id: string; starred: boolean }): Promise<ActionResult> {
  const parsed = z.object({ type: z.enum(["note", "file"]), id: idSchema, starred: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid("Invalid star request.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  if (parsed.data.starred) {
    const { error } = await ctx.supabase.from("starred_items").upsert({
      user_id: ctx.userId,
      workspace_id: ctx.workspaceId,
      target_type: parsed.data.type,
      target_id: parsed.data.id,
    });
    if (error) return fromError(error);
  } else {
    const { error } = await ctx.supabase.from("starred_items").delete().eq("user_id", ctx.userId).eq("target_type", parsed.data.type).eq("target_id", parsed.data.id);
    if (error) return fromError(error);
  }
  refresh();
  return { ok: true, data: null };
}

export async function searchNotesAction(input: { term: string; limit?: number }): Promise<ActionResult<Array<{ id: string; title: string }>>> {
  const parsed = z.object({ term: z.string().trim().min(1).max(120), limit: z.number().int().min(1).max(50).optional() }).safeParse(input);
  if (!parsed.success) return invalid("Invalid search term.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };
  const { data, error } = await ctx.supabase
    .from("notes")
    .select("id,title")
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .ilike("title", `%${parsed.data.term}%`)
    .limit(parsed.data.limit ?? 20);
  if (error) return fromError(error);
  return { ok: true, data: (data ?? []).map((row) => ({ id: row.id, title: row.title })) };
}

export async function uploadFileAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const file = formData.get("file");
  if (!(file instanceof File)) return invalid("No file provided.");
  const rawName = String(formData.get("name") ?? file.name);
  const name = normalizeFileName(rawName);
  const folderRaw = String(formData.get("folderId") ?? "");
  const folderId = folderRaw && folderRaw !== "root" && idSchema.safeParse(folderRaw).success ? folderRaw : null;

  if (file.size === 0) return invalid("File is empty.");
  if (file.size > getMaxUploadBytes()) return { ok: false, code: "INVALID", message: `File exceeds the ${Math.round(getMaxUploadBytes() / 1024 / 1024)} MB limit.` };
  const kind = fileKindForMime(file.type);
  if (!kind) return { ok: false, code: "INVALID", message: `Unsupported MIME type: ${file.type || "unknown"}.` };

  const id = crypto.randomUUID();
  const storagePath = `${ctx.userId}/${ctx.workspaceId}/${id}-${name}`;
  if (!isSafeStoragePath(storagePath, ctx.userId, ctx.workspaceId)) return invalid("Unsafe file path.");

  const { error: uploadError } = await ctx.supabase.storage.from("note-files").upload(storagePath, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { ok: false, code: "STORAGE", message: uploadError.message };

  const { data, error } = await ctx.supabase.from("files").insert({
    workspace_id: ctx.workspaceId,
    folder_id: folderId,
    name,
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    kind,
  }).select("id").single();
  if (error) {
    await ctx.supabase.storage.from("note-files").remove([storagePath]);
    return fromError(error);
  }
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function getFileUrlAction(input: { id: string; download?: boolean }): Promise<ActionResult<{ url: string; mimeType: string; name: string }>> {
  const parsed = z.object({ id: idSchema, download: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return invalid("Invalid file id.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const { data: file } = await ctx.supabase.from("files").select("storage_path,mime_type,name").eq("id", parsed.data.id).is("deleted_at", null).maybeSingle();
  if (!file) return { ok: false, code: "NOT_FOUND", message: "File not found." };
  const { data: readable } = await ctx.supabase.rpc("can_read_file", { p_file_id: parsed.data.id });
  if (readable !== true) return { ok: false, code: "FORBIDDEN", message: "File is not shared with you." };
  if (!isSafeStoragePath(file.storage_path, ctx.userId, ctx.workspaceId)) return invalid("Unsafe stored path.");

  const { data, error } = await ctx.supabase.storage.from("note-files").createSignedUrl(file.storage_path, 3600, parsed.data.download ? { download: file.name } : undefined);
  if (error) return { ok: false, code: "STORAGE", message: error.message };
  return { ok: true, data: { url: data.signedUrl, mimeType: file.mime_type, name: file.name } };
}

export async function deleteFileAction(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return invalid("Invalid file id.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };
  const { error } = await ctx.supabase.from("files").update({ deleted_at: new Date().toISOString() }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).is("deleted_at", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function restoreFileAction(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return invalid("Invalid file id.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };
  const { error } = await ctx.supabase.from("files").update({ deleted_at: null }).eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function purgeItemAction(input: { kind: "note" | "folder" | "file"; id: string; confirmed: boolean; includeContents?: boolean }): Promise<ActionResult> {
  const parsed = z.object({
    kind: z.enum(["note", "folder", "file"]),
    id: idSchema,
    confirmed: z.literal(true),
    includeContents: z.boolean().optional(),
  }).safeParse(input);
  if (!parsed.success) return invalid("Permanent deletion requires explicit confirmation.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  if (parsed.data.kind === "file") {
    const { data: file } = await ctx.supabase.from("files").select("storage_path").eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId).maybeSingle();
    if (!file) return { ok: false, code: "NOT_FOUND", message: "File not found." };
    if (!isSafeStoragePath(file.storage_path, ctx.userId, ctx.workspaceId)) return invalid("Unsafe stored path.");
    const { error: storageError } = await ctx.supabase.storage.from("note-files").remove([file.storage_path]);
    if (storageError) return { ok: false, code: "STORAGE", message: storageError.message };
    const { error } = await ctx.supabase.from("files").delete().eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId);
    if (error) return fromError(error);
    refresh();
    return { ok: true, data: null };
  }

  if (parsed.data.kind === "folder") {
    const folders = await allFolders(ctx.supabase, ctx.workspaceId);
    const ids = [parsed.data.id, ...folderDescendants(folders, parsed.data.id)];
    const counts = await folderCounts(ctx, ids);
    if (counts.notes + counts.folders + counts.files > 0 && !parsed.data.includeContents) {
      return { ok: false, code: "CONFLICT", message: "Folder still contains items.", details: ["Pass includeContents to delete them too."] };
    }
    await ctx.supabase.from("notes").delete().in("folder_id", ids);
    await ctx.supabase.from("files").delete().in("folder_id", ids);
    for (const id of [...ids].reverse()) {
      await ctx.supabase.from("folders").delete().eq("id", id);
    }
    refresh();
    return { ok: true, data: null };
  }

  const { error } = await ctx.supabase.from("notes").delete().eq("id", parsed.data.id).eq("workspace_id", ctx.workspaceId);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: null };
}

export async function emptyTrashAction(input: { confirmed: boolean }): Promise<ActionResult<ItemCounts>> {
  const parsed = z.object({ confirmed: z.literal(true) }).safeParse(input);
  if (!parsed.success) return invalid("Emptying trash requires confirmation.");
  const ctx = await context();
  if (!ctx) return { ok: false, code: "FORBIDDEN", message: "Not authorised." };

  const [notes, folders, files] = await Promise.all([
    ctx.supabase.from("notes").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null),
    ctx.supabase.from("folders").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null),
    ctx.supabase.from("files").select("id,storage_path").eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null),
  ]);
  const paths = (files.data ?? []).map((row) => row.storage_path).filter((path) => isSafeStoragePath(path, ctx.userId, ctx.workspaceId));
  if (paths.length > 0) await ctx.supabase.storage.from("note-files").remove(paths);
  await ctx.supabase.from("notes").delete().eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null);
  await ctx.supabase.from("folders").delete().eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null);
  const { error } = await ctx.supabase.from("files").delete().eq("workspace_id", ctx.workspaceId).not("deleted_at", "is", null);
  if (error) return fromError(error);
  refresh();
  return { ok: true, data: { notes: notes.count ?? 0, folders: folders.count ?? 0, files: files.data?.length ?? 0 } };
}
