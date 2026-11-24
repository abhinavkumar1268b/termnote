import type { ActionResult } from "@/lib/actions/types";
import { failure, success } from "../errors";
import { getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

export function fromAction(command: string, result: ActionResult<unknown>, okLine: string): CommandResult {
  if (!result.ok) {
    const code =
      result.code === "DUPLICATE" || result.code === "INVALID"
        ? "INVALID_ARGUMENT"
        : result.code === "CONFLICT"
          ? "CONFIRMATION_REQUIRED"
          : result.code === "NOT_FOUND"
            ? "INVALID_ARGUMENT"
            : result.code === "FORBIDDEN"
              ? "HANDLER_ERROR"
              : "HANDLER_ERROR";
    return failure(command, { code, message: result.message, details: result.details });
  }
  const data = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : undefined;
  return success(command, [okLine], data);
}

function flagString(context: CommandContext, name: string): string | undefined {
  const value = context.parsed.flags[name];
  return typeof value === "string" ? value : undefined;
}

export async function handleFolderCreate(context: CommandContext): Promise<CommandResult> {
  const parent = flagString(context, "parent") ?? (context.parsed.flags.root === true ? "root" : null);
  const name = context.parsed.args.join(" ");
  const result = await getCommandServices().mutations.createFolder(name, parent);
  return fromAction("folder create", result, `Folder "${name}" created.`);
}

export async function handleFolderRename(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.renameFolder(context.parsed.args[0] ?? "", context.parsed.args.slice(1).join(" "));
  return fromAction("folder rename", result, "Folder renamed.");
}

export async function handleFolderMove(context: CommandContext): Promise<CommandResult> {
  const parent = context.parsed.args[1] === "root" ? null : (context.parsed.args[1] ?? null);
  const result = await getCommandServices().mutations.moveFolder(context.parsed.args[0] ?? "", parent);
  return fromAction("folder move", result, "Folder moved.");
}

export async function handleFolderDelete(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.deleteFolder(
    context.parsed.args[0] ?? "",
    context.parsed.flags["with-contents"] === true,
  );
  return fromAction("folder delete", result, "Folder moved to trash.");
}

export async function handleFolderRestore(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.restoreFolder(context.parsed.args[0] ?? "");
  return fromAction("folder restore", result, "Folder restored.");
}

export async function handleNoteCreate(context: CommandContext): Promise<CommandResult> {
  const folder = flagString(context, "folder") ?? null;
  const title = context.parsed.args.join(" ");
  const result = await getCommandServices().mutations.createNote(title, folder);
  return fromAction("note create", result, `Note "${title}" created.`);
}

export async function handleNoteRename(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.renameNote(context.parsed.args[0] ?? "", context.parsed.args.slice(1).join(" "));
  return fromAction("note rename", result, "Note renamed.");
}

export async function handleNoteMove(context: CommandContext): Promise<CommandResult> {
  const folder = context.parsed.args[1] === "root" ? null : (context.parsed.args[1] ?? null);
  const result = await getCommandServices().mutations.moveNote(context.parsed.args[0] ?? "", folder);
  return fromAction("note move", result, "Note moved.");
}

export async function handleNoteSearch(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.searchNotes(context.parsed.args.join(" "), 20);
  if (!result.ok) return failure("note search", { code: "HANDLER_ERROR", message: result.message });
  return success("note search", [
    `${result.data.length} match(es):`,
    ...result.data.map((note) => `  ${note.id}  ${note.title}`),
  ], { notes: result.data.map((note) => note.id) });
}

export async function handleNoteDelete(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.deleteNote(context.parsed.args[0] ?? "");
  return fromAction("note delete", result, "Note moved to trash.");
}

export async function handleNoteRestore(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.restoreNote(context.parsed.args[0] ?? "");
  return fromAction("note restore", result, "Note restored.");
}

async function resolveFileId(name: string): Promise<string | null> {
  const file = await getCommandServices().files.get(name);
  return file?.id ?? null;
}

export async function handleFileDelete(context: CommandContext): Promise<CommandResult> {
  const id = await resolveFileId(context.parsed.args.join(" "));
  if (!id) return failure("file delete", { code: "INVALID_ARGUMENT", message: `No file named "${context.parsed.args.join(" ")}".` });
  const result = await getCommandServices().mutations.deleteFile(id);
  return fromAction("file delete", result, "File moved to trash.");
}

export async function handleFileRestore(context: CommandContext): Promise<CommandResult> {
  const name = context.parsed.args.join(" ");
  const trashed = await getCommandServices().trash.get(name);
  const id = trashed?.kind === "file" ? trashed.id : await resolveFileId(name);
  if (!id) return failure("file restore", { code: "INVALID_ARGUMENT", message: `No file named "${name}" in trash.` });
  const result = await getCommandServices().mutations.restoreFile(id);
  return fromAction("file restore", result, "File restored.");
}

export async function handleFileUrl(context: CommandContext): Promise<CommandResult> {
  const id = await resolveFileId(context.parsed.args.join(" "));
  if (!id) return failure("file url", { code: "INVALID_ARGUMENT", message: `No file named "${context.parsed.args.join(" ")}".` });
  const result = await getCommandServices().mutations.getFileUrl(id, context.parsed.flags.download === true);
  if (!result.ok) return failure("file url", { code: "HANDLER_ERROR", message: result.message });
  return success("file url", [
    `Preview/download URL for ${result.data.name} (valid for 1 hour).`,
    "Open the file from the Files screen to use it.",
  ], { ...result.data, navigate: "/files" });
}

export async function handleShareRevoke(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.revoke(context.parsed.args[0] ?? "");
  return fromAction("share revoke", result, "Access revoked.");
}

export async function handleShareAccept(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.accept(context.parsed.args.join(" "));
  if (!result.ok) return failure("share accept", { code: "HANDLER_ERROR", message: result.message });
  return success("share accept", ["Invitation accepted."], { navigate: `/notes/${result.data.noteId}` });
}

export async function handleShareAttach(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.attach(context.parsed.args[0] ?? "", context.parsed.args[1] ?? "");
  return fromAction("share attach", result, "File explicitly attached to the note.");
}

export async function handleHistoryRestore(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.restoreVersion(context.parsed.args[0] ?? "", context.parsed.args[1] ?? "");
  if (!result.ok) return failure("history restore", { code: "HANDLER_ERROR", message: result.message });
  return success("history restore", ["Version restored as a new immutable snapshot."], {
    navigate: `/notes/${context.parsed.args[0]}/history`,
    versionId: result.data.versionId,
  });
}

export async function handleTrashEmpty(context: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.emptyTrash(context.parsed.flags.yes === true);
  return fromAction("trash empty", result, "Trash emptied.");
}
