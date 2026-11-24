import type { TrashItem } from "@/types/domain";

export const mockTrash: TrashItem[] = [
  {
    id: "trash-01",
    kind: "note",
    name: "Old release checklist",
    detail: "Note · Projects",
    deletedLabel: "3 days ago",
    deletedAt: "2026-11-20T08:00:00Z",
  },
  {
    id: "trash-02",
    kind: "file",
    name: "draft-wireframe-v1.png",
    detail: "File · 620 KB",
    deletedLabel: "1 week ago",
    deletedAt: "2026-11-16T11:00:00Z",
  },
  {
    id: "trash-03",
    kind: "folder",
    name: "Temp research",
    detail: "Folder · 2 notes",
    deletedLabel: "2 weeks ago",
    deletedAt: "2026-11-09T17:20:00Z",
  },
  {
    id: "trash-04",
    kind: "note",
    name: "Duplicate meeting notes",
    detail: "Note · Inbox",
    deletedLabel: "1 month ago",
    deletedAt: "2026-10-22T13:00:00Z",
  },
];
