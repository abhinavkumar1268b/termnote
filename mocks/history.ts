import type { NoteVersion } from "@/types/domain";

const base = {
  title: "Apollo launch checklist",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Release checklist snapshot" }] }] },
  markdown: "Release checklist snapshot",
};

export const mockNoteVersions: NoteVersion[] = [
  { ...base, id: "v-014", noteId: "n-001", label: "Version 14", author: "Alex Morgan", summary: "Added rollback verification step", createdLabel: "12 min ago", createdAt: "2026-11-23T09:24:00Z" },
  { ...base, id: "v-013", noteId: "n-001", label: "Version 13", author: "Alex Morgan", summary: "Reordered canary rollout section", createdLabel: "Yesterday", createdAt: "2026-11-22T17:05:00Z" },
  { ...base, id: "v-012", noteId: "n-001", label: "Version 12", author: "Priya Raman", summary: "Updated storage bucket policy item", createdLabel: "2 days ago", createdAt: "2026-11-21T10:42:00Z" },
  { ...base, id: "v-011", noteId: "n-001", label: "Version 11", author: "Alex Morgan", summary: "Initial release checklist draft", createdLabel: "3 weeks ago", createdAt: "2026-11-02T10:00:00Z" },
];
