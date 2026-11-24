import { generateJSON } from "@tiptap/html";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { sanitizePastedHtml } from "./sanitize";
import { createBaseExtensions } from "./schema";

type JsonDoc = Record<string, unknown>;

export interface ClipboardPayload {
  html?: string;
  text?: string;
}

export interface ParsedPaste {
  json: JsonDoc;
  source: "html" | "markdown" | "text";
}

function isDocument(value: unknown): value is JsonDoc {
  return Boolean(value && typeof value === "object" && (value as JsonDoc).type === "doc");
}

function hasStructuredHtml(html: string): boolean {
  return /<(h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|blockquote|pre|strong|b|em|i|u|s|del|a|img|math)\b/i.test(html);
}

function looksLikeMarkdown(text: string): boolean {
  return (
    /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\|.*\|)/.test(text) ||
    /\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`/.test(text)
  );
}

/** Converts sanitized HTML into Tiptap JSON using the editor schema. */
export function htmlToTiptapJson(html: string): JsonDoc | null {
  try {
    const clean = sanitizePastedHtml(html);
    if (!clean.trim()) return null;
    const json = generateJSON(clean, [...createBaseExtensions(), Markdown]);
    return isDocument(json) ? json : null;
  } catch {
    return null;
  }
}

/** Converts Markdown (including Markdown pasted from other apps) to Tiptap JSON. */
export function markdownToTiptapJson(markdown: string): JsonDoc | null {
  try {
    const manager = new MarkdownManager({ extensions: [...createBaseExtensions(), Markdown] });
    const json = manager.parse(markdown) as unknown;
    return isDocument(json) ? json : null;
  } catch {
    return null;
  }
}

export function plainTextToTiptapJson(text: string): JsonDoc {
  const blocks = text.split(/\n{2,}/).filter(Boolean).map((block) => {
    const lines = block.split("\n");
    const content = lines.flatMap((line, index) => {
      const nodes: JsonDoc[] = [{ type: "text", text: line }];
      if (index < lines.length - 1) nodes.push({ type: "hardBreak" });
      return nodes;
    });
    return { type: "paragraph", content };
  });

  return { type: "doc", content: blocks.length > 0 ? blocks : [{ type: "paragraph" }] };
}

/** Inspects both clipboard formats and returns the richest safe representation. */
export function parseClipboardContent({ html, text }: ClipboardPayload): ParsedPaste | null {
  if (html && hasStructuredHtml(html)) {
    const fromHtml = htmlToTiptapJson(html);
    if (fromHtml) return { json: fromHtml, source: "html" };
  }
  if (text && text.trim()) {
    if (looksLikeMarkdown(text)) {
      const fromMarkdown = markdownToTiptapJson(text);
      if (fromMarkdown) return { json: fromMarkdown, source: "markdown" };
    }
    return { json: plainTextToTiptapJson(text), source: "text" };
  }
  return null;
}
