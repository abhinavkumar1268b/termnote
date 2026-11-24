"use client";

import { CornerDownLeft, History, Terminal, X } from "lucide-react";
import { useEffect } from "react";
import { useCommandSession } from "../hooks/use-command-session";
import { cn } from "@/lib/utils";

export function CommandConsole({ panelId = "command-console-panel" }: { panelId?: string }) {
  const {
    query, setQuery, open, setOpen, output, suggestions,
    suggestionIndex, historyEntries, inputRef, acceptSuggestion, onKeyDown,
  } = useCommandSession();

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (inputRef.current?.contains(target)) return;
      if (document.getElementById(panelId)?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [inputRef, panelId, setOpen]);

  return (
    <div className="relative w-full max-w-xl">
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border bg-term-bg px-3 font-mono text-xs transition-colors",
          open ? "border-term-accent" : "border-term-border hover:border-term-accent/40",
        )}
      >
        <Terminal className="size-3.5 shrink-0 text-term-accent" aria-hidden="true" />
        <span className="shrink-0 text-term-accent">$</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="type a command"
          aria-label="Command input"
          role="combobox"
          aria-controls={panelId}
          aria-expanded={open}
          className="min-w-0 flex-1 bg-transparent text-term-text placeholder:text-term-muted/60 focus:outline-none"
        />
        <kbd className="hidden rounded border border-term-border px-1.5 py-0.5 text-[10px] text-term-muted sm:inline">⏎</kbd>
      </div>

      {open ? (
        <div id={panelId} className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-md border border-term-border bg-term-sidebar">
          <div className="flex items-center justify-between border-b border-term-border px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-term-muted">Suggestions & history</span>
            <button type="button" onClick={() => setOpen(false)} className="text-term-muted hover:text-term-text" aria-label="Close command console">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-0 md:grid-cols-2">
            <div className="border-b border-term-border md:border-b-0 md:border-r">
              <ul className="max-h-40 overflow-y-auto p-1.5">
                {suggestions.length === 0 ? (
                  <li className="px-2 py-3 text-xs text-term-muted">No suggestions.</li>
                ) : (
                  suggestions.slice(0, 8).map((suggestion, index) => (
                    <li key={`${suggestion.kind}-${suggestion.value}`}>
                      <button
                        type="button"
                        onClick={() => acceptSuggestion(suggestion)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 rounded px-2 py-1.5 text-left hover:bg-term-elevated",
                          suggestionIndex === index && "bg-term-elevated",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-term-accent">{suggestion.label}</span>
                          <span className="font-mono text-[9px] uppercase text-term-muted/70">{suggestion.hint ?? suggestion.kind}</span>
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
              <ul className="max-h-40 overflow-y-auto p-1.5">
                {historyEntries.length === 0 ? (
                  <li className="px-2 py-3 text-xs text-term-muted">No commands yet.</li>
                ) : (
                  historyEntries.map((item, index) => (
                    <li key={`${item}-${index}`}>
                      <button type="button" onClick={() => setQuery(item)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-xs text-term-muted hover:bg-term-elevated hover:text-term-text">
                        <span className="text-term-border">{String(index + 1).padStart(2, "0")}</span>
                        {item}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto border-t border-term-border bg-term-bg px-3 py-2 font-mono text-[11px]">
            {output.slice(0, 8).map((line) => (
              <p key={line.id} className={cn(
                "whitespace-pre-wrap",
                line.kind === "input" && "text-term-accent",
                line.kind === "success" && "text-term-success",
                line.kind === "error" && "text-term-error",
                (line.kind === "result" || line.kind === "notice") && "text-term-muted",
              )}>{line.text}</p>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-term-border px-3 py-2 font-mono text-[10px] text-term-muted">
            <CornerDownLeft className="size-3" aria-hidden="true" /> Enter run · Tab complete · ↑↓ history · Ctrl+K focus · Esc close
          </div>
        </div>
      ) : null}
    </div>
  );
}
