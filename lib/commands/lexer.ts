import { CommandParseError } from "./errors";
import type { LexToken } from "./types";

const WHITESPACE = /\s/;

/**
 * Splits command input into words, flags and quoted strings.
 * Quotes may be single or double; a backslash escapes the next character.
 */
export function lex(input: string): LexToken[] {
  const tokens: LexToken[] = [];
  let index = 0;

  while (index < input.length) {
    if (WHITESPACE.test(input[index])) {
      index += 1;
      continue;
    }

    const start = index;
    const current = input[index];

    if (current === '"' || current === "'") {
      const quote = current;
      index += 1;
      let value = "";
      let closed = false;

      while (index < input.length) {
        const character = input[index];
        if (character === "\\" && index + 1 < input.length) {
          value += input[index + 1];
          index += 2;
          continue;
        }
        if (character === quote) {
          index += 1;
          closed = true;
          break;
        }
        value += character;
        index += 1;
      }

      if (!closed) {
        throw new CommandParseError(
          "INVALID_ARGUMENT",
          `Unterminated quote at position ${start}.`,
          ["Close the quote or remove it."],
        );
      }

      tokens.push({ type: "quoted", value, position: start });
      continue;
    }

    let value = "";
    while (index < input.length && !WHITESPACE.test(input[index])) {
      if (input[index] === "\\" && index + 1 < input.length && /[\s"']/.test(input[index + 1])) {
        value += input[index + 1];
        index += 2;
        continue;
      }
      value += input[index];
      index += 1;
    }

    tokens.push({ type: value.startsWith("--") ? "flag" : "word", value, position: start });
  }

  return tokens;
}
