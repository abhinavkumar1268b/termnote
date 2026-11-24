import { failure, success } from "../errors";
import { fromAction } from "./library";
import { describeFile, describeNote, getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

type TargetKind = "note" | "folder" | "file";

interface Target {
  kind: TargetKind;
  id: string;
  label: string;
}

async function resolveTarget(name: string): Promise<Target | null> {
  const services = getCommandServices();
  const note = await services.notes.get(name);
  if (note) return { kind: "note", id: note.id, label: note.title };
  const folder = await services.folders.get(name);
  if (folder) return { kind: "folder", id: folder.id, label: folder.name };
  const file = await services.files.get(name);
  if (file) return { kind: "file", id: file.id, label: file.name };
  return null;
}

function notFound(command: string, name: string): CommandResult {
  return failure(command, {
    code: "INVALID_ARGUMENT",
    message: `No note, folder or file named "${name}" was found.`,
    details: ["Use search <term> or show recent to find the exact name."],
  });
}

export async function handleCreate(context: CommandContext): Promise<CommandResult> {
  const args = context.parsed.args;
  const kind = (args[0] ?? "").toLowerCase();
  const name = args[1] ?? "";
  const parentIndex = args.findIndex((value) => value === "inside" || value === "in");
  const parentName = parentIndex >= 0 ? args.slice(parentIndex + 1).join(" ") : undefined;
  const mutations = getCommandServices().mutations;

  if (kind === "file" || kind === "note") {
    const result = await mutations.createNote(name);
    return fromAction("create", result, `Created "${name}".`);
  }

  if (kind === "folder" || kind === "subfolder") {
    let parentId: string | null = null;
    if (parentName) {
      const parent = await getCommandServices().folders.get(parentName);
      if (!parent) return notFound("create", parentName);
      parentId = parent.id;
    }
    const result = await mutations.createFolder(name, parentId);
    return fromAction("create", result, `Created ${kind === "subfolder" ? "subfolder" : "folder"} "${name}".`);
  }

  return failure("create", {
    code: "INVALID_ARGUMENT",
    message: `Unknown create target "${kind}".`,
    details: ["Supported: create file <name>, create folder <name>, create subfolder <name> inside <folder>."],
  });
}

export async function handleOpen(context: CommandContext): Promise<CommandResult> {
  const args = context.parsed.args;

  if (args[0]?.toLowerCase() === "recent" || args[0]?.toLowerCase() === "last") {
    const notes = await getCommandServices().notes.list(undefined, 5);
    return success("open", [`${notes.length} recent note(s):`, ...notes.map((note) => `  ${describeNote(note)}`)], {
      navigate: "/notes",
    });
  }

  const name = args[0]?.toLowerCase() === "folder" || args[0]?.toLowerCase() === "file"
    ? args.slice(1).join(" ")
    : args.join(" ");
  const target = await resolveTarget(name);
  if (!target) return notFound("open", name);

  const navigate = target.kind === "note"
    ? `/notes/${target.id}`
    : target.kind === "folder" ? "/folders" : "/files";
  return success("open", [`Opened ${target.kind} "${target.label}".`], { navigate, targetId: target.id, targetKind: target.kind });
}

export async function handleRename(context: CommandContext): Promise<CommandResult> {
  const args = context.parsed.args;
  const toIndex = args.findIndex((value) => value.toLowerCase() === "to");
  if (toIndex < 1 || toIndex === args.length - 1) {
    return failure("rename", {
      code: "MISSING_ARGUMENT",
      message: "Use: rename \"current name\" to \"new name\".",
    });
  }
  const name = args.slice(0, toIndex).join(" ");
  const newName = args.slice(toIndex + 1).join(" ");
  const target = await resolveTarget(name);
  if (!target) return notFound("rename", name);
  if (target.kind === "file") {
    return failure("rename", { code: "INVALID_ARGUMENT", message: "Files cannot be renamed from the terminal. Use the Files screen." });
  }

  const result = target.kind === "note"
    ? await getCommandServices().mutations.renameNote(target.id, newName)
    : await getCommandServices().mutations.renameFolder(target.id, newName);
  return fromAction("rename", result, `Renamed "${target.label}" to "${newName}".`);
}

export async function handleMove(context: CommandContext): Promise<CommandResult> {
  const args = context.parsed.args;
  const toIndex = args.findIndex((value) => value.toLowerCase() === "to");
  if (toIndex < 1 || toIndex === args.length - 1) {
    return failure("move", {
      code: "MISSING_ARGUMENT",
      message: "Use: move \"name\" to \"folder\" (or to root).",
    });
  }
  const name = args.slice(0, toIndex).join(" ");
  const destinationName = args.slice(toIndex + 1).join(" ");
  const target = await resolveTarget(name);
  if (!target) return notFound("move", name);

  let destinationId: string | null = null;
  if (destinationName.toLowerCase() !== "root") {
    const destination = await getCommandServices().folders.get(destinationName);
    if (!destination) return notFound("move", destinationName);
    destinationId = destination.id;
  }

  if (target.kind === "file") {
    return failure("move", { code: "INVALID_ARGUMENT", message: "Files cannot be moved from the terminal. Use the Files screen." });
  }
  const result = target.kind === "note"
    ? await getCommandServices().mutations.moveNote(target.id, destinationId)
    : await getCommandServices().mutations.moveFolder(target.id, destinationId);
  return fromAction("move", result, `Moved "${target.label}" to ${destinationId ? destinationName : "root"}.`);
}

export async function handleDelete(context: CommandContext): Promise<CommandResult> {
  const name = context.parsed.args.join(" ");
  const target = await resolveTarget(name);
  if (!target) return notFound("delete", name);

  const result = target.kind === "note"
    ? await getCommandServices().mutations.deleteNote(target.id)
    : target.kind === "folder"
      ? await getCommandServices().mutations.deleteFolder(target.id, context.parsed.flags["with-contents"] === true)
      : await getCommandServices().mutations.deleteFile(target.id);
  return fromAction("delete", result, `Moved ${target.kind} "${target.label}" to trash.`);
}

export async function handleRestore(context: CommandContext): Promise<CommandResult> {
  const name = context.parsed.args.join(" ");
  const item = await getCommandServices().trash.get(name);
  if (!item || !(item as { kind?: string }).kind) return notFound("restore", name);
  const kind = (item as { kind: TargetKind }).kind;
  const result = kind === "note"
    ? await getCommandServices().mutations.restoreNote(item.id)
    : kind === "folder"
      ? await getCommandServices().mutations.restoreFolder(item.id)
      : await getCommandServices().mutations.restoreFile(item.id);
  return fromAction("restore", result, `Restored "${item.name}".`);
}

export async function handleStar(context: CommandContext): Promise<CommandResult> {
  const name = context.parsed.args.join(" ");
  const note = await getCommandServices().notes.get(name);
  if (!note) return notFound("star", name);
  const starred = context.parsed.flags.remove !== true;
  const result = await getCommandServices().mutations.setStar("note", note.id, starred);
  return fromAction("star", result, `${starred ? "Starred" : "Unstarred"} "${note.title}".`);
}

export async function handleSearch(context: CommandContext): Promise<CommandResult> {
  const term = context.parsed.args.join(" ");
  const result = await getCommandServices().mutations.searchNotes(term, 20);
  if (!result.ok) return failure("search", { code: "HANDLER_ERROR", message: result.message });
  return success("search", [
    `${result.data.length} match(es) for "${term}":`,
    ...result.data.map((note) => `  ${note.id}  ${note.title}`),
  ], { notes: result.data.map((note) => note.id), navigate: "/notes" });
}

export async function handleShow(context: CommandContext): Promise<CommandResult> {
  const what = (context.parsed.args[0] ?? "").toLowerCase();
  const services = getCommandServices();

  if (what === "recent" || what === "notes") {
    const notes = await services.notes.list(undefined, 10);
    return success("show", [`${notes.length} note(s):`, ...notes.map((note) => `  ${describeNote(note)}`)], { navigate: "/notes" });
  }
  if (what === "starred") {
    const { notes, files } = await services.starred.list();
    return success("show", [`${notes.length} starred note(s), ${files.length} starred file(s):`, ...notes.map((note) => `  note  ${describeNote(note)}`), ...files.map((file) => `  file  ${describeFile(file)}`)], { navigate: "/starred" });
  }
  if (what === "trash") {
    const items = await services.trash.list();
    return success("show", [`${items.length} item(s) in trash:`, ...items.map((item) => `  ${item.id}  ${item.kind}  ${item.name}`)], { navigate: "/trash" });
  }
  if (what === "files") {
    const files = await services.files.list();
    return success("show", [`${files.length} file(s):`, ...files.map((file) => `  ${describeFile(file)}`)], { navigate: "/files" });
  }
  if (what === "shared") {
    const shares = await services.sharing.list();
    return success("show", [`${shares.length} shared note(s):`, ...shares.map((share) => `  ${share.noteId}  ${share.title}  ${share.email}`)], { navigate: "/shared" });
  }
  if (what === "folders") {
    const folders = await services.folders.list();
    return success("show", [`${folders.length} folder(s):`, ...folders.map((folder) => `  ${folder.id}  ${folder.name}`)], { navigate: "/folders" });
  }

  return failure("show", {
    code: "INVALID_ARGUMENT",
    message: `Unknown view "${what || "(empty)"}".`,
    details: ["Supported: show recent, notes, folders, files, starred, trash, shared."],
  });
}

export function handleUpload(): CommandResult {
  return success("upload", ["Open the file picker to upload to private storage."], { openUpload: true, navigate: "/files" });
}
