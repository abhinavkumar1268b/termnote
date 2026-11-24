import { describe, expect, it } from "vitest";
import { executeCommand } from "@/lib/commands/executor";

describe("sharing commands", () => {
  it("requires confirmation to revoke access", async () => {
    const pending = await executeCommand("share revoke share-01");
    expect(pending.error?.code).toBe("CONFIRMATION_REQUIRED");

    const confirmed = await executeCommand("share revoke share-01 --yes");
    expect(confirmed.ok).toBe(true);
  });

  it("validates the invited email and role", async () => {
    const invalid = await executeCommand("share invite n-001 --email nope --role viewer");
    expect(invalid.error?.code).toBe("INVALID_ARGUMENT");

    const valid = await executeCommand("share invite n-001 --email friend@example.com --role editor --expires 7");
    expect(valid.ok).toBe(true);
    expect(valid.output.join("\n")).toContain("stored hashed");
  });

  it("accepts invitations and navigates to the note", async () => {
    const result = await executeCommand("share accept abc.def-token");
    expect(result.ok).toBe(true);
    expect(result.data?.navigate).toBe("/notes/n-001");
  });

  it("attaches a file only with both ids", async () => {
    const missing = await executeCommand("share attach n-001");
    expect(missing.error?.code).toBe("MISSING_ARGUMENT");

    const result = await executeCommand("share attach n-001 file-01");
    expect(result.ok).toBe(true);
  });
});
