import type { SharedNote } from "@/types/domain";

const base = {
  sharedLabel: "2 days ago",
  expiresAt: null,
  collaboratorId: null,
  accepted: false,
};

export const mockSharedNotes: SharedNote[] = [
  {
    ...base,
    id: "share-01", noteId: "n-001", title: "Apollo launch checklist",
    collaborator: "Priya Raman", email: "priya@example.com", permission: "editor", sharedAt: "2026-11-21T10:00:00Z",
  },
  {
    ...base,
    id: "share-02", noteId: "n-003", title: "Design tokens and colour scale",
    collaborator: "Jonas Weber", email: "jonas@example.com", permission: "viewer", sharedAt: "2026-11-16T09:00:00Z",
  },
  {
    ...base,
    id: "share-03", noteId: "n-007", title: "Local-first storage notes",
    collaborator: "Mira Chen", email: "mira@example.com", permission: "editor", sharedAt: "2026-11-09T14:30:00Z",
  },
];
