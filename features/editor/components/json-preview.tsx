import type { ReactNode } from "react";

interface PreviewMark {
  type?: string;
  attrs?: Record<string, unknown>;
}

interface PreviewNode {
  type?: string;
  text?: string;
  attrs?: { level?: number; href?: string; src?: string; alt?: string; language?: string; latex?: string };
  marks?: PreviewMark[];
  content?: PreviewNode[];
}

function safeHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

function renderText(node: PreviewNode, key: string): ReactNode {
  let children: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    const href = safeHref(mark.attrs?.href);
    if (mark.type === "bold") children = <strong>{children}</strong>;
    if (mark.type === "italic") children = <em>{children}</em>;
    if (mark.type === "underline") children = <u>{children}</u>;
    if (mark.type === "strike") children = <s>{children}</s>;
    if (mark.type === "code") children = <code className="rounded bg-term-elevated px-1 font-mono text-xs text-term-accent">{children}</code>;
    if (mark.type === "link" && href) {
      children = <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-term-accent underline">{children}</a>;
    }
    if (mark.type === "attachment" && href) {
      children = <a href={href} rel="attachment noopener noreferrer" className="text-term-accent underline">{children}</a>;
    }
  }
  return <span key={key}>{children}</span>;
}

function renderNode(node: PreviewNode, key: string): ReactNode {
  const children = (node.content ?? []).map((child, index) => renderNode(child, `${key}-${index}`));

  switch (node.type) {
    case "doc":
      return <div key={key}>{children}</div>;
    case "paragraph":
      return <p key={key} className="mb-3 leading-relaxed">{children}</p>;
    case "heading": {
      const level = node.attrs?.level ?? 2;
      if (level === 1) return <h1 key={key} className="mb-3 mt-5 text-2xl font-semibold text-term-text">{children}</h1>;
      if (level === 3) return <h3 key={key} className="mb-2 mt-4 text-base font-medium text-term-text">{children}</h3>;
      return <h2 key={key} className="mb-3 mt-5 text-lg font-semibold text-term-text">{children}</h2>;
    }
    case "bulletList":
      return <ul key={key} className="mb-3 list-disc space-y-1 pl-5">{children}</ul>;
    case "orderedList":
      return <ol key={key} className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key} className="mb-3 border-l-2 border-term-accent pl-4 text-term-muted">{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key} className="mb-3 overflow-x-auto rounded-md border border-term-border bg-term-bg p-3 font-mono text-xs text-term-text">
          <code>{children}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} className="my-4 border-term-border" />;
    case "image": {
      const src = safeHref(node.attrs?.src);
      if (!src) return null;
      // Remote URLs come from stored note content; they are not known at build time.
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} src={src} alt={String(node.attrs?.alt ?? "")} className="my-3 max-w-full rounded border border-term-border" />;
    }
    case "table":
      return <table key={key} className="my-4 w-full border-collapse text-xs">{children}</table>;
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableHeader":
      return <th key={key} className="border border-term-border bg-term-elevated px-3 py-2 text-left font-medium">{children}</th>;
    case "tableCell":
      return <td key={key} className="border border-term-border px-3 py-2">{children}</td>;
    case "inlineMath":
    case "blockMath": {
      const latex = String(node.attrs?.latex ?? "");
      return (
        <code key={key} className="font-mono text-xs text-term-accent">
          {node.type === "blockMath" ? `$$\n${latex}\n$$` : `$${latex}$`}
        </code>
      );
    }
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return renderText(node, key);
    default:
      return <span key={key}>{children}</span>;
  }
}

/** Renders stored Tiptap JSON as React elements. No HTML is injected. */
export function JsonPreview({ content }: { content: unknown }) {
  if (!content || typeof content !== "object") return null;
  return <div className="text-sm text-term-text">{renderNode(content as PreviewNode, "root")}</div>;
}
