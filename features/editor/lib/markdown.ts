import type { JSONContent } from "@tiptap/core";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { createBaseExtensions } from "./schema";

/** Generates Markdown from the canonical Tiptap JSON for export and indexing. */
export function toMarkdown(content: Record<string, unknown>): string {
  const manager = new MarkdownManager({ extensions: [...createBaseExtensions(), Markdown] });
  return manager.serialize(content as unknown as JSONContent);
}

export function safeFileName(title: string, extension: string): string {
  const base = title.trim().replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase();
  return `${base || "untitled-note"}.${extension}`;
}

export function downloadMarkdown(title: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(title, "md");
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Creates a text-faithful PDF. Rich layout fidelity is intentionally out of scope. */
export async function exportPdf(title: string, markdown: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title || "Untitled note", margin, y);
  y += 28;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.replace(/[*_`>#|]/g, "").trimEnd();
    const lines = pdf.splitTextToSize(line || " ", maxWidth) as string[];
    for (const segment of lines) {
      if (y > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(segment, margin, y);
      y += 13;
    }
  }

  pdf.save(safeFileName(title, "pdf"));
}
