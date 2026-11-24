import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOptionalClient } from "@/lib/supabase/server";
import type { Folder, Note, NoteVersion, SharedNote, StoredFile, TrashItem } from "@/types/domain";
import { NOT_AUTHENTICATED, NOT_CONFIGURED, getWorkspaceContext, type DataResult } from "./client";

type Client = NonNullable<Awaited<ReturnType<typeof getOptionalClient>>>;

interface NoteRow {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  title: string;
  content: Record<string, unknown>;
  markdown: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface FolderRow {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface FileRow {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  kind: StoredFile["kind"];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface VersionRow {
  id: string;
  note_id: string;
  author_id: string | null;
  title: string;
  content: Record<string, unknown>;
  markdown: string;
  created_at: string;
}

interface ShareRow {
  id: string;
  note_id: string;
  owner_id: string;
  collaborator_email: string;
  collaborator_id: string | null;
  permission: "viewer" | "editor";
  created_at: string;
  expires_at: string | null;
}

interface StarRow {
  id: string;
  target_type: "note" | "file";
  target_id: string;
}

async function db(): Promise<Client | null> {
  if (!isSupabaseConfigured()) return null;
  return getOptionalClient();
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    folderId: row.folder_id,
    title: row.title,
    excerpt: row.markdown.replace(/[#*`>\n]/g, " ").trim().slice(0, 140) || "No preview available.",
    content: row.content,
    markdown: row.markdown,
    tags: [],
    starred: false,
    wordCount: row.word_count,
    updatedLabel: new Date(row.updated_at).toISOString().slice(0, 10),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentId: row.parent_id,
    name: row.name,
    noteCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapFile(row: FileRow): StoredFile {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    folderId: row.folder_id,
    name: row.name,
    kind: row.kind,
    mimeType: row.mime_type,
    extension: row.name.split(".").pop()?.toUpperCase() ?? "FILE",
    sizeBytes: Number(row.size_bytes),
    starred: false,
    updatedLabel: new Date(row.updated_at).toISOString().slice(0, 10),
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listNotes(options?: { limit?: number; folderId?: string | null }): Promise<DataResult<Note[]>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  let query = supabase
    .from("notes")
    .select("*")
    .eq("workspace_id", context.data.workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (options?.folderId) query = query.eq("folder_id", options.folderId);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data as NoteRow[]).map(mapNote), error: null };
}

export async function getNote(id: string): Promise<DataResult<Note>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  // RLS decides whether this is an owned or explicitly shared note.
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Note not found in this workspace." };
  return { data: mapNote(data as NoteRow), error: null };
}

export async function listVersions(noteId: string): Promise<DataResult<NoteVersion[]>> {
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };

  const { data: note } = await supabase
    .from("notes")
    .select("id")
    .eq("id", noteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!note) return { data: null, error: "Note not found or access denied." };

  const { data, error } = await supabase
    .from("note_versions")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.message };

  const rows = data as VersionRow[];
  const authorIds = [...new Set(rows.map((row) => row.author_id).filter((id): id is string => Boolean(id)))];
  const profiles = authorIds.length > 0
    ? await supabase.from("profiles").select("id,display_name,email").in("id", authorIds)
    : { data: [], error: null };
  const authorNames = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile.display_name || profile.email || "Unknown"]),
  );
  const total = rows.length;

  return {
    data: rows.map((row, index) => ({
      id: row.id,
      noteId: row.note_id,
      label: `Version ${total - index}`,
      author: row.author_id ? (authorNames.get(row.author_id) ?? "Unknown") : "System snapshot",
      summary: row.markdown.slice(0, 80) || "Content snapshot",
      title: row.title,
      content: row.content,
      markdown: row.markdown,
      createdLabel: row.created_at.slice(0, 16).replace("T", " "),
      createdAt: row.created_at,
    })),
    error: null,
  };
}

export async function listFolders(): Promise<DataResult<Folder[]>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("workspace_id", context.data.workspaceId)
    .is("deleted_at", null)
    .order("name");
  if (error) return { data: null, error: error.message };
  return { data: (data as FolderRow[]).map(mapFolder), error: null };
}

export async function listFiles(): Promise<DataResult<StoredFile[]>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("workspace_id", context.data.workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data as FileRow[]).map(mapFile), error: null };
}

export async function getDownloadUrl(path: string): Promise<DataResult<string>> {
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.storage.from("note-files").createSignedUrl(path, 3600);
  if (error) return { data: null, error: error.message };
  return { data: data.signedUrl, error: null };
}

export async function listStarred(): Promise<DataResult<{ notes: Note[]; files: StoredFile[] }>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data: stars, error } = await supabase
    .from("starred_items")
    .select("target_type,target_id")
    .eq("workspace_id", context.data.workspaceId)
    .eq("user_id", context.data.userId);
  if (error) return { data: null, error: error.message };

  const rows = (stars ?? []) as StarRow[];
  const noteIds = rows.filter((row) => row.target_type === "note").map((row) => row.target_id);
  const fileIds = rows.filter((row) => row.target_type === "file").map((row) => row.target_id);

  const [notesResult, filesResult] = await Promise.all([
    noteIds.length > 0
      ? supabase.from("notes").select("*").eq("workspace_id", context.data.workspaceId).in("id", noteIds).is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    fileIds.length > 0
      ? supabase.from("files").select("*").eq("workspace_id", context.data.workspaceId).in("id", fileIds).is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (notesResult.error || filesResult.error) {
    return { data: null, error: notesResult.error?.message ?? filesResult.error?.message ?? "Failed to load stars." };
  }

  return {
    data: {
      notes: (notesResult.data as NoteRow[]).map((row) => ({ ...mapNote(row), starred: true })),
      files: (filesResult.data as FileRow[]).map((row) => ({ ...mapFile(row), starred: true })),
    },
    error: null,
  };
}

export async function listShares(): Promise<DataResult<SharedNote[]>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from("note_shares")
    .select("*")
    .eq("owner_id", context.data.userId)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.message };

  const rows = data as ShareRow[];
  const noteIds = [...new Set(rows.map((row) => row.note_id))];
  const notes = noteIds.length > 0
    ? await supabase.from("notes").select("id,title").eq("workspace_id", context.data.workspaceId).in("id", noteIds)
    : { data: [], error: null };
  if (notes.error) return { data: null, error: notes.error.message };

  const titles = new Map((notes.data as Array<{ id: string; title: string }>).map((row) => [row.id, row.title]));

  return {
    data: rows.map((row) => ({
      id: row.id,
      noteId: row.note_id,
      title: titles.get(row.note_id) ?? "Shared note",
      collaborator: row.collaborator_email.split("@")[0] ?? row.collaborator_email,
      email: row.collaborator_email,
      permission: row.permission,
      sharedLabel: row.created_at.slice(0, 10),
      sharedAt: row.created_at,
      expiresAt: row.expires_at,
      collaboratorId: row.collaborator_id,
      accepted: Boolean(row.collaborator_id),
    })),
    error: null,
  };
}

export async function listTrash(): Promise<DataResult<TrashItem[]>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const workspaceId = context.data.workspaceId;
  const [notes, folders, files] = await Promise.all([
    supabase.from("notes").select("id,title,deleted_at").eq("workspace_id", workspaceId).not("deleted_at", "is", null),
    supabase.from("folders").select("id,name,deleted_at").eq("workspace_id", workspaceId).not("deleted_at", "is", null),
    supabase.from("files").select("id,name,deleted_at").eq("workspace_id", workspaceId).not("deleted_at", "is", null),
  ]);

  const error = notes.error ?? folders.error ?? files.error;
  if (error) return { data: null, error: error.message };

  const items: TrashItem[] = [
    ...(notes.data ?? []).map((row) => ({
      id: row.id as string,
      kind: "note" as const,
      name: row.title as string,
      detail: "Note · soft-deleted",
      deletedLabel: (row.deleted_at as string).slice(0, 10),
      deletedAt: row.deleted_at as string,
    })),
    ...(folders.data ?? []).map((row) => ({
      id: row.id as string,
      kind: "folder" as const,
      name: row.name as string,
      detail: "Folder · soft-deleted",
      deletedLabel: (row.deleted_at as string).slice(0, 10),
      deletedAt: row.deleted_at as string,
    })),
    ...(files.data ?? []).map((row) => ({
      id: row.id as string,
      kind: "file" as const,
      name: row.name as string,
      detail: "File · soft-deleted",
      deletedLabel: (row.deleted_at as string).slice(0, 10),
      deletedAt: row.deleted_at as string,
    })),
  ];

  return { data: items, error: null };
}

export async function listSharedWithMe(): Promise<DataResult<SharedNote[]>> {
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: NOT_AUTHENTICATED };

  const { data, error } = await supabase
    .from("note_shares")
    .select("*")
    .ilike("collaborator_email", auth.user.email ?? "")
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.message };

  const rows = data as ShareRow[];
  const noteIds = [...new Set(rows.map((row) => row.note_id))];
  const notes = noteIds.length > 0
    ? await supabase.from("notes").select("id,title").in("id", noteIds).is("deleted_at", null)
    : { data: [], error: null };
  if (notes.error) return { data: null, error: notes.error.message };

  const titles = new Map((notes.data as Array<{ id: string; title: string }>).map((row) => [row.id, row.title]));
  return {
    data: rows
      .filter((row) => titles.has(row.note_id))
      .map((row) => ({
        id: row.id,
        noteId: row.note_id,
        title: titles.get(row.note_id) ?? "Shared note",
        collaborator: row.collaborator_email.split("@")[0] ?? row.collaborator_email,
        email: row.collaborator_email,
        permission: row.permission,
        sharedLabel: row.created_at.slice(0, 10),
        sharedAt: row.created_at,
        expiresAt: row.expires_at,
        collaboratorId: row.collaborator_id,
        accepted: Boolean(row.collaborator_id),
      })),
    error: null,
  };
}

export async function getNoteAccess(
  noteId: string,
): Promise<DataResult<"owner" | "editor" | "viewer" | "none">> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", context.data.workspaceId)
    .maybeSingle();
  if (workspaceError) return { data: null, error: workspaceError.message };
  if (workspace?.owner_id === context.data.userId) return { data: "owner", error: null };

  const { data: authUser } = await supabase.auth.getUser();
  const email = authUser.user?.email ?? "";
  const { data: share, error } = await supabase
    .from("note_shares")
    .select("permission")
    .eq("note_id", noteId)
    .ilike("collaborator_email", email)
    .maybeSingle();
  if (error) return { data: null, error: error.message };

  return { data: share?.permission === "editor" ? "editor" : share ? "viewer" : "none", error: null };
}

export async function getWorkspaceSummary(): Promise<DataResult<{
  notes: number;
  folders: number;
  files: number;
  starred: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
}>> {
  const context = await getWorkspaceContext();
  if (!context.data) return { data: null, error: context.error };
  const supabase = await db();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const workspaceId = context.data.workspaceId;
  const [notes, folders, files, starred] = await Promise.all([
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("deleted_at", null),
    supabase.from("folders").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("deleted_at", null),
    supabase.from("files").select("size_bytes").eq("workspace_id", workspaceId).is("deleted_at", null),
    supabase.from("starred_items").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const error = notes.error ?? folders.error ?? files.error ?? starred.error;
  if (error) return { data: null, error: error.message };

  return {
    data: {
      notes: notes.count ?? 0,
      folders: folders.count ?? 0,
      files: files.data?.length ?? 0,
      starred: starred.count ?? 0,
      storageUsedBytes: (files.data ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0),
      storageLimitBytes: 5_000_000_000,
    },
    error: null,
  };
}
