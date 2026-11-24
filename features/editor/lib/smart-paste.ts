import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { parseClipboardContent } from "./paste";

/** Handles paste in the editor without ever inserting raw clipboard HTML. */
export const SmartPaste = Extension.create({
  name: "smartPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = (event as ClipboardEvent).clipboardData;
            if (!clipboard) return false;

            const parsed = parseClipboardContent({
              html: clipboard.getData("text/html"),
              text: clipboard.getData("text/plain"),
            });
            if (!parsed) return false;

            this.editor.commands.insertContent(parsed.json);
            return true;
          },
        },
      }),
    ];
  },
});
