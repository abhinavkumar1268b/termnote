"use client";

import { MoveRight, Pencil, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteNoteAction, moveNoteAction, renameNoteAction, setStarAction } from "@/app/library-actions";
import type { Note } from "@/types/domain";

export function NoteRowActions({ note }: { note: Note }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) setError(result.message ?? "Action failed.");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const buttonClass = "inline-flex size-7 items-center justify-center rounded text-term-muted hover:bg-term-elevated hover:text-term-text disabled:opacity-40";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {error ? <span role="alert" title={error} className="mr-1 max-w-40 truncate text-[10px] text-term-error">{error}</span> : null}
      <button type="button" disabled={busy} className={buttonClass} title={note.starred ? "Unstar" : "Star"} aria-label={note.starred ? "Unstar note" : "Star note"}
        onClick={() => void run(() => setStarAction({ type: "note", id: note.id, starred: !note.starred }))}>
        <Star className={note.starred ? "size-3.5 fill-term-accent text-term-accent" : "size-3.5"} aria-hidden="true" />
      </button>
      <button type="button" disabled={busy} className={buttonClass} title="Rename" aria-label="Rename note"
        onClick={() => {
          const title = window.prompt("Note title", note.title);
          if (title) void run(() => renameNoteAction({ id: note.id, title }));
        }}>
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button type="button" disabled={busy} className={buttonClass} title="Move" aria-label="Move note"
        onClick={() => {
          const destination = window.prompt("Move to folder id (or root)", note.folderId ?? "root");
          if (destination) void run(() => moveNoteAction({ id: note.id, folderId: destination }));
        }}>
        <MoveRight className="size-3.5" aria-hidden="true" />
      </button>
      <button type="button" disabled={busy} className={buttonClass} title="Move to trash" aria-label="Delete note"
        onClick={() => {
          if (window.confirm(`Move "${note.title}" to trash?`)) void run(() => deleteNoteAction({ id: note.id }));
        }}>
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

