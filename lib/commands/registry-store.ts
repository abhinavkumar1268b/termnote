import type { CommandDefinition } from "./types";

const commands = new Map<string, CommandDefinition>();

export function registerCommand(definition: CommandDefinition): void {
  commands.set(definition.id.toLowerCase(), definition);
}

export function getCommand(id: string): CommandDefinition | undefined {
  return commands.get(id.trim().toLowerCase());
}

export function listCommands(): readonly CommandDefinition[] {
  return [...commands.values()];
}

export function commandExists(id: string): boolean {
  return commands.has(id.trim().toLowerCase());
}
