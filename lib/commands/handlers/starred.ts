import { success } from "../errors";
import { describeFile, describeNote, getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

export async function handleStarList(): Promise<CommandResult> {
  const { notes, files } = await getCommandServices().starred.list();
  return success("star list", [
    `${notes.length} starred note(s), ${files.length} starred file(s):`,
    ...notes.map((note) => `  note  ${describeNote(note)}`),
    ...files.map((file) => `  file  ${describeFile(file)}`),
  ], { navigate: "/starred" });
}

export async function handleStarAdd({ parsed }: CommandContext): Promise<CommandResult> {
  const note = await getCommandServices().notes.star(parsed.args[0] ?? "");
  if (!note) return success("star add", [`"${parsed.args[0]}" is not a known note id in this preview.`]);
  return success("star add", [`Starred "${note.title}".`]);
}

export async function handleStarRemove({ parsed }: CommandContext): Promise<CommandResult> {
  const note = await getCommandServices().notes.star(parsed.args[0] ?? "");
  if (!note) return success("star remove", [`"${parsed.args[0]}" is not a known note id in this preview.`]);
  return success("star remove", [`Removed star from "${note.title}".`]);
}
