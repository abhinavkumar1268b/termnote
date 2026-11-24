import { failure, success } from "../errors";
import { getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

export async function handleFolderList(): Promise<CommandResult> {
  const folders = await getCommandServices().folders.list();
  return success("folder list", [
    `${folders.length} folder(s):`,
    ...folders.map((folder) => `  ${folder.parentId ? "  " : ""}${folder.name}  (${folder.noteCount} notes)`),
  ], { navigate: "/folders" });
}

export async function handleFolderOpen({ parsed }: CommandContext): Promise<CommandResult> {
  const folder = await getCommandServices().folders.get(parsed.args[0] ?? "");
  if (!folder) {
    return failure("folder open", {
      code: "INVALID_ARGUMENT",
      message: `No folder named "${parsed.args[0]}".`,
      details: ["Use folder list to see available folders."],
    });
  }
  return success("folder open", [`${folder.name} — ${folder.noteCount} note(s).`], { navigate: "/folders" });
}
