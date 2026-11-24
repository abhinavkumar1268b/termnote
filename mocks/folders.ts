import type { Folder } from "@/types/domain";

export const mockFolders: Folder[] = [
  {
    id: "f-inbox",
    workspaceId: "ws-personal",
    parentId: null,
    name: "Inbox",
    noteCount: 3,
    createdAt: "2026-04-02T08:00:00Z",
    updatedAt: "2026-11-23T09:24:00Z",
    deletedAt: null,
  },
  {
    id: "f-projects",
    workspaceId: "ws-personal",
    parentId: null,
    name: "Projects",
    noteCount: 5,
    createdAt: "2026-04-03T10:10:00Z",
    updatedAt: "2026-11-22T16:40:00Z",
    deletedAt: null,
  },
  {
    id: "f-apollo",
    workspaceId: "ws-personal",
    parentId: "f-projects",
    name: "Apollo launch",
    noteCount: 2,
    createdAt: "2026-05-10T11:00:00Z",
    updatedAt: "2026-11-22T16:40:00Z",
    deletedAt: null,
  },
  {
    id: "f-site",
    workspaceId: "ws-personal",
    parentId: "f-projects",
    name: "Site refresh",
    noteCount: 3,
    createdAt: "2026-06-14T09:30:00Z",
    updatedAt: "2026-11-20T13:15:00Z",
    deletedAt: null,
  },
  {
    id: "f-research",
    workspaceId: "ws-personal",
    parentId: null,
    name: "Research",
    noteCount: 2,
    createdAt: "2026-07-01T12:00:00Z",
    updatedAt: "2026-11-18T11:05:00Z",
    deletedAt: null,
  },
  {
    id: "f-reading",
    workspaceId: "ws-personal",
    parentId: "f-research",
    name: "Reading list",
    noteCount: 2,
    createdAt: "2026-07-02T12:00:00Z",
    updatedAt: "2026-11-18T11:05:00Z",
    deletedAt: null,
  },
  {
    id: "f-archive",
    workspaceId: "ws-personal",
    parentId: null,
    name: "Archive",
    noteCount: 4,
    createdAt: "2026-04-05T08:20:00Z",
    updatedAt: "2026-10-30T10:00:00Z",
    deletedAt: null,
  },
];

export function getFolderName(folderId: string | null): string {
  if (!folderId) return "Unfiled";
  return mockFolders.find((folder) => folder.id === folderId)?.name ?? "Unfiled";
}
