import type { ActionResult, ItemCounts } from "@/lib/actions/types";
import { mockFiles } from "@/mocks/files";
import { getFolderName, mockFolders } from "@/mocks/folders";
import { mockNoteVersions } from "@/mocks/history";
import { getNoteById, mockNotes } from "@/mocks/notes";
import { mockSharedNotes } from "@/mocks/shared";
import { mockTrash } from "@/mocks/trash";
import { mockUser, mockWorkspace, mockWorkspaceStatus } from "@/mocks/user";
import type { Note, StoredFile } from "@/types/domain";

export interface ServiceNote extends Note {
  folderName: string;
}
export interface ServiceFile extends StoredFile {
  folderName: string;
}
export interface ServiceTrashItem {
  id: string;
  kind: "note" | "folder" | "file";
  name: string;
  detail: string;
  deletedLabel: string;
}
export interface ServiceShare {
  noteId: string;
  title: string;
  collaborator: string;
  email: string;
  permission: "viewer" | "editor";
  sharedLabel: string;
}

export interface CommandServices {
  workspace: {
    summary(): Promise<{
      name: string;
      user: string;
      notes: number;
      folders: number;
      files: number;
      starred: number;
      storage: { storageUsedBytes: number; storageLimitBytes: number };
    }>;
  };
  notes: {
    list(folder?: string, limit?: number): Promise<ServiceNote[]>;
    find(term: string, limit?: number): Promise<ServiceNote[]>;
    get(id: string): Promise<ServiceNote | null>;
    star(id: string): Promise<ServiceNote | null>;
    versions(id: string): Promise<Array<{ label: string; summary: string; createdLabel: string }>>;
  };
  folders: {
    list(): Promise<Array<{ id: string; name: string; parentId: string | null; noteCount: number }>>;
    get(name: string): Promise<{ id: string; name: string; noteCount: number } | null>;
  };
  files: {
    list(kind?: string): Promise<ServiceFile[]>;
    get(name: string): Promise<ServiceFile | null>;
  };
  starred: {
    list(): Promise<{ notes: ServiceNote[]; files: ServiceFile[] }>;
  };
  trash: {
    list(): Promise<ServiceTrashItem[]>;
    get(id: string): Promise<ServiceTrashItem | null>;
  };
  sharing: {
    list(role?: string): Promise<ServiceShare[]>;
    get(noteId: string): Promise<ServiceShare[]>;
  };
  editor: {
    open(id: string): Promise<ServiceNote | null>;
  };
  mutations: {
    createFolder(name: string, parentId?: string | null): Promise<ActionResult<{ id: string }>>;
    renameFolder(id: string, name: string): Promise<ActionResult>;
    moveFolder(id: string, parentId: string | null): Promise<ActionResult>;
    deleteFolder(id: string, includeContents?: boolean): Promise<ActionResult<ItemCounts>>;
    restoreFolder(id: string): Promise<ActionResult>;
    createNote(title: string, folderId?: string | null): Promise<ActionResult<{ id: string }>>;
    renameNote(id: string, title: string): Promise<ActionResult>;
    moveNote(id: string, folderId: string | null): Promise<ActionResult>;
    deleteNote(id: string): Promise<ActionResult>;
    restoreNote(id: string): Promise<ActionResult>;
    searchNotes(term: string, limit?: number): Promise<ActionResult<Array<{ id: string; title: string }>>>;
    setStar(type: "note" | "file", id: string, starred: boolean): Promise<ActionResult>;
    deleteFile(id: string): Promise<ActionResult>;
    restoreFile(id: string): Promise<ActionResult>;
    getFileUrl(id: string, download?: boolean): Promise<ActionResult<{ url: string; mimeType: string; name: string }>>;
    purge(kind: "note" | "folder" | "file", id: string, confirmed: boolean, includeContents?: boolean): Promise<ActionResult>;
    emptyTrash(confirmed: boolean): Promise<ActionResult<ItemCounts>>;
    invite(noteId: string, email: string, permission: "viewer" | "editor", expiresInDays?: number): Promise<ActionResult<{ token: string; shareId: string }>>;
    revoke(shareId: string): Promise<ActionResult>;
    accept(token: string): Promise<ActionResult<{ noteId: string }>>;
    attach(noteId: string, fileId: string): Promise<ActionResult>;
    restoreVersion(noteId: string, versionId: string): Promise<ActionResult<{ versionId: string }>>;
  };
}

const asServiceNote = (note: Note): ServiceNote => ({ ...note, folderName: getFolderName(note.folderId) });
const asServiceFile = (file: StoredFile): ServiceFile => ({ ...file, folderName: getFolderName(file.folderId) });

export const mockCommandServices: CommandServices = {
  workspace: {
    async summary() {
      return {
        name: mockWorkspace.name,
        user: mockUser.name,
        notes: mockNotes.length,
        folders: mockFolders.length,
        files: mockFiles.length,
        starred: mockNotes.filter((note) => note.starred).length,
        storage: mockWorkspaceStatus,
      };
    },
  },
  notes: {
    async list(folder, limit = 10) {
      return mockNotes
        .filter((note) => !folder || getFolderName(note.folderId).toLowerCase() === folder.toLowerCase())
        .slice(0, limit)
        .map(asServiceNote);
    },
    async find(term, limit = 10) {
      const needle = term.toLowerCase();
      return mockNotes
        .filter((note) => `${note.title} ${note.excerpt} ${note.tags.join(" ")}`.toLowerCase().includes(needle))
        .slice(0, limit)
        .map(asServiceNote);
    },
    async get(id) {
      const needle = id.toLowerCase();
      const note = getNoteById(id) ?? mockNotes.find((item) =>
        item.title.toLowerCase() === needle || item.title.toLowerCase().startsWith(needle),
      );
      return note ? asServiceNote(note) : null;
    },
    async star(id) {
      const note = getNoteById(id) ?? mockNotes.find((item) => item.title.toLowerCase() === id.toLowerCase());
      return note ? asServiceNote(note) : null;
    },
    async versions(id) {
      return mockNoteVersions
        .filter((version) => version.noteId === id)
        .map((version) => ({ label: version.label, summary: version.summary, createdLabel: version.createdLabel }));
    },
  },
  folders: {
    async list() {
      return mockFolders.map((folder) => ({ id: folder.id, name: folder.name, parentId: folder.parentId, noteCount: folder.noteCount }));
    },
    async get(name) {
      const folder = mockFolders.find((item) => item.name.toLowerCase() === name.toLowerCase());
      return folder ? { id: folder.id, name: folder.name, noteCount: folder.noteCount } : null;
    },
  },
  files: {
    async list(kind) {
      return mockFiles.filter((file) => !kind || file.kind === kind).map(asServiceFile);
    },
    async get(name) {
      const file = mockFiles.find((item) => item.name.toLowerCase() === name.toLowerCase());
      return file ? asServiceFile(file) : null;
    },
  },
  starred: {
    async list() {
      return {
        notes: mockNotes.filter((note) => note.starred).map(asServiceNote),
        files: mockFiles.filter((file) => file.starred).map(asServiceFile),
      };
    },
  },
  trash: {
    async list() {
      return mockTrash.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        detail: item.detail,
        deletedLabel: item.deletedLabel,
      }));
    },
    async get(id) {
      const item = mockTrash.find((entry) => entry.id === id || entry.name.toLowerCase() === id.toLowerCase());
      return item
        ? { id: item.id, kind: item.kind, name: item.name, detail: item.detail, deletedLabel: item.deletedLabel }
        : null;
    },
  },
  sharing: {
    async list(role) {
      return mockSharedNotes
        .filter((share) => !role || share.permission === role)
        .map((share) => ({
          noteId: share.noteId,
          title: share.title,
          collaborator: share.collaborator,
          email: share.email,
          permission: share.permission,
          sharedLabel: share.sharedLabel,
        }));
    },
    async get(noteId) {
      return mockSharedNotes
        .filter((share) => share.noteId === noteId)
        .map((share) => ({
          noteId: share.noteId,
          title: share.title,
          collaborator: share.collaborator,
          email: share.email,
          permission: share.permission,
          sharedLabel: share.sharedLabel,
        }));
    },
  },
  editor: {
    async open(id) {
      const note = getNoteById(id) ?? mockNotes.find((item) => item.title.toLowerCase() === id.toLowerCase());
      return note ? asServiceNote(note) : null;
    },
  },
  mutations: {
    async createFolder(name) {
      return { ok: true, data: { id: `mock-folder-${name.length}` } };
    },
    async renameFolder() {
      return { ok: true, data: null };
    },
    async moveFolder() {
      return { ok: true, data: null };
    },
    async deleteFolder(_id, includeContents) {
      if (!includeContents) {
        return { ok: false, code: "CONFLICT", message: "Mock folder contains items.", details: ["Pass --with-contents."] };
      }
      return { ok: true, data: { notes: 0, folders: 0, files: 0 } };
    },
    async restoreFolder() {
      return { ok: true, data: null };
    },
    async createNote(title) {
      return { ok: true, data: { id: `mock-note-${title.length}` } };
    },
    async renameNote() {
      return { ok: true, data: null };
    },
    async moveNote() {
      return { ok: true, data: null };
    },
    async deleteNote() {
      return { ok: true, data: null };
    },
    async restoreNote() {
      return { ok: true, data: null };
    },
    async searchNotes(term) {
      return { ok: true, data: mockNotes.filter((note) => note.title.toLowerCase().includes(term.toLowerCase())).slice(0, 10).map((note) => ({ id: note.id, title: note.title })) };
    },
    async setStar() {
      return { ok: true, data: null };
    },
    async deleteFile() {
      return { ok: true, data: null };
    },
    async restoreFile() {
      return { ok: true, data: null };
    },
    async getFileUrl() {
      return { ok: true, data: { url: "https://example.invalid/signed", mimeType: "application/pdf", name: "sample.pdf" } };
    },
    async purge() {
      return { ok: true, data: null };
    },
    async emptyTrash() {
      return { ok: true, data: { notes: 0, folders: 0, files: 0 } };
    },
    async invite() {
      return { ok: true, data: { token: "mock-token", shareId: "mock-share" } };
    },
    async revoke() {
      return { ok: true, data: null };
    },
    async accept() {
      return { ok: true, data: { noteId: "n-001" } };
    },
    async attach() {
      return { ok: true, data: null };
    },
    async restoreVersion() {
      return { ok: true, data: { versionId: "mock-new-version" } };
    },
  },
};

let activeServices: CommandServices = mockCommandServices;

export function getCommandServices(): CommandServices {
  return activeServices;
}

export function setCommandServices(services: CommandServices): void {
  activeServices = services;
}

export function describeNote(note: ServiceNote): string {
  return `${note.id}  ${note.title}  [${note.folderName}]  ${note.updatedLabel}`;
}

export function describeFile(file: ServiceFile): string {
  return `${file.name}  [${file.folderName}]  ${file.extension}  ${file.updatedLabel}`;
}
