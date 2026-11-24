import { MAX_HISTORY_ENTRIES } from "./constants";

/** In-memory command history with up/down navigation and a bounded size. */
export class CommandHistory {
  private entries: string[];
  private cursor = -1;

  constructor(maxSize = MAX_HISTORY_ENTRIES, initial: string[] = []) {
    this.maxSize = maxSize;
    this.entries = initial.slice(0, maxSize);
  }

  private readonly maxSize: number;

  push(command: string): void {
    const value = command.trim();
    if (!value) return;
    if (this.entries[0] === value) {
      this.resetCursor();
      return;
    }
    this.entries.unshift(value);
    this.entries = this.entries.slice(0, this.maxSize);
    this.resetCursor();
  }

  all(): readonly string[] {
    return this.entries;
  }

  size(): number {
    return this.entries.length;
  }

  previous(): string | null {
    if (this.entries.length === 0) return null;
    this.cursor = Math.min(this.cursor + 1, this.entries.length - 1);
    return this.entries[this.cursor] ?? null;
  }

  next(): string | null {
    if (this.cursor < 0) return null;
    this.cursor -= 1;
    if (this.cursor < 0) return null;
    return this.entries[this.cursor] ?? null;
  }

  resetCursor(): void {
    this.cursor = -1;
  }

  clear(): void {
    this.entries = [];
    this.resetCursor();
  }
}
