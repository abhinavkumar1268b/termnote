import { describe, expect, it } from "vitest";
import { formatBytes } from "@/lib/format";

describe("formatBytes", () => {
  it("formats bytes and kilobytes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2_400)).toBe("2 KB");
  });

  it("formats megabytes and gigabytes", () => {
    expect(formatBytes(2_400_000)).toBe("2.4 MB");
    expect(formatBytes(1_240_000_000)).toBe("1.24 GB");
  });
});
