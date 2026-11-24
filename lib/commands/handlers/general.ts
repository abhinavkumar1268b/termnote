import { failure, success } from "../errors";
import { getCommand, listCommands } from "../registry-store";
import { getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

export function handleHelp({ parsed }: CommandContext): CommandResult {
  const target = parsed.args[0];

  if (target) {
    const id = parsed.args[0] && parsed.args[1] ? `${parsed.args[0]} ${parsed.args[1]}` : target;
    const command = getCommand(id) ?? getCommand(target);
    if (!command) {
      return failure("help", {
        code: "UNKNOWN_COMMAND",
        message: `No command named "${target}".`,
        details: ["Run help to list available commands."],
      });
    }

    const args = command.args.length
      ? command.args.map((argument) => `  <${argument.name}> ${argument.required ? "(required)" : "(optional)"} — ${argument.description}`)
      : ["  (none)"];
    const flags = command.flags.length
      ? command.flags.map((flag) => `  --${flag.name} ${flag.type} — ${flag.description}`)
      : ["  (none)"];

    return success("help", [
      `${command.id} — ${command.description}`,
      `Usage: ${command.usage}`,
      "Arguments:",
      ...args,
      "Flags:",
      ...flags,
    ]);
  }

  return success("help", [
    "Available commands:",
    ...listCommands().map((command) => `  ${command.usage.padEnd(34)} ${command.description}`),
    "Use help <command> for argument details.",
  ]);
}

export function handleClear(): CommandResult {
  return success("clear", ["Console cleared."], { clear: true });
}

export async function handleStatus(): Promise<CommandResult> {
  const summary = await getCommandServices().workspace.summary();
  const storage = summary.storage;

  return success("status", [
    `${summary.name} · ${summary.user}`,
    `Notes: ${summary.notes} · Folders: ${summary.folders} · Files: ${summary.files} · Starred: ${summary.starred}`,
    `Storage: ${(storage.storageUsedBytes / 1_000_000_000).toFixed(2)} GB of ${(storage.storageLimitBytes / 1_000_000_000).toFixed(1)} GB (private)`,
    "Data source depends on the active service adapter.",
  ]);
}
