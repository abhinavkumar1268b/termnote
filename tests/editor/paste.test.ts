import { describe, expect, it } from "vitest";
import { toMarkdown } from "@/features/editor/lib/markdown";
import { parseClipboardContent, plainTextToTiptapJson } from "@/features/editor/lib/paste";
import { sanitizePastedHtml } from "@/features/editor/lib/sanitize";

const CHATGPT_STYLE_HTML = `
<h1>Release plan</h1>
<p>This is <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com/docs">link</a>.</p>
<h2>Steps</h2>
<ul><li>Freeze migrations</li><li>Check policies</li></ul>
<ol><li>Canary deploy</li><li>Full rollout</li></ol>
<blockquote>Ship only when green.</blockquote>
<table><thead><tr><th>Task</th><th>Owner</th></tr></thead><tbody><tr><td>Review</td><td>Alex</td></tr></tbody></table>
<pre><code class="language-ts">const ready = true;</code></pre>
<p>Math: <math><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></math></p>
`;

function collectTypes(value: unknown, found: string[] = []): string[] {
  if (!value || typeof value !== "object") return found;
  const node = value as { type?: string; marks?: Array<{ type?: string }>; content?: unknown[] };
  if (node.type) found.push(node.type);
  for (const mark of node.marks ?? []) if (mark.type) found.push(`mark:${mark.type}`);
  for (const child of node.content ?? []) collectTypes(child, found);
  return found;
}

describe("smart paste", () => {
  it("converts ChatGPT-style HTML into structured Tiptap JSON", () => {
    const parsed = parseClipboardContent({ html: CHATGPT_STYLE_HTML });
    expect(parsed?.source).toBe("html");

    const types = collectTypes(parsed?.json);
    expect(types).toContain("heading");
    expect(types).toContain("bulletList");
    expect(types).toContain("orderedList");
    expect(types).toContain("blockquote");
    expect(types).toContain("table");
    expect(types).toContain("codeBlock");
    expect(types).toContain("mark:bold");
    expect(types).toContain("mark:italic");
    expect(types).toContain("mark:link");
  });

  it("strips scripts and unsafe attributes before conversion", () => {
    const dirty = '<p onclick="alert(1)">Safe</p><script>alert(1)</script><img src="javascript:alert(1)">';
    const clean = sanitizePastedHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
  });

  it("accepts Markdown pasted from other applications", () => {
    const parsed = parseClipboardContent({ text: "# Title\n\n- first\n- second\n\n**bold**" });
    expect(parsed?.source).toBe("markdown");
    const types = collectTypes(parsed?.json);
    expect(types).toContain("heading");
    expect(types).toContain("bulletList");
    expect(types).toContain("mark:bold");
  });

  it("falls back to plain text paragraphs and hard breaks", () => {
    const result = parseClipboardContent({ text: "line one\nline two\n\nsecond paragraph" });
    expect(result?.source).toBe("text");
    expect(collectTypes(result?.json)).toContain("hardBreak");
    expect(collectTypes(plainTextToTiptapJson("hello"))).not.toContain("hardBreak");
  });

  it("returns null for empty clipboard data", () => {
    expect(parseClipboardContent({})).toBeNull();
  });
});

describe("Markdown generation", () => {
  it("generates Markdown from canonical JSON", () => {
    const parsed = parseClipboardContent({ html: CHATGPT_STYLE_HTML });
    expect(parsed).not.toBeNull();
    const markdown = toMarkdown(parsed?.json as Record<string, unknown>);
    expect(markdown).toContain("# Release plan");
    expect(markdown).toContain("**bold**");
    expect(markdown).toContain("- Freeze migrations");
  });
});
