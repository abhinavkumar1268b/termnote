export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function getMaxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES;
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_UPLOAD_BYTES;
}

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  document: [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  image: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  spreadsheet: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  archive: ["application/zip"],
  other: ["audio/mpeg", "audio/wav"],
};

export function fileKindForMime(mime: string): keyof typeof ALLOWED_MIME_TYPES | null {
  for (const [kind, types] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (types.includes(mime)) return kind;
  }
  return null;
}

export function normalizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/^\.+/, "")
    .trim();
  return cleaned.slice(0, 180) || "unnamed-file";
}

export function isSafeStoragePath(path: string, userId: string, workspaceId: string): boolean {
  const prefix = `${userId}/${workspaceId}/`;
  return path.startsWith(prefix) && !path.includes("..") && !path.includes("\\") && !path.includes("//");
}
