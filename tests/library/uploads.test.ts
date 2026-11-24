import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  fileKindForMime,
  getMaxUploadBytes,
  isSafeStoragePath,
  normalizeFileName,
} from "@/lib/uploads/config";

describe("upload rules", () => {
  afterEach(() => {
    delete process.env.MAX_UPLOAD_BYTES;
  });

  it("defaults to a 10 MB limit and honours configuration", () => {
    expect(getMaxUploadBytes()).toBe(DEFAULT_MAX_UPLOAD_BYTES);
    process.env.MAX_UPLOAD_BYTES = "2097152";
    expect(getMaxUploadBytes()).toBe(2_097_152);
  });

  it("maps allowed MIME types to file kinds", () => {
    expect(fileKindForMime("application/pdf")).toBe("document");
    expect(fileKindForMime("image/png")).toBe("image");
    expect(fileKindForMime("text/csv")).toBe("spreadsheet");
    expect(fileKindForMime("application/zip")).toBe("archive");
    expect(fileKindForMime("application/x-msdownload")).toBeNull();
  });

  it("sanitises unsafe filenames", () => {
    expect(normalizeFileName("../../etc/passwd")).toBe("passwd");
    expect(normalizeFileName("..\\windows\\system32\\evil.txt")).toBe("evil.txt");
    expect(normalizeFileName("a/b/../../c.pdf")).toBe("c.pdf");
    expect(normalizeFileName("...")).toBe("unnamed-file");
  });

  it("rejects unsafe storage paths", () => {
    expect(isSafeStoragePath("u1/w1/id-report.pdf", "u1", "w1")).toBe(true);
    expect(isSafeStoragePath("u2/w1/id-report.pdf", "u1", "w1")).toBe(false);
    expect(isSafeStoragePath("u1/w1/../secret", "u1", "w1")).toBe(false);
    expect(isSafeStoragePath("u1/w1\\id", "u1", "w1")).toBe(false);
  });
});
