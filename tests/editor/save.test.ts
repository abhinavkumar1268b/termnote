import { describe, expect, it } from "vitest";
import { saveNoteSchema, SAVE_DEBOUNCE_MS, SAVE_MAX_RETRIES } from "@/lib/editor/save";

const valid = {
  noteId: "3a06a79e-9c82-475d-ad0e-b2a8060c1286",
  title: "A note",
  markdown: "# Heading\n\nbody",
  content: '{"type":"doc","content":[]}',
  expectedUpdatedAt: "2026-11-24T00:00:00Z",
};

describe("autosave contract", () => {
  it("uses a debounce and bounded retries", () => {
    expect(SAVE_DEBOUNCE_MS).toBeGreaterThan(0);
    expect(SAVE_MAX_RETRIES).toBeGreaterThan(0);
    expect(SAVE_MAX_RETRIES).toBeLessThanOrEqual(5);
  });

  it("validates a well-formed save payload", () => {
    expect(saveNoteSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing ownership timestamp used for conflict detection", () => {
    const result = saveNoteSchema.safeParse({ ...valid, expectedUpdatedAt: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects invalid note ids and empty titles", () => {
    expect(saveNoteSchema.safeParse({ ...valid, noteId: "not-a-uuid" }).success).toBe(false);
    expect(saveNoteSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
  });
});
