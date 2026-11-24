import type { StoredFile } from "@/types/domain";

export const mockFiles: StoredFile[] = [
  {
    id: "file-01", workspaceId: "ws-personal", folderId: "f-apollo", name: "release-plan.pdf",
    kind: "document", mimeType: "application/pdf", extension: "PDF", sizeBytes: 2_400_000,
    starred: true, updatedLabel: "Today", updatedAt: "2026-11-23T09:10:00Z", deletedAt: null,
  },
  {
    id: "file-02", workspaceId: "ws-personal", folderId: "f-site", name: "palette-reference.png",
    kind: "image", mimeType: "image/png", extension: "PNG", sizeBytes: 840_000,
    starred: false, updatedLabel: "Yesterday", updatedAt: "2026-11-22T15:30:00Z", deletedAt: null,
  },
  {
    id: "file-03", workspaceId: "ws-personal", folderId: "f-projects", name: "budget-q4.xlsx",
    kind: "spreadsheet", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "XLSX", sizeBytes: 128_000,
    starred: false, updatedLabel: "2 days ago", updatedAt: "2026-11-21T17:00:00Z", deletedAt: null,
  },
  {
    id: "file-04", workspaceId: "ws-personal", folderId: "f-research", name: "storage-notes.md",
    kind: "document", mimeType: "text/markdown", extension: "MD", sizeBytes: 18_000,
    starred: true, updatedLabel: "4 days ago", updatedAt: "2026-11-19T11:20:00Z", deletedAt: null,
  },
  {
    id: "file-05", workspaceId: "ws-personal", folderId: "f-inbox", name: "meeting-recording.mp3",
    kind: "other", mimeType: "audio/mpeg", extension: "MP3", sizeBytes: 18_600_000,
    starred: false, updatedLabel: "1 week ago", updatedAt: "2026-11-16T12:00:00Z", deletedAt: null,
  },
  {
    id: "file-06", workspaceId: "ws-personal", folderId: "f-archive", name: "q3-archive.zip",
    kind: "archive", mimeType: "application/zip", extension: "ZIP", sizeBytes: 44_000_000,
    starred: false, updatedLabel: "2 weeks ago", updatedAt: "2026-11-09T10:00:00Z", deletedAt: null,
  },
  {
    id: "file-07", workspaceId: "ws-personal", folderId: "f-site", name: "component-map.svg",
    kind: "image", mimeType: "image/svg+xml", extension: "SVG", sizeBytes: 42_000,
    starred: false, updatedLabel: "3 weeks ago", updatedAt: "2026-11-02T09:45:00Z", deletedAt: null,
  },
  {
    id: "file-08", workspaceId: "ws-personal", folderId: "f-projects", name: "launch-assets.zip",
    kind: "archive", mimeType: "application/zip", extension: "ZIP", sizeBytes: 9_200_000,
    starred: false, updatedLabel: "1 month ago", updatedAt: "2026-10-27T16:10:00Z", deletedAt: null,
  },
];
