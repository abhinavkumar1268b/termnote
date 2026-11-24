import { Mark, mergeAttributes, type Extensions } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Image } from "@tiptap/extension-image";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { StarterKit } from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

/** A download-like link. Kept as a mark so it survives Markdown round-trips. */
export const Attachment = Mark.create({
  name: "attachment",
  inclusive: false,
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => (attributes.href ? { href: attributes.href } : {}),
      },
      filename: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-filename"),
        renderHTML: (attributes) => (attributes.filename ? { "data-filename": attributes.filename } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "a[data-attachment]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-attachment": "true",
        rel: "attachment noopener noreferrer",
      }),
      0,
    ];
  },
});

/** Shared schema for the editor, paste conversion, Markdown and tests. */
export function createBaseExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({ allowBase64: false, HTMLAttributes: { class: "editor-image" } }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
    Mathematics.configure({ katexOptions: { throwOnError: false } }),
    Attachment,
  ];
}
