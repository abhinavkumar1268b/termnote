import { describe, expect, it } from "vitest";
import { CommandHistory } from "@/lib/commands/history";

describe("CommandHistory", () => {
  it("stores newest commands first and skips duplicates", () => {
    const history = new CommandHistory();
    history.push("help");
    history.push("note list");
    history.push("note list");

    expect(history.all()).toEqual(["note list", "help"]);
  });

  it("navigates backwards and forwards", () => {
    const history = new CommandHistory();
    history.push("help");
    history.push("note list");
    history.push("status");

    expect(history.previous()).toBe("status");
    expect(history.previous()).toBe("note list");
    expect(history.previous()).toBe("help");
    expect(history.previous()).toBe("help");
    expect(history.next()).toBe("note list");
    expect(history.next()).toBe("status");
    expect(history.next()).toBeNull();
  });

  it("bounds the number of entries", () => {
    const history = new CommandHistory(2);
    history.push("one");
    history.push("two");
    history.push("three");

    expect(history.all()).toEqual(["three", "two"]);
  });

  it("can be seeded and cleared", () => {
    const history = new CommandHistory(10, ["help", "status"]);
    expect(history.size()).toBe(2);
    history.clear();
    expect(history.all()).toEqual([]);
    expect(history.previous()).toBeNull();
  });
});
