import { describe, expect, it } from "vitest";
import { canUseBrowserHistory } from "@/lib/navigation/history";

const origin = "http://localhost:2333";

describe("Settings back navigation", () => {
  it("uses browser history for same-origin navigation", () => {
    expect(canUseBrowserHistory(2, `${origin}/notes`, origin)).toBe(true);
    expect(canUseBrowserHistory(3, "", origin)).toBe(true);
  });

  it("falls back to the workspace for direct or external entry", () => {
    expect(canUseBrowserHistory(1, "", origin)).toBe(false);
    expect(canUseBrowserHistory(2, "https://example.com", origin)).toBe(false);
    expect(canUseBrowserHistory(2, "not a url", origin)).toBe(false);
  });
});
