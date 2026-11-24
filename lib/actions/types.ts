export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; code: "INVALID" | "DUPLICATE" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "STORAGE" | "ERROR"; message: string; details?: string[] };

export interface ItemCounts {
  notes: number;
  folders: number;
  files: number;
}
