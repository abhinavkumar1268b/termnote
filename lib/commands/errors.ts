import type { CommandConfirmation, CommandErrorShape, CommandResult } from "./types";

export const COMMAND_ERROR_CODES = [
  "EMPTY_COMMAND",
  "UNKNOWN_COMMAND",
  "MISSING_ARGUMENT",
  "INVALID_ARGUMENT",
  "UNSUPPORTED_FLAG",
  "VALIDATION_ERROR",
  "CONFIRMATION_REQUIRED",
  "HANDLER_ERROR",
] as const;

export type CommandErrorCode = (typeof COMMAND_ERROR_CODES)[number];

export class CommandParseError extends Error {
  readonly code: CommandErrorCode;
  readonly details: string[];

  constructor(code: CommandErrorCode, message: string, details: string[] = []) {
    super(message);
    this.name = "CommandParseError";
    this.code = code;
    this.details = details;
  }

  toShape(): CommandErrorShape {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export function success(
  command: string,
  output: string[],
  data?: Record<string, unknown>,
): CommandResult {
  return { ok: true, command, output, ...(data ? { data } : {}) };
}

export function failure(
  command: string,
  error: CommandErrorShape,
): CommandResult {
  return { ok: false, command, output: [`Error [${error.code}]: ${error.message}`], error };
}

export function fromError(command: string, error: unknown): CommandResult {
  if (error instanceof CommandParseError) return failure(command, error.toShape());
  if (error instanceof Error) {
    return failure(command, {
      code: "HANDLER_ERROR",
      message: error.message,
    });
  }
  return failure(command, { code: "HANDLER_ERROR", message: "Unexpected command failure." });
}

export function confirmationRequired(
  command: string,
  confirmation: CommandConfirmation,
): CommandResult {
  return {
    ok: false,
    command,
    output: [`Confirmation required: ${confirmation.message}`, `Re-run with --${confirmation.flag} to proceed.`],
    error: { code: "CONFIRMATION_REQUIRED", message: confirmation.message },
    confirmation,
  };
}
