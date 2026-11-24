export const NAMESPACES = ["note", "folder", "file", "star", "trash", "editor", "share", "history"] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const TOP_LEVEL_COMMANDS = ["help", "clear"] as const;
export type TopLevelCommand = (typeof TOP_LEVEL_COMMANDS)[number];

export const CONFIRMATION_FLAG = "yes";
export const MAX_HISTORY_ENTRIES = 50;

export function isNamespace(value: string): value is Namespace {
  return (NAMESPACES as readonly string[]).includes(value);
}
