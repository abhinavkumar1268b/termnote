import { describe, expect, it } from "vitest";
import { generateInvitationToken, hashInvitationToken, isInvitationExpired } from "@/lib/sharing/token";

describe("invitation tokens", () => {
  it("generates unique high-entropy tokens", () => {
    const first = generateInvitationToken();
    const second = generateInvitationToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(40);
    expect(first).not.toContain("/");
  });

  it("stores only a deterministic hash", () => {
    const token = generateInvitationToken();
    const hash = hashInvitationToken(token);
    expect(hash).toBe(hashInvitationToken(token));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("checks expiry", () => {
    const now = Date.parse("2026-11-24T00:00:00Z");
    expect(isInvitationExpired(null, now)).toBe(false);
    expect(isInvitationExpired("2026-11-25T00:00:00Z", now)).toBe(false);
    expect(isInvitationExpired("2026-11-23T00:00:00Z", now)).toBe(true);
  });
});
