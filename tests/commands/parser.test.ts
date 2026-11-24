import { describe, expect, it } from "vitest";
import { lex } from "@/lib/commands/lexer";
import { CommandParseError } from "@/lib/commands/errors";
import { parseCommand } from "@/lib/commands/parser";

describe("lexer", () => {
  it("keeps double-quoted text as one token", () => {
    expect(lex('note find "hello world"').map((token) => token.value)).toEqual([
      "note",
      "find",
      "hello world",
    ]);
  });

  it("keeps single-quoted text and escaped characters", () => {
    expect(lex("note find 'release \\'notes\\''").map((token) => token.value)).toEqual([
      "note",
      "find",
      "release 'notes'",
    ]);
  });

  it("rejects unterminated quotes", () => {
    expect(() => lex('note find "oops')).toThrow(CommandParseError);
  });
});

describe("parser", () => {
  it("parses namespaced commands", () => {
    const parsed = parseCommand("note list");
    expect(parsed).toMatchObject({
      name: "note list",
      namespace: "note",
      action: "list",
      args: [],
      flags: {},
    });
  });

  it("parses quoted arguments as a single value", () => {
    const parsed = parseCommand('note find "weekly review"');
    expect(parsed.args).toEqual(["weekly review"]);
  });

  it("parses flags with values and inline values", () => {
    const parsed = parseCommand("share invite n-001 --email alex@example.com --role=editor");
    expect(parsed.args).toEqual(["n-001"]);
    expect(parsed.flags).toEqual({ email: "alex@example.com", role: "editor" });
  });

  it("parses boolean flags", () => {
    const parsed = parseCommand("trash purge trash-01 --yes");
    expect(parsed.flags.yes).toBe(true);
  });

  it("rejects empty input and missing namespace actions", () => {
    expect(() => parseCommand("   ")).toThrow(CommandParseError);
    expect(() => parseCommand("note")).toThrow(CommandParseError);
  });
});
