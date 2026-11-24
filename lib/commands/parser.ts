import { isNamespace } from "./constants";
import { CommandParseError } from "./errors";
import { lex } from "./lexer";
import type { FlagValue, ParsedCommand } from "./types";

/** Converts tokens into a structured command. No execution happens here. */
export function parseCommand(input: string): ParsedCommand {
  const tokens = lex(input);
  if (tokens.length === 0) {
    throw new CommandParseError("EMPTY_COMMAND", "Enter a command.");
  }

  const first = tokens[0].value;
  let namespace: string | null = null;
  let action: string;
  let name: string;
  let rest;

  if (isNamespace(first)) {
    const second = tokens[1];
    if (!second || second.type === "flag") {
      throw new CommandParseError(
        "MISSING_ARGUMENT",
        `Missing action for namespace "${first}".`,
        ["Run help to see available actions."],
      );
    }
    namespace = first;
    action = second.value;
    name = `${first} ${action}`;
    rest = tokens.slice(2);
  } else {
    action = first;
    name = first;
    rest = tokens.slice(1);
  }

  const args: string[] = [];
  const flags: Record<string, FlagValue> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token.value.startsWith("--")) {
      const raw = token.value.slice(2);
      const equals = raw.indexOf("=");
      const flagName = equals === -1 ? raw : raw.slice(0, equals);

      if (!flagName) {
        throw new CommandParseError("INVALID_ARGUMENT", "Flag name cannot be empty.");
      }

      if (equals !== -1) {
        flags[flagName] = raw.slice(equals + 1);
      } else {
        const next = rest[index + 1];
        if (next && !next.value.startsWith("--")) {
          flags[flagName] = next.value;
          index += 1;
        } else {
          flags[flagName] = true;
        }
      }
      continue;
    }

    args.push(token.value);
  }

  return { name, namespace, action, args, flags, raw: input };
}
