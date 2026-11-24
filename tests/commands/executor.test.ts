import { describe, expect, it } from "vitest";
import { executeCommand } from "@/lib/commands/executor";

describe("executeCommand validation", () => {
  it("reports missing arguments", async () => {
    const result = await executeCommand("note open");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("MISSING_ARGUMENT");
    expect(result.error?.message).toContain("<id>");
  });

  it("reports unsupported flags", async () => {
    const result = await executeCommand("note list --colour blue");
    expect(result.error?.code).toBe("UNSUPPORTED_FLAG");
    expect(result.error?.details?.[0]).toContain("--folder");
  });

  it("rejects invalid values with Zod", async () => {
    const email = await executeCommand("share invite n-001 --email not-an-email --role viewer");
    expect(email.error?.code).toBe("INVALID_ARGUMENT");

    const role = await executeCommand("share invite n-001 --email alex@example.com --role admin");
    expect(role.error?.code).toBe("INVALID_ARGUMENT");

    const mode = await executeCommand("editor mode focus");
    expect(mode.error?.code).toBe("INVALID_ARGUMENT");
  });

  it("reports unknown commands with suggestions", async () => {
    const result = await executeCommand("note opne n-001");
    expect(result.error?.code).toBe("UNKNOWN_COMMAND");
    expect(result.error?.details?.[0]).toContain("Did you mean");
    expect(result.error?.details?.[0]).toContain("note open");
  });

  it("returns structured success results", async () => {
    const result = await executeCommand("note list --limit 2");
    expect(result.ok).toBe(true);
    expect(result.command).toBe("note list");
    expect(result.output.length).toBeGreaterThan(1);
    expect(result.data?.notes).toHaveLength(2);
  });

  it("supports clear and help without a shell", async () => {
    const clear = await executeCommand("clear");
    expect(clear.ok).toBe(true);
    expect(clear.data?.clear).toBe(true);

    const help = await executeCommand("help note open");
    expect(help.ok).toBe(true);
    expect(help.output.join("\n")).toContain("Usage: note open <id>");
  });

  it("requires confirmation for destructive commands", async () => {
    const pending = await executeCommand("trash purge trash-01");
    expect(pending.error?.code).toBe("CONFIRMATION_REQUIRED");
    expect(pending.confirmation?.flag).toBe("yes");

    const confirmed = await executeCommand("trash purge trash-01 --yes");
    expect(confirmed.ok).toBe(true);
    expect(confirmed.output.join("\n")).toContain("Permanently deleted");
  });

  it("connects editor mode to the UI through structured data", async () => {
    const result = await executeCommand("editor mode markdown");
    expect(result.ok).toBe(true);
    expect(result.data?.editorMode).toBe("markdown");
  });

  it("never executes operating-system commands", async () => {
    const result = await executeCommand("rm -rf /");
    expect(result.error?.code).toBe("UNKNOWN_COMMAND");
  });
});
