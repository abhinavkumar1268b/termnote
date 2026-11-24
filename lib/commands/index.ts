export { autocomplete, closestCommands } from "./autocomplete";
export { CONFIRMATION_FLAG, MAX_HISTORY_ENTRIES, NAMESPACES } from "./constants";
export { CommandParseError, COMMAND_ERROR_CODES } from "./errors";
export type { CommandErrorCode } from "./errors";
export { executeCommand } from "./executor";
export { CommandHistory } from "./history";
export { lex } from "./lexer";
export { parseCommand } from "./parser";
export { getCommand, listCommands } from "./registry";
export { getCommandServices, setCommandServices } from "./services";
export type {
  CommandDefinition,
  CommandErrorShape,
  CommandResult,
  FlagValue,
  ParsedCommand,
  Suggestion,
} from "./types";
export { validateCommand } from "./validator";
