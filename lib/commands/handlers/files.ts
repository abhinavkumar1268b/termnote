import { failure, success } from "../errors";
import { describeFile, getCommandServices } from "../services";
import type { CommandContext, CommandResult } from "../types";

export async function handleFileList({ parsed }: CommandContext): Promise<CommandResult> {
  const kind = typeof parsed.flags.kind === "string" ? parsed.flags.kind : undefined;
  const files = await getCommandServices().files.list(kind);
  const total = files.reduce((sum, file) => sum + file.sizeBytes, 0);

  return success("file list", [
    `${files.length} file(s) · ${(total / 1_000_000).toFixed(1)} MB`,
    ...files.map((file) => `  ${describeFile(file)}`),
    "Files are listed from the private storage metadata table.",
  ], { navigate: "/files" });
}

export async function handleFileInfo({ parsed }: CommandContext): Promise<CommandResult> {
  const file = await getCommandServices().files.get(parsed.args[0] ?? "");
  if (!file) {
    return failure("file info", {
      code: "INVALID_ARGUMENT",
      message: `No file named "${parsed.args[0]}".`,
    });
  }

  return success("file info", [
    `${file.name}`,
    `  type: ${file.extension} (${file.kind})`,
    `  size: ${(file.sizeBytes / 1_000).toFixed(0)} KB`,
    `  updated: ${file.updatedLabel}`,
    "  storage: private",
  ]);
}
