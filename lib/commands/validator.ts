import { CommandParseError } from "./errors";
import type { CommandDefinition, ParsedCommand } from "./types";

/** Validates a parsed command against its registry definition. Never executes. */
export function validateCommand(parsed: ParsedCommand, definition: CommandDefinition): void {
  if (!definition.joinArgs && parsed.args.length > definition.args.length) {
    throw new CommandParseError(
      "INVALID_ARGUMENT",
      `Too many arguments for "${definition.id}".`,
      [`Usage: ${definition.usage}`],
    );
  }

  definition.args.forEach((argument, index) => {
    const value = parsed.args[index];
    if (value === undefined) {
      if (argument.required) {
        throw new CommandParseError(
          "MISSING_ARGUMENT",
          `Missing argument <${argument.name}> for "${definition.id}".`,
          [argument.description, `Usage: ${definition.usage}`],
        );
      }
      return;
    }

    if (argument.schema) {
      const result = argument.schema.safeParse(value);
      if (!result.success) {
        throw new CommandParseError(
          "INVALID_ARGUMENT",
          `Invalid value for <${argument.name}>.`,
          [argument.description, result.error.issues[0]?.message ?? "Check the value and try again."],
        );
      }
    }
  });

  const allowedFlags = new Map(definition.flags.map((flag) => [flag.name, flag]));

  for (const [name, value] of Object.entries(parsed.flags)) {
    const flag = allowedFlags.get(name);
    if (!flag) {
      throw new CommandParseError(
        "UNSUPPORTED_FLAG",
        `Unsupported flag --${name} for "${definition.id}".`,
        definition.flags.length > 0
          ? [`Supported flags: ${definition.flags.map((item) => `--${item.name}`).join(", ")}`]
          : ["This command takes no flags."],
      );
    }

    if (flag.type === "boolean") {
      if (value !== true) {
        throw new CommandParseError(
          "INVALID_ARGUMENT",
          `Flag --${name} does not take a value.`,
          [flag.description],
        );
      }
      continue;
    }

    if (value === true || value === "") {
      throw new CommandParseError(
        "MISSING_ARGUMENT",
        `Flag --${name} requires a value.`,
        [flag.description, `Usage: ${definition.usage}`],
      );
    }

    if (flag.schema) {
      const result = flag.schema.safeParse(value);
      if (!result.success) {
        throw new CommandParseError(
          "INVALID_ARGUMENT",
          `Invalid value for --${name}.`,
          [flag.description, result.error.issues[0]?.message ?? "Check the value and try again."],
        );
      }
    }
  }

  for (const flag of definition.flags) {
    if (flag.required && parsed.flags[flag.name] === undefined) {
      throw new CommandParseError(
        "MISSING_ARGUMENT",
        `Missing required flag --${flag.name} for "${definition.id}".`,
        [flag.description, `Usage: ${definition.usage}`],
      );
    }
  }
}
