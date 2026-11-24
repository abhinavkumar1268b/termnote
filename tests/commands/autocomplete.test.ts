import { describe, expect, it } from "vitest";
import { autocomplete, closestCommands } from "@/lib/commands/autocomplete";

describe("autocomplete", () => {
  it("suggests commands with descriptions and usage", () => {
    const suggestions = autocomplete("note o");
    expect(suggestions.some((item) => item.value === "note open")).toBe(true);
    expect(suggestions.find((item) => item.value === "note open")?.description).toContain("note open <id>");
  });

  it("suggests subcommands for a namespace", () => {
    const suggestions = autocomplete("trash ");
    expect(suggestions.map((item) => item.value)).toEqual(
      expect.arrayContaining(["trash list", "trash restore", "trash purge"]),
    );
  });

  it("suggests expected argument placeholders", () => {
    const suggestions = autocomplete("note open ");
    expect(suggestions.some((item) => item.kind === "argument" && item.value === "<id>")).toBe(true);
  });

  it("suggests flags with their descriptions", () => {
    const suggestions = autocomplete("share invite n-001 --");
    expect(suggestions.map((item) => item.value)).toEqual(expect.arrayContaining(["--email", "--role"]));
    expect(suggestions.find((item) => item.value === "--email")?.description).toContain("required");
  });

  it("shows argument placeholders with descriptions", () => {
    const suggestion = autocomplete("note open ").find((item) => item.value === "<id>");
    expect(suggestion?.kind).toBe("argument");
    expect(suggestion?.description).toContain("<id>");
  });

  it("suggests flag placeholders without sample data", () => {
    const suggestions = autocomplete("note list --folder In");
    expect(suggestions.some((item) => item.value === "<folder>" && item.kind === "argument")).toBe(true);
  });

  it("offers close matches for unknown commands", () => {
    expect(closestCommands("note opne")[0]).toBe("note open");
    const suggestions = autocomplete("not lis");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain("Did you mean");
  });
});
