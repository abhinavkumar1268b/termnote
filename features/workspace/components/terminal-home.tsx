"use client";

import { ArrowUp, Check, Circle, HardDrive, LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { logoutAction } from "@/app/auth-actions";
import { uploadFileAction } from "@/app/library-actions";
import { Avatar } from "@/components/ui/avatar";
import { ActionLauncher } from "@/features/commands/components/action-launcher";
import { useCommandSession } from "@/features/commands/hooks/use-command-session";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/data/session";
import type { WorkspaceStatus } from "@/types/domain";

function formatGb(bytes: number): string {
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

export function TerminalHome({
  user,
  workspaceName,
  status,
}: {
  user: SessionUser | null;
  workspaceName: string;
  status: WorkspaceStatus | null;
}) {
  const router = useRouter();
  const {
    query, setQuery, open, setOpen, busy, output, suggestions,
    suggestionIndex, inputRef, run, acceptSuggestion, onKeyDown,
  } = useCommandSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const panelId = "home-command-panel";

  useEffect(() => {
    function onOpenUpload() {
      fileRef.current?.click();
    }
    window.addEventListener("termnote:open-upload", onOpenUpload);
    return () => window.removeEventListener("termnote:open-upload", onOpenUpload);
  }, []);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await uploadFileAction(new FormData(form));
    if (!result.ok) setUploadError(result.message);
    else {
      setUploadError(null);
      form.reset();
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-term-bg text-term-text">
      <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-term-border px-4 sm:px-6">
        <span className="mr-auto font-mono text-[10px] uppercase tracking-[0.22em] text-term-muted/70">
          TERMNOTE / WORKSPACE
        </span>
        <Link href="/settings" aria-label="Settings" className="inline-flex size-8 items-center justify-center rounded-md text-term-muted hover:bg-term-elevated hover:text-term-accent">
          <Settings2 className="size-4" aria-hidden="true" />
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar initials={user?.initials ?? "--"} className="size-7" />
          <span className="max-w-32 truncate text-xs text-term-text">{user?.name ?? "Not signed in"}</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" aria-label="Sign out" title="Sign out" className="inline-flex size-8 items-center justify-center rounded-md text-term-muted hover:bg-term-elevated hover:text-term-error">
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </form>
        <div className="sm:hidden">
          <Avatar initials={user?.initials ?? "--"} className="size-7" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-3 py-10 sm:px-6">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center sm:mb-10">
            <h1 className="font-mono text-4xl font-bold tracking-[-0.04em] text-term-accent sm:text-6xl">TERMNOTE</h1>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-term-muted sm:text-xs">
              private · command-driven · yours
            </p>
          </div>

          <div className="relative">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border bg-term-surface/70 p-2 transition-colors",
                open ? "border-term-accent" : "border-term-border hover:border-term-accent/40",
              )}
            >
              <ActionLauncher setQuery={setQuery} run={run} inputRef={inputRef} />
              <span className="hidden font-mono text-sm text-term-accent sm:inline">$</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Ask anything or enter a command..."
                aria-label="Command input"
                role="combobox"
                aria-controls={panelId}
                aria-expanded={open}
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-term-text placeholder:text-term-muted/60 focus:outline-none sm:text-base"
              />
              <button
                type="button"
                onClick={() => void run(query)}
                disabled={busy || !query.trim()}
                aria-label="Run command"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-term-accent text-term-bg transition-colors hover:bg-term-bright disabled:opacity-40"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
            </div>

            {open && suggestions.length > 0 ? (
              <div id={panelId} className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 max-h-56 overflow-y-auto rounded-md border border-term-border bg-term-sidebar p-1.5">
                {suggestions.slice(0, 8).map((suggestion, index) => (
                  <button
                    key={`${suggestion.kind}-${suggestion.value}`}
                    type="button"
                    onMouseEnter={() => {}}
                    onClick={() => acceptSuggestion(suggestion)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded px-2 py-1.5 text-left hover:bg-term-elevated",
                      suggestionIndex === index && "bg-term-elevated",
                    )}
                  >
                    <span className="font-mono text-xs text-term-accent">{suggestion.label}</span>
                    <span className="truncate text-[11px] text-term-muted">{suggestion.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 max-h-60 overflow-y-auto rounded-md border border-term-border bg-term-bg/60 p-3 font-mono text-[11px] leading-relaxed">
            {output.length === 0 ? (
              <p className="text-term-muted">No output.</p>
            ) : (
              output.slice(0, 30).map((line) => (
                <p key={line.id} className={cn(
                  "whitespace-pre-wrap break-words",
                  line.kind === "input" && "text-term-accent",
                  line.kind === "success" && "text-term-success",
                  line.kind === "error" && "text-term-error",
                  (line.kind === "result" || line.kind === "notice") && "text-term-text/80",
                )}>
                  <span className="mr-2 text-term-muted/60">{line.time}</span>
                  {line.text}
                </p>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] text-term-muted">
            <span className="flex items-center gap-1.5">
              <Circle className="size-2 fill-term-success text-term-success" aria-hidden="true" />
              {status ? "Connected" : "Setup required"}
            </span>
            <span className="truncate">{workspaceName}</span>
            {status ? (
              <span className="flex items-center gap-1.5">
                <HardDrive className="size-3" aria-hidden="true" />
                {formatGb(status.storageUsedBytes)} / {formatGb(status.storageLimitBytes)}
              </span>
            ) : null}
            <span className="hidden sm:inline">local first · RLS enforced</span>
          </div>

          {uploadError ? <p role="alert" className="mt-3 text-xs text-term-error">{uploadError}</p> : null}
          <form onSubmit={(event) => void onUpload(event)} className="hidden">
            <input ref={fileRef} type="file" name="file" />
          </form>
        </div>
      </main>

      <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-term-border py-3 font-mono text-[10px] text-term-muted">
        <Check className="size-3 text-term-success" aria-hidden="true" />
        {user ? "Authenticated session active" : "Sign in to manage your workspace"}
      </footer>
    </div>
  );
}

