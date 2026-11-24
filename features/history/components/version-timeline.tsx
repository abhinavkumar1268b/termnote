"use client";

import { Check, ChevronDown, ChevronRight, Clock, History, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreNoteVersionAction } from "@/app/history-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonPreview } from "@/features/editor/components/json-preview";
import type { NoteVersion } from "@/types/domain";

export function VersionTimeline({ versions, canRestore }: { versions: NoteVersion[]; canRestore: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function restore(version: NoteVersion) {
    if (!window.confirm(`Restore ${version.label}? The current state will be kept as a new version.`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await restoreNoteVersionAction({ noteId: version.noteId, versionId: version.id });
      if (!result.ok) setError(result.message);
      else {
        setNotice(`${version.label} restored as a new version.`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="rounded border border-term-error/30 px-3 py-2 text-xs text-term-error">{error}</p> : null}
      {notice ? <p className="rounded border border-term-border px-3 py-2 text-xs text-term-text">{notice}</p> : null}

      {versions.map((version, index) => {
        const isOpen = expanded === version.id;
        return (
          <Card key={version.id} className={index === 0 ? "border-term-accent/40" : undefined}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-term-border bg-term-elevated">
                  {index === 0 ? <Check className="size-3.5 text-term-accent" aria-hidden="true" /> : <History className="size-3.5 text-term-muted" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-term-text">{version.label}</span>
                    {index === 0 ? <Badge variant="accent">current</Badge> : null}
                    <span className="font-mono text-[10px] text-term-muted">{version.title || "Untitled note"}</span>
                  </div>
                  <p className="mt-1 text-xs text-term-muted">{version.summary}</p>
                  <p className="mt-1 font-mono text-[10px] text-term-muted">{version.author} · {version.createdLabel} UTC</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 pl-10 sm:pl-0">
                <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : version.id)}>
                  {isOpen ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
                  Preview
                </Button>
                {canRestore && index !== 0 ? (
                  <Button size="sm" disabled={busy} onClick={() => void restore(version)}>
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Restore
                  </Button>
                ) : null}
              </div>
            </CardContent>
            {isOpen ? (
              <div className="border-t border-term-border bg-term-bg p-5">
                <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] text-term-muted"><Clock className="size-3" aria-hidden="true" /> Historical content · read only</p>
                <JsonPreview content={version.content} />
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

