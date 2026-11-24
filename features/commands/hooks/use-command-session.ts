"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { autocomplete } from "@/lib/commands/autocomplete";
import { CommandHistory } from "@/lib/commands/history";
import type { CommandResult, Suggestion } from "@/lib/commands/types";

export interface OutputLine {
  id: number;
  text: string;
  kind: "input" | "success" | "error" | "result" | "notice";
  time: string;
}

let lineId = 0;

function makeLine(text: string, kind: OutputLine["kind"]): OutputLine {
  return {
    id: lineId++,
    text,
    kind,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export function useCommandSession() {
  const router = useRouter();
  const [query, setQueryState] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [historyEntries, setHistoryEntries] = useState<readonly string[]>([]);
  const [output, setOutput] = useState<OutputLine[]>([
    makeLine("Secure command engine · no shell access", "notice"),
    makeLine("Type help to see available commands", "notice"),
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef(new CommandHistory(50));
  const draftRef = useRef("");

  const suggestions = useMemo<Suggestion[]>(() => autocomplete(query), [query]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setSuggestionIndex(-1);
    setOpen(true);
  }, []);

  const clearOutput = useCallback(() => setOutput([]), []);

  async function send(command: string): Promise<CommandResult> {
    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      return (await response.json()) as CommandResult;
    } catch {
      return {
        ok: false,
        command,
        output: ["Command API unavailable."],
        error: { code: "HANDLER_ERROR", message: "Could not reach the command API." },
      };
    }
  }

  function applyResult(command: string, result: CommandResult) {
    const lines: OutputLine[] = [makeLine(`> ${command}`, "input")];

    if (result.data?.clear === true) {
      clearOutput();
      setQuery("");
      return;
    }

    const kind = result.ok ? "success" : "error";
    result.output.forEach((line) => lines.push(makeLine(line, kind)));
    setOutput((current) => [...lines, ...current].slice(0, 80));
    setQuery("");

    const editorMode = result.data?.editorMode;
    if (typeof editorMode === "string") {
      window.dispatchEvent(new CustomEvent("termnote:editor-mode", { detail: editorMode }));
    }
    if (result.data?.openUpload === true) {
      window.dispatchEvent(new CustomEvent("termnote:open-upload"));
    }
    const navigate = result.data?.navigate;
    if (typeof navigate === "string") router.push(navigate);
  }

  const run = useCallback(async (value: string) => {
    const command = value.trim();
    if (!command || busy) return;

    historyRef.current.push(command);
    setHistoryEntries(historyRef.current.all());
    setSuggestionIndex(-1);
    setOpen(true);
    setBusy(true);

    try {
      let result = await send(command);
      if (result.error?.code === "CONFIRMATION_REQUIRED") {
        const message = result.confirmation?.message ?? result.error.message;
        if (!window.confirm(message)) {
          setOutput((current) => [makeLine("Cancelled.", "notice"), ...current].slice(0, 80));
          return;
        }
        result = await send(`${command} --yes`);
      }
      applyResult(command, result);
    } finally {
      setBusy(false);
    }
    // applyResult is stable enough for this session; router is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, clearOutput, router, setQuery]);

  const acceptSuggestion = useCallback((suggestion: Suggestion) => {
    setQuery(suggestion.insertText.trimEnd());
    inputRef.current?.focus();
  }, [setQuery]);

  const previousHistory = useCallback(() => {
    if (draftRef.current === "" && query !== "") draftRef.current = query;
    const value = historyRef.current.previous();
    if (value !== null) setQueryState(value);
  }, [query]);

  const nextHistory = useCallback(() => {
    const value = historyRef.current.next();
    setQueryState(value ?? draftRef.current);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
        acceptSuggestion(suggestions[suggestionIndex]);
        return;
      }
      void run(query);
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
  }, [acceptSuggestion, nextHistory, previousHistory, query, run, suggestionIndex, suggestions]);

  return {
    query,
    setQuery,
    open,
    setOpen,
    busy,
    output,
    suggestions,
    suggestionIndex,
    historyEntries,
    inputRef,
    run,
    acceptSuggestion,
    onKeyDown,
    clearOutput,
  };
}
