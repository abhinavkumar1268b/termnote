"use client";

import { CornerDownLeft, History, Terminal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { autocomplete } from "@/lib/commands/autocomplete";
import { CommandHistory } from "@/lib/commands/history";
import type { CommandResult, Suggestion } from "@/lib/commands/types";
import { cn } from "@/lib/utils";

interface OutputLine {
  id: number;
  text: string;
  kind: "input" | "result" | "notice";
}

let lineId = 0;
const makeLine = (text: string, kind: OutputLine["kind"]): OutputLine => ({ id: lineId++, text, kind });

export function CommandConsole() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [historyEntries, setHistoryEntries] = useState<readonly string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [output, setOutput] = useState<OutputLine[]>([
    makeLine("Safe command engine · no shell access", "notice"),
    makeLine("Type help to list commands", "notice"),
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(new CommandHistory(50));
  const draftRef = useRef("");

  const suggestions = useMemo<Suggestion[]>(() => autocomplete(query), [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || inputRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function runCommand(value: string) {
    const command = value.trim();
    if (!command) return;

    historyRef.current.push(command);
    setHistoryEntries(historyRef.current.all());
    setSuggestionIndex(-1);
    setOpen(true);

    let result: CommandResult;

    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      result = (await response.json()) as CommandResult;
    } catch {
      result = {
        ok: false,
        command,
        output: ["Error [HANDLER_ERROR]: Could not reach the command API."],
        error: { code: "HANDLER_ERROR", message: "Command API unavailable." },
      };
    }

    const lines: OutputLine[] = [makeLine(`$ ${command}`, "input")];

    if (result.data?.clear === true) {
      setOutput([]);
      setQuery("");
      return;
    }

    result.output.forEach((line) => lines.push(makeLine(line, result.ok ? "result" : "notice")));
    setOutput((current) => [...lines, ...current].slice(0, 60));
    setQuery("");

    const editorMode = result.data?.editorMode;
    if (typeof editorMode === "string") {
      window.dispatchEvent(new CustomEvent("termnote:editor-mode", { detail: editorMode }));
    }

    const navigate = result.data?.navigate;
    if (typeof navigate === "string") router.push(navigate);
  }

  function acceptSuggestion(suggestion: Suggestion) {
    setQuery(suggestion.insertText.trimEnd());
    setSuggestionIndex(-1);
    setOpen(true);
    inputRef.current?.focus();
  }

  function previousHistory() {
    if (draftRef.current === "" && query !== "") draftRef.current = query;
    const value = historyRef.current.previous();
    if (value !== null) setQuery(value);
  }

  function nextHistory() {
    const value = historyRef.current.next();
    setQuery(value ?? draftRef.current);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
        acceptSuggestion(suggestions[suggestionIndex]);
        return;
      }
      void runCommand(query);
      return;
    }
    if (event.key === "Tab" && suggestions.length > 0) {
      event.preventDefault();
      acceptSuggestion(suggestions[Math.max(suggestionIndex, 0)]);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setSuggestionIndex(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestionIndex < suggestions.length - 1) setSuggestionIndex(suggestionIndex + 1);
      else nextHistory();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestionIndex > 0) setSuggestionIndex(suggestionIndex - 1);
      else if (suggestionIndex === 0) setSuggestionIndex(-1);
      else previousHistory();
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border bg-term-bg px-3 font-mono text-xs",
          open ? "border-term-accent/60" : "border-term-border",
        )}
      >
        <Terminal className="size-3.5 shrink-0 text-term-accent" aria-hidden="true" />
        <span className="shrink-0 text-term-accent">$</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSuggestionIndex(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="type a command"
          aria-label="Command input"
          role="combobox"
          aria-controls="command-console-panel"
          aria-expanded={open}
          className="min-w-0 flex-1 bg-transparent text-term-text placeholder:text-term-muted/50 focus:outline-none"
        />
        <kbd className="hidden rounded border border-term-border px-1.5 py-0.5 text-[10px] text-term-muted sm:inline">
          ⏎ run
        </kbd>
      </div>

      {open ? (
        <div
          ref={panelRef}
          id="command-console-panel"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-md border border-term-border bg-term-surface shadow-none"
        >
          <div className="flex items-center justify-between border-b border-term-border px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-term-muted">
              Parsed locally · validated · no shell access
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-term-muted hover:text-term-text"
              aria-label="Close command console"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            <div className="border-b border-term-border md:border-b-0 md:border-r">
              <p className="border-b border-term-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-term-muted">
                Suggestions
              </p>
              <ul className="max-h-44 overflow-y-auto p-1.5">
                {suggestions.length === 0 ? (
                  <li className="px-2 py-3 text-xs text-term-muted">No matching commands or arguments.</li>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <li key={`${suggestion.kind}-${suggestion.value}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setSuggestionIndex(index)}
                        onClick={() => acceptSuggestion(suggestion)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 rounded px-2 py-1.5 text-left",
                          suggestionIndex === index ? "bg-term-elevated" : "hover:bg-term-elevated",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-term-accent">{suggestion.label}</span>
                          <span className="font-mono text-[9px] uppercase text-term-muted">{suggestion.kind}</span>
                        </span>
                        <span className="truncate text-[11px] text-term-muted">{suggestion.description}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <p className="flex items-center gap-1.5 border-b border-term-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-term-muted">
                <History className="size-3" aria-hidden="true" /> History
              </p>
              <ul className="max-h-44 overflow-y-auto p-1.5">
                {historyEntries.length === 0 ? (
                  <li className="px-2 py-3 text-xs text-term-muted">No commands yet.</li>
                ) : (
                  historyEntries.map((item, index) => (
                    <li key={`${item}-${index}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(item);
                          inputRef.current?.focus();
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-xs text-term-muted hover:bg-term-elevated hover:text-term-text"
                      >
                        <span className="text-term-border">{String(index + 1).padStart(2, "0")}</span>
                        {item}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-term-border">
            <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-term-muted">Output</p>
            <div className="max-h-40 overflow-y-auto bg-term-bg px-3 pb-3 font-mono text-[11px] leading-relaxed">
              {output.length === 0 ? <p className="text-term-muted">—</p> : null}
              {output.map((line) => (
                <p
                  key={line.id}
                  className={cn(
                    "whitespace-pre-wrap",
                    line.kind === "input" && "text-term-accent",
                    line.kind === "result" && "text-term-text",
                    line.kind === "notice" && "text-term-muted",
                  )}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-term-border px-3 py-2 font-mono text-[10px] text-term-muted">
            <CornerDownLeft className="size-3" aria-hidden="true" /> Enter to run · ↑↓ suggestions/history · Tab to complete · Esc to close
          </div>
        </div>
      ) : null}
    </div>
  );
}
