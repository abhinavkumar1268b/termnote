import { describe, expect, it } from "vitest";
import { executeCommand } from "@/lib/commands/executor";

describe("library commands", () => {
  it("requires confirmation before deleting folders", async () => {
    const pending = await executeCommand("folder delete folder-1");
    expect(pending.error?.code).toBe("CONFIRMATION_REQUIRED");

    const withoutContents = await executeCommand("folder delete folder-1 --yes");
    expect(withoutContents.ok).toBe(false);
    expect(withoutContents.error?.message).toContain("contains items");

    const withContents = await executeCommand("folder delete folder-1 --yes --with-contents");
    expect(withContents.ok).toBe(true);
  });

  it("requires confirmation before emptying trash", async () => {
    const pending = await executeCommand("trash empty");
    expect(pending.error?.code).toBe("CONFIRMATION_REQUIRED");

    const confirmed = await executeCommand("trash empty --yes");
    expect(confirmed.ok).toBe(true);
  });

  it("creates nested folders through the service adapter", async () => {
    const result = await executeCommand('folder create "Team docs" --parent folder-1');
    expect(result.ok).toBe(true);
    expect(result.output.join("\n")).toContain("Team docs");
  });

  it("accepts unquoted multi-word names and titles", async () => {
    const folder = await executeCommand("folder create Team docs");
    expect(folder.ok).toBe(true);
    expect(folder.output.join("\n")).toContain("Team docs");

    const note = await executeCommand("note create Weekly recap");
    expect(note.ok).toBe(true);
    expect(note.output.join("\n")).toContain("Weekly recap");
  });

  it("returns signed URL data from the file url command", async () => {
    const result = await executeCommand("file url release-plan.pdf");
    expect(result.ok).toBe(true);
    expect(result.data?.url).toContain("https://");
  });

  it("searches notes through the service adapter", async () => {
    const result = await executeCommand("note search weekly");
    expect(result.ok).toBe(true);
    expect(result.output.join("\n")).toContain("Weekly review");
  });

  it("restores history as a new version", async () => {
    const result = await executeCommand("history restore n-001 v-011");
    expect(result.ok).toBe(true);
    expect(result.data?.versionId).toBe("mock-new-version");
    expect(result.data?.navigate).toBe("/notes/n-001/history");
  });

  it("supports note and file recovery commands", async () => {
    const note = await executeCommand("note restore note-1");
    const file = await executeCommand("file restore release-plan.pdf");
    expect(note.ok).toBe(true);
    expect(file.ok).toBe(true);
  });
});
