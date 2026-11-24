import { failure, success } from "../errors";
import { describeNote, getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

function asLimit(value: unknown, fallback = 10): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : fallback;
}

export async function handleNoteList({ parsed }: CommandContext): Promise<CommandResult> {
  const folder = typeof parsed.flags.folder === "string" ? parsed.flags.folder : undefined;
  const notes = await getCommandServices().notes.list(folder, asLimit(parsed.flags.limit));

  return success(
    "note list",
    notes.length === 0
      ? ["No notes found."]
      : [`${notes.length} note(s):`, ...notes.map((note) => `  ${describeNote(note)}`)],
    { notes: notes.map((note) => note.id) },
  );
}

export async function handleNoteFind({ parsed }: CommandContext): Promise<CommandResult> {
  const term = parsed.args[0] ?? "";
  const notes = await getCommandServices().notes.find(term, asLimit(parsed.flags.limit));

  return success(
    "note find",
    notes.length === 0
      ? [`No notes match "${term}".`]
      : [`Matches for "${term}":`, ...notes.map((note) => `  ${describeNote(note)}`)],
    { notes: notes.map((note) => note.id) },
  );
}

export async function handleNoteOpen({ parsed }: CommandContext): Promise<CommandResult> {
  const note = await getCommandServices().notes.get(parsed.args[0] ?? "");
  if (!note) {
    return failure("note open", {
      code: "INVALID_ARGUMENT",
      message: `No note found for "${parsed.args[0]}".`,
      details: ["Use note list to see available note ids.", "Use note find <term> to search."],
    });
  }

  return success("note open", [`Opened "${note.title}".`, `  ${describeNote(note)}`], {
    navigate: `/notes/${note.id}`,
  });
}

export async function handleNoteStar({ parsed }: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.setStar("note", parsed.args[0] ?? "", true);
  if (!result.ok) return failure("note star", { code: "HANDLER_ERROR", message: result.message });
  return success("note star", [`Note ${parsed.args[0]} is starred.`], { starred: true });
}

export async function handleNoteUnstar({ parsed }: CommandContext): Promise<CommandResult> {
  const result = await getCommandServices().mutations.setStar("note", parsed.args[0] ?? "", false);
  if (!result.ok) return failure("note unstar", { code: "HANDLER_ERROR", message: result.message });
  return success("note unstar", [`Note ${parsed.args[0]} was unstarred.`], { starred: false });
}

export async function handleNoteHistory({ parsed }: CommandContext): Promise<CommandResult> {
  const note = await getCommandServices().notes.get(parsed.args[0] ?? "");
  if (!note) {
    return failure("note history", {
      code: "INVALID_ARGUMENT",
      message: `No note found for "${parsed.args[0]}".`,
    });
  }

  const versions = await getCommandServices().notes.versions(note.id);
  return success("note history", [
    `${versions.length} version(s) for "${note.title}":`,
    ...versions.map((version) => `  ${version.label} — ${version.summary} (${version.createdLabel})`),
  ], { navigate: `/notes/${note.id}/history` });
}
