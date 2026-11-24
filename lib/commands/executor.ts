import { closestCommands } from "./autocomplete";
import { CONFIRMATION_FLAG } from "./constants";
import { confirmationRequired, failure, fromError } from "./errors";
import { parseCommand } from "./parser";
import { getCommand } from "./registry";
import { validateCommand } from "./validator";
import type { CommandResult } from "./types";

/**
 * The single entry point for running a command. It parses, validates and
 * dispatches to a registered handler. It never invokes a shell or OS process.
 */
export async function executeCommand(input: string): Promise<CommandResult> {
  try {
    const parsed = parseCommand(input);
    const definition = getCommand(parsed.name);

    if (!definition) {
      const suggestions = closestCommands(parsed.name);
      return failure(parsed.name, {
        code: "UNKNOWN_COMMAND",
        message: `Unknown command "${parsed.name}".`,
        details:
          suggestions.length > 0
            ? [`Did you mean: ${suggestions.join(", ")}?`]
            : ["Run help to list available commands."],
      });
    }

    validateCommand(parsed, definition);

    if (definition.requiresConfirmation && parsed.flags[CONFIRMATION_FLAG] !== true) {
      return confirmationRequired(parsed.name, {
        id: `confirm:${parsed.name}:${parsed.args.join(":")}`,
        command: parsed.raw,
        message: definition.confirmationMessage ?? "This action is destructive.",
        flag: CONFIRMATION_FLAG,
      });
    }

    return await definition.handler({ parsed, definition });
  } catch (error) {
    return fromError(input.trim(), error);
  }
}
