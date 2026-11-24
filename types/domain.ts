export type Id = string;
export type Timestamp = string;
export type Permission = "viewer" | "editor";

export interface Workspace {
  id: Id;
  ownerId: Id;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Folder {
  id: Id;
  workspaceId: Id;
  parentId: Id | null;
  name: string;
  noteCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

export interface Note {
  id: Id;
  workspaceId: Id;
  folderId: Id | null;
  title: string;
  excerpt: string;
  content: Record<string, unknown>;
  markdown: string;
  tags: string[];
  starred: boolean;
  wordCount: number;
  updatedLabel: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  deletedAt: Timestamp | null;
}

export type FileKind = "document" | "image" | "spreadsheet" | "archive" | "other";

export interface StoredFile {
  id: Id;
  workspaceId: Id;
  folderId: Id | null;
  name: string;
  kind: FileKind;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  starred: boolean;
  updatedLabel: string;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

export interface NoteVersion {
  id: Id;
  noteId: Id;
  label: string;
  author: string;
  summary: string;
  title: string;
  content: Record<string, unknown>;
  markdown: string;
  createdLabel: string;
  createdAt: Timestamp;
}

export interface SharedNote {
  id: Id;
  noteId: Id;
  title: string;
  collaborator: string;
  email: string;
  permission: Permission;
  sharedLabel: string;
  sharedAt: Timestamp;
  expiresAt: Timestamp | null;
  collaboratorId: Id | null;
  accepted: boolean;
}

export interface AppUser {
  name: string;
  email: string;
  initials: string;
  role: string;
}

export interface WorkspaceStatus {
  label: string;
  detail: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  output: string[];
}

export interface TrashItem {
  id: Id;
  kind: "note" | "folder" | "file";
  name: string;
  detail: string;
  deletedLabel: string;
  deletedAt: Timestamp;
}
