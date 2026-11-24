import {
  createFolderAction,
  createNoteAction,
  deleteFileAction,
  deleteFolderAction,
  deleteNoteAction,
  emptyTrashAction,
  getFileUrlAction,
  moveFolderAction,
  moveNoteAction,
  purgeItemAction,
  renameFolderAction,
  renameNoteAction,
  restoreFileAction,
  restoreFolderAction,
  restoreNoteAction,
  searchNotesAction,
  setStarAction,
} from "@/app/library-actions";
import {
  acceptInvitationAction,
  attachFileToNoteAction,
  inviteCollaboratorAction,
  revokeShareAction,
} from "@/app/sharing-actions";
import { restoreNoteVersionAction } from "@/app/history-actions";
import {
  getNote,
  listFiles,
  listFolders,
  listNotes,
  listShares,
  listStarred,
  listTrash,
  listVersions,
  getWorkspaceSummary,
} from "@/lib/data/queries";
import type { CommandServices, ServiceFile, ServiceNote } from "./services";

/**
 * Server-side adapter for the command engine. Every read is RLS-scoped and
 * additionally filtered by the authenticated user's workspace id.
 */
export const realCommandServices: CommandServices = {
  workspace: {
    async summary() {
      const result = await getWorkspaceSummary();
      if (!result.data) return { name: "Workspace", user: "User", notes: 0, folders: 0, files: 0, starred: 0, storage: { storageUsedBytes: 0, storageLimitBytes: 0 } };
      return {
        name: "Private Workspace",
        user: "Authenticated user",
        notes: result.data.notes,
        folders: result.data.folders,
        files: result.data.files,
        starred: result.data.starred,
        storage: { storageUsedBytes: result.data.storageUsedBytes, storageLimitBytes: result.data.storageLimitBytes },
      };
    },
  },
  notes: {
    async list(folder, limit = 10) {
      const [notes, folders] = await Promise.all([listNotes({ limit }), listFolders()]);
      const names = Object.fromEntries((folders.data ?? []).map((item) => [item.id, item.name]));
      return (notes.data ?? [])
        .filter((note) => !folder || (note.folderId ? names[note.folderId] : "Unfiled") === folder)
        .map((note): ServiceNote => ({ ...note, folderName: note.folderId ? (names[note.folderId] ?? "Unfiled") : "Unfiled" }));
    },
    async find(term, limit = 10) {
      const results = await this.list(undefined, 50);
      const needle = term.toLowerCase();
      return results
        .filter((note) => `${note.title} ${note.excerpt}`.toLowerCase().includes(needle))
        .slice(0, limit);
    },
    async get(id) {
      let note = await getNote(id);
      if (!note.data) {
        // Human-readable titles are used by the natural command aliases.
        const listed = await listNotes();
        const needle = id.toLowerCase();
        const match = (listed.data ?? []).find(
          (item) => item.title.toLowerCase() === needle || item.title.toLowerCase().startsWith(needle),
        );
        if (match) note = { data: match, error: null };
      }
      if (!note.data) return null;
      const folders = await listFolders();
      const folderName = (folders.data ?? []).find((folder) => folder.id === note.data?.folderId)?.name ?? "Unfiled";
      return { ...note.data, folderName };
    },
    async star(id) {
      return this.get(id);
    },
    async versions(id) {
      const result = await listVersions(id);
      return result.data ?? [];
    },
  },
  folders: {
    async list() {
      const [folders, notes] = await Promise.all([listFolders(), listNotes()]);
      return (folders.data ?? []).map((folder) => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        noteCount: (notes.data ?? []).filter((note) => note.folderId === folder.id).length,
      }));
    },
    async get(name) {
      const folders = await this.list();
      return folders.find((folder) => folder.name.toLowerCase() === name.toLowerCase()) ?? null;
    },
  },
  files: {
    async list(kind) {
      const [files, folders] = await Promise.all([listFiles(), listFolders()]);
      const names = Object.fromEntries((folders.data ?? []).map((item) => [item.id, item.name]));
      return (files.data ?? [])
        .filter((file) => !kind || file.kind === kind)
        .map((file): ServiceFile => ({ ...file, folderName: file.folderId ? (names[file.folderId] ?? "Unfiled") : "Unfiled" }));
    },
    async get(name) {
      const files = await this.list();
      return files.find((file) => file.name.toLowerCase() === name.toLowerCase()) ?? null;
    },
  },
  starred: {
    async list() {
      const [starred, folders] = await Promise.all([listStarred(), listFolders()]);
      const names = Object.fromEntries((folders.data ?? []).map((item) => [item.id, item.name]));
      return {
        notes: (starred.data?.notes ?? []).map((note): ServiceNote => ({ ...note, folderName: note.folderId ? (names[note.folderId] ?? "Unfiled") : "Unfiled" })),
        files: (starred.data?.files ?? []).map((file): ServiceFile => ({ ...file, folderName: file.folderId ? (names[file.folderId] ?? "Unfiled") : "Unfiled" })),
      };
    },
  },
  trash: {
    async list() {
      const result = await listTrash();
      return result.data ?? [];
    },
    async get(id) {
      const items = await this.list();
      return items.find((item) => item.id === id || item.name.toLowerCase() === id.toLowerCase()) ?? null;
    },
  },
  sharing: {
    async list(role) {
      const result = await listShares();
      return (result.data ?? []).filter((share) => !role || share.permission === role);
    },
    async get(noteId) {
      const shares = await this.list();
      return shares.filter((share) => share.noteId === noteId);
    },
  },
  editor: {
    async open(id) {
      return realCommandServices.notes.get(id);
    },
  },
  mutations: {
    createFolder: (name, parentId) => createFolderAction({ name, parentId: parentId ?? null }),
    renameFolder: (id, name) => renameFolderAction({ id, name }),
    moveFolder: (id, parentId) => moveFolderAction({ id, parentId }),
    deleteFolder: (id, includeContents) => deleteFolderAction({ id, includeContents }),
    restoreFolder: (id) => restoreFolderAction({ id }),
    createNote: (title, folderId) => createNoteAction({ title, folderId: folderId ?? null }),
    renameNote: (id, title) => renameNoteAction({ id, title }),
    moveNote: (id, folderId) => moveNoteAction({ id, folderId }),
    deleteNote: (id) => deleteNoteAction({ id }),
    restoreNote: (id) => restoreNoteAction({ id }),
    searchNotes: (term, limit) => searchNotesAction({ term, limit }),
    setStar: (type, id, starred) => setStarAction({ type, id, starred }),
    deleteFile: (id) => deleteFileAction({ id }),
    restoreFile: (id) => restoreFileAction({ id }),
    getFileUrl: (id, download) => getFileUrlAction({ id, download }),
    purge: (kind, id, confirmed, includeContents) => purgeItemAction({ kind, id, confirmed, includeContents }),
    emptyTrash: (confirmed) => emptyTrashAction({ confirmed }),
    invite: (noteId, email, permission, expiresInDays) => inviteCollaboratorAction({ noteId, email, permission, expiresInDays }),
    revoke: (shareId) => revokeShareAction({ shareId }),
    accept: (token) => acceptInvitationAction({ token }),
    attach: (noteId, fileId) => attachFileToNoteAction({ noteId, fileId }),
    restoreVersion: (noteId, versionId) => restoreNoteVersionAction({ noteId, versionId }),
  },
};
