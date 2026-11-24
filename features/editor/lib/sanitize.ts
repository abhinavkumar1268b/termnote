import createDOMPurify from "dompurify";

let purifier: ReturnType<typeof createDOMPurify> | undefined;

function getPurifier() {
  if (!purifier) {
    purifier = createDOMPurify(typeof window === "undefined" ? undefined : window);
  }
  return purifier;
}

const ALLOWED_TAGS = [
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "strike", "code", "pre",
  "ul", "ol", "li", "blockquote",
  "a", "img",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "math", "semantics", "annotation", "mrow", "mi", "mn", "mo", "mfrac",
  "msup", "msub", "msqrt", "mtext", "mspace", "mtable", "mtr", "mtd",
];

const ALLOWED_ATTR = [
  "href", "title", "target", "rel", "class", "src", "alt", "start",
  "colspan", "rowspan", "data-attachment", "data-filename", "data-type", "data-language",
];

const ALLOWED_URI = /^(https?:\/\/|mailto:|\/|#|data:image\/(png|jpeg|gif|webp);base64,)/i;

const FORBIDDEN_TAGS = ["script", "style", "iframe", "object", "embed", "link", "meta", "svg", "form", "input", "button"];

/** Structural pass that also works in non-browser DOM implementations. */
function structuralSanitize(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");

  const visit = (element: Element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      const isUri = name === "href" || name === "src";
      if (name.startsWith("on") || name === "style" || (isUri && !ALLOWED_URI.test(value))) {
        element.removeAttribute(attribute.name);
      }
    }

    for (const child of [...element.children]) {
      const tag = child.tagName.toLowerCase();
      if (FORBIDDEN_TAGS.includes(tag)) {
        child.remove();
        continue;
      }
      if (!ALLOWED_TAGS.includes(tag)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      visit(child);
    }
  };

  visit(document.body);
  return document.body.innerHTML;
}

/** Sanitises clipboard HTML before any Tiptap parsing. Never injects raw HTML. */
export function sanitizePastedHtml(html: string): string {
  const result = getPurifier().sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    KEEP_CONTENT: true,
  });
  return structuralSanitize(String(result));
}
