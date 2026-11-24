import type { z } from "zod";
import type { CommandErrorCode } from "./errors";

export type FlagValue = string | boolean;

export interface LexToken {
  type: "word" | "flag" | "quoted";
  value: string;
  position: number;
}

export interface ParsedCommand {
  name: string;
  namespace: string | null;
  action: string;
  args: string[];
  flags: Record<string, FlagValue>;
  raw: string;
}

export interface CommandArgument {
  name: string;
  description: string;
  required?: boolean;
  schema?: z.ZodTypeAny;
  values?: string[];
}

export interface CommandFlag {
  name: string;
  description: string;
  type: "string" | "boolean";
  required?: boolean;
  schema?: z.ZodTypeAny;
  values?: string[];
}

export interface CommandContext {
  parsed: ParsedCommand;
  definition: CommandDefinition;
}

export interface CommandErrorShape {
  code: CommandErrorCode;
  message: string;
  details?: string[];
}

export interface CommandConfirmation {
  id: string;
  command: string;
  message: string;
  flag: string;
}

export interface CommandResult {
  ok: boolean;
  command: string;
  output: string[];
  data?: Record<string, unknown>;
  error?: CommandErrorShape;
  confirmation?: CommandConfirmation;
}

export type CommandHandler = (context: CommandContext) => CommandResult | Promise<CommandResult>;

export interface CommandDefinition {
  id: string;
  namespace: string;
  action: string;
  description: string;
  usage: string;
  /** Ready-to-edit example commands shown by autocomplete. */
  examples?: string[];
  /** Join all remaining arguments into the final argument (for titles/names). */
  joinArgs?: boolean;
  args: CommandArgument[];
  flags: CommandFlag[];
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  handler: CommandHandler;
}

export interface Suggestion {
  value: string;
  label: string;
  description: string;
  insertText: string;
  kind: "command" | "argument" | "flag";
  hint?: string;
}
