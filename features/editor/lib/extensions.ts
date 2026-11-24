import type { Extensions } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { createBaseExtensions } from "./schema";
import { SmartPaste } from "./smart-paste";

export function createEditorExtensions(): Extensions {
  return [...createBaseExtensions(), Markdown, SmartPaste];
}
