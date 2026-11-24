import { failure, success } from "../errors";
import { getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

const MODES = ["rich", "markdown", "preview"] as const;

export function handleEditorMode({ parsed }: CommandContext): CommandResult {
  const mode = parsed.args[0] ?? "";
  if (!(MODES as readonly string[]).includes(mode)) {
    return failure("editor mode", {
      code: "INVALID_ARGUMENT",
      message: `Unknown editor mode "${mode}".`,
      details: [`Supported modes: ${MODES.join(", ")}`],
    });
  }
  return success("editor mode", [`Editor mode set to ${mode}.`], { editorMode: mode });
}

export async function handleEditorOpen({ parsed }: CommandContext): Promise<CommandResult> {
  const note = await getCommandServices().editor.open(parsed.args[0] ?? "");
  if (!note) {
    return failure("editor open", {
      code: "INVALID_ARGUMENT",
      message: `No note found for "${parsed.args[0]}".`,
    });
  }
  return success("editor open", [`Opened "${note.title}" in the editor.`], { navigate: `/notes/${note.id}` });
}
