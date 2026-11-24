import { z } from "zod";

export const SAVE_DEBOUNCE_MS = 800;
export const SAVE_MAX_RETRIES = 3;

export const saveNoteSchema = z.object({
  noteId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  markdown: z.string().max(200_000),
  content: z.string().max(500_000),
  expectedUpdatedAt: z.string().min(1),
});

export type SaveNoteInput = z.infer<typeof saveNoteSchema>;

export type SaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; code: "INVALID" | "CONFLICT" | "FORBIDDEN" | "ERROR"; message: string };

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error" | "conflict";
