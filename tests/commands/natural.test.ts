import { describe, expect, it } from "vitest";
import { autocomplete } from "@/lib/commands/autocomplete";
import { executeCommand } from "@/lib/commands/executor";

describe("natural commands", () => {
  it("creates notes, folders and nested subfolders", async () => {
    const note = await executeCommand('create file "Project Ideas"');
    expect(note.ok).toBe(true);
    expect(note.output.join("\n")).toContain("Project Ideas");

    const folder = await executeCommand('create folder "Personal"');
    expect(folder.ok).toBe(true);

    const subfolder = await executeCommand('create subfolder "Frontend" inside "Projects"');
    expect(subfolder.ok).toBe(true);
    expect(subfolder.output.join("\n")).toContain("subfolder");
  });

  it("rejects unsupported create targets", async () => {
    const result = await executeCommand("create planet Mars");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("opens notes, folders and recent notes by name", async () => {
    const note = await executeCommand('open "Weekly review"');
    expect(note.ok).toBe(true);
    expect(note.data?.targetKind).toBe("note");

    const folder = await executeCommand('open folder "Projects"');
    expect(folder.ok).toBe(true);
    expect(folder.data?.navigate).toBe("/folders");

    const recent = await executeCommand("open recent");
    expect(recent.ok).toBe(true);
  });

  it("renames and moves by human-readable name", async () => {
    const rename = await executeCommand('rename "Weekly review" to "Weekly recap"');
    expect(rename.ok).toBe(true);

    const move = await executeCommand('move "Weekly review" to "Projects"');
    expect(move.ok).toBe(true);

    const missing = await executeCommand('rename "Ghost" to "Nope"');
    expect(missing.ok).toBe(false);
  });

  it("searches and shows views without sample data", async () => {
    const search = await executeCommand('search "weekly"');
    expect(search.ok).toBe(true);
    expect(search.output.join("\n")).toContain("Weekly review");

    for (const view of ["recent", "starred", "trash", "files", "folders"]) {
      const result = await executeCommand(`show ${view}`);
      expect(result.ok).toBe(true);
    }

    const unknown = await executeCommand("show galaxy");
    expect(unknown.ok).toBe(false);
  });

  it("requires confirmation before natural deletion", async () => {
    const pending = await executeCommand('delete "Weekly review"');
    expect(pending.error?.code).toBe("CONFIRMATION_REQUIRED");

    const confirmed = await executeCommand('delete "Weekly review" --yes');
    expect(confirmed.ok).toBe(true);
  });

  it("supports starring and restoring by name", async () => {
    const star = await executeCommand('star "Weekly review"');
    expect(star.ok).toBe(true);
    const unstar = await executeCommand('star "Weekly review" --remove');
    expect(unstar.ok).toBe(true);
    const restore = await executeCommand('restore "Old release checklist"');
    expect(restore.ok).toBe(true);
  });

  it("offers natural commands in autocomplete", () => {
    const suggestions = autocomplete("create ");
    expect(suggestions.some((item) => item.value === "create")).toBe(true);
    expect(autocomplete("show ").some((item) => item.value === "show")).toBe(true);
  });
});
