import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });
const target = globalThis as unknown as Record<string, unknown>;
const source = window as unknown as Record<string, unknown>;

for (const key of [
  "window",
  "document",
  "DOMParser",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "MutationObserver",
  "navigator",
  "getComputedStyle",
]) {
  if (target[key] === undefined) target[key] = source[key];
}
