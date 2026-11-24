import { isNamespace } from "./constants";
import { lex } from "./lexer";
import { getCommand, listCommands } from "./registry";
import type { CommandDefinition, LexToken, Suggestion } from "./types";

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const columns = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 0; row < rows; row += 1) table[row][0] = row;
  for (let column = 0; column < columns; column += 1) table[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      table[row][column] = Math.min(
        table[row - 1][column] + 1,
        table[row][column - 1] + 1,
        table[row - 1][column - 1] + cost,
      );
    }
  }

  return table[a.length][b.length];
}

export function closestCommands(input: string, limit = 3): string[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [];

  return listCommands()
    .map((command) => ({ id: command.id, distance: editDistance(needle, command.id) }))
    .filter((item) => item.distance <= Math.max(2, Math.floor(needle.length / 2)))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((item) => item.id);
}

function commandSuggestion(command: CommandDefinition, insertText?: string): Suggestion {
  return {
    value: command.id,
    label: command.id,
    description: `${command.description} · ${command.usage}`,
    insertText: insertText ?? `${command.id} `,
    kind: "command",
  };
}

function subcommandSuggestions(namespace: string, prefix: string): Suggestion[] {
  return listCommands()
    .filter((command) => command.namespace === namespace && command.id.startsWith(prefix))
    .map((command) => ({
      value: command.id,
      label: command.action,
      description: `${command.description} · ${command.usage}`,
      insertText: `${command.id} `,
      kind: "command" as const,
    }));
}

function flagSuggestions(definition: CommandDefinition, prefix: string, used: Set<string>): Suggestion[] {
  return definition.flags
    .filter((flag) => !used.has(flag.name) && `--${flag.name}`.startsWith(prefix))
    .map((flag) => ({
      value: `--${flag.name}`,
      label: `--${flag.name}`,
      description: `${flag.description} (${flag.type}${flag.required ? ", required" : ""})`,
      insertText: `--${flag.name} `,
      kind: "flag" as const,
    }));
}

function argumentSuggestions(definition: CommandDefinition, index: number, prefix: string): Suggestion[] {
  const argument = definition.args[index];
  if (!argument) return [];

  const values = (argument.values ?? []).filter((value) => value.toLowerCase().startsWith(prefix));
  if (values.length === 0) {
    return [
      {
        value: `<${argument.name}>`,
        label: `<${argument.name}>`,
        description: `<${argument.name}> · ${argument.description}`,
        insertText: `${prefix ? "" : ""}`,
        kind: "argument",
      },
    ];
  }

  return values.map((value) => ({
    value,
    label: value,
    description: `<${argument.name}> · ${argument.description}`,
    insertText: `${value} `,
    kind: "argument" as const,
  }));
}

function usedFlags(tokens: LexToken[]): Set<string> {
  const used = new Set<string>();
  for (const token of tokens) {
    if (token.value.startsWith("--")) used.add(token.value.slice(2).split("=")[0] ?? "");
  }
  return used;
}

function argumentIndex(tokens: LexToken[], definition: CommandDefinition): number {
  let count = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.value.startsWith("--")) {
      const name = token.value.slice(2).split("=")[0] ?? "";
      const flag = definition.flags.find((item) => item.name === name);
      if (flag?.type === "string" && !token.value.includes("=")) {
        const next = tokens[index + 1];
        if (next && !next.value.startsWith("--")) index += 1;
      }
      continue;
    }
    count += 1;
  }
  return count;
}

/** Suggests commands, arguments and flags for a partially typed input. */
export function autocomplete(input: string, limit = 8): Suggestion[] {
  let tokens: LexToken[];
  try {
    tokens = lex(input);
  } catch {
    return [];
  }

  if (tokens.length === 0) {
    return listCommands().slice(0, limit).map((command) => commandSuggestion(command));
  }

  const first = tokens[0].value;

  if (tokens.length === 1) {
    if (first.startsWith("--")) return [];
    if (isNamespace(first)) {
      const suggestions = subcommandSuggestions(first, "");
      if (suggestions.length > 0) return suggestions.slice(0, limit);
    }
    const matches = listCommands()
      .filter((command) => command.id.startsWith(first.toLowerCase()))
      .slice(0, limit)
      .map((command) => commandSuggestion(command));
    if (matches.length > 0) return matches;

    return closestCommands(first, limit).map((id) => {
      const command = getCommand(id);
      return command
        ? { ...commandSuggestion(command), label: `Did you mean ${id}?` }
        : commandSuggestion(listCommands()[0]);
    });
  }

  const commandTokens = isNamespace(first) ? 2 : 1;
  const commandId = tokens.slice(0, commandTokens).map((token) => token.value).join(" ");
  const definition = getCommand(commandId);

  if (!definition) {
    if (isNamespace(first)) {
      const partial = `${first} ${tokens[1].value}`;
      const similar = subcommandSuggestions(first, partial).slice(0, limit);
      if (similar.length > 0) return similar;
      return closestCommands(partial, limit).map((id) => {
        const command = getCommand(id);
        return command ? { ...commandSuggestion(command), label: `Did you mean ${id}?` } : commandSuggestion(listCommands()[0]);
      });
    }
    const partial = tokens.map((token) => token.value).join(" ");
    return closestCommands(partial, limit).map((id) => {
      const command = getCommand(id);
      return command ? { ...commandSuggestion(command), label: `Did you mean ${id}?` } : commandSuggestion(listCommands()[0]);
    });
  }

  const remaining = tokens.slice(commandTokens);
  const trailing = remaining.at(-1);
  const prefix = trailing && !trailing.value.startsWith("--") ? trailing.value.toLowerCase() : "";
  const used = usedFlags(remaining);

  if (trailing?.value.startsWith("--")) {
    return flagSuggestions(definition, trailing.value.toLowerCase(), new Set()).slice(0, limit);
  }

  const previous = remaining.at(-2);
  if (previous?.value.startsWith("--") && !previous.value.includes("=")) {
    const flagName = previous.value.slice(2);
    const flag = definition.flags.find((item) => item.name === flagName);
    if (flag?.type === "string") {
      const flagValues = (flag.values ?? []).filter((value) => value.toLowerCase().startsWith(prefix));
      if (flagValues.length > 0) {
        return flagValues.map((value) => ({
          value,
          label: value,
          description: `${flag.description} · --${flag.name}`,
          insertText: `${value} `,
          kind: "argument" as const,
        })).slice(0, limit);
      }
      if (!flag.values || flag.values.length === 0) {
        return [
          {
            value: `<${flag.name}>`,
            label: `<${flag.name}>`,
            description: `${flag.description} · expected value for --${flag.name}`,
            insertText: "",
            kind: "argument" as const,
          },
        ];
      }
    }
  }

  const index = argumentIndex(remaining, definition);
  if (index < definition.args.length) {
    const suggestions = argumentSuggestions(definition, index, prefix);
    if (suggestions.length > 0 && suggestions[0].kind === "argument" && suggestions[0].value.startsWith("<")) {
      const flags = flagSuggestions(definition, "", used);
      return [...suggestions, ...flags].slice(0, limit);
    }
    return suggestions.slice(0, limit);
  }

  return flagSuggestions(definition, "", used).slice(0, limit);
}
