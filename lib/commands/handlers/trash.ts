import { failure, success } from "../errors";
import { getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

export async function handleTrashList(): Promise<CommandResult> {
  const items = await getCommandServices().trash.list();
  return success("trash list", [
    `${items.length} item(s) in trash (soft-deleted):`,
    ...items.map((item) => `  ${item.id}  ${item.kind}  ${item.name}  ${item.deletedLabel}`),
  ], { navigate: "/trash" });
}

export async function handleTrashRestore({ parsed }: CommandContext): Promise<CommandResult> {
  const item = await getCommandServices().trash.get(parsed.args[0] ?? "");
  if (!item) return success("trash restore", [`"${parsed.args[0]}" is not in the trash.`]);

  const mutations = getCommandServices().mutations;
  const result =
    item.kind === "note"
      ? await mutations.restoreNote(item.id)
      : item.kind === "folder"
        ? await mutations.restoreFolder(item.id)
        : await mutations.restoreFile(item.id);

  return result.ok
    ? success("trash restore", [`Restored "${item.name}".`], { navigate: `/${item.kind === "note" ? "notes" : item.kind === "folder" ? "folders" : "files"}` })
    : failure("trash restore", { code: "HANDLER_ERROR", message: result.message });
}

/** Destructive: the executor blocks this until --yes is supplied. */
export async function handleTrashPurge({ parsed }: CommandContext): Promise<CommandResult> {
  const item = await getCommandServices().trash.get(parsed.args[0] ?? "");
  if (!item) return success("trash purge", [`"${parsed.args[0]}" is not in the trash.`]);

  const result = await getCommandServices().mutations.purge(item.kind, item.id, true, parsed.flags["with-contents"] === true);
  return result.ok
    ? success("trash purge", [`Permanently deleted "${item.name}".`])
    : failure("trash purge", { code: "HANDLER_ERROR", message: result.message, details: result.details });
}
