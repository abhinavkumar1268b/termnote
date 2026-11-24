"use client";

import { FilePlus2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createNoteAction, searchNotesAction } from "@/app/library-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Note } from "@/types/domain";
import { NoteList } from "./note-list";

interface SearchHit {
  id: string;
  title: string;
}

export function NotesManager({ notes, folderNames }: { notes: Note[]; folderNames: Record<string, string> }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    if (!term.trim()) {
      setHits(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await searchNotesAction({ term });
      if (!result.ok) setError(result.message);
      else setHits(result.data);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const title = window.prompt("Note title");
    if (!title) return;
    const folderId = window.prompt("Folder id (blank for Unfiled)", "") ?? "";
    setBusy(true);
    setError(null);
    try {
      const result = await createNoteAction({ title, folderId: folderId || null });
      if (!result.ok) setError(result.message);
      else {
        router.push(`/notes/${result.data.id}`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const visible = hits === null ? notes : notes.filter((note) => hits.some((hit) => hit.id === note.id));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-term-muted" aria-hidden="true" />
          <Input value={term} onChange={(event) => setTerm(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} placeholder="Search note titles on the server" aria-label="Search notes" className="pl-9" />
        </div>
        <Button size="sm" onClick={() => void search()} disabled={busy || !term.trim()}>Search</Button>
        {hits !== null ? <Button size="sm" variant="ghost" onClick={() => { setHits(null); setTerm(""); }}>Clear</Button> : null}
        <Button size="sm" onClick={() => void create()} disabled={busy}><FilePlus2 className="size-3.5" aria-hidden="true" /> New note</Button>
      </div>
      {error ? <p role="alert" className="mb-4 rounded border border-term-error/30 px-3 py-2 text-xs text-term-error">{error}</p> : null}
      {hits !== null && hits.length === 0 ? <p className="mb-4 text-sm text-term-muted">No notes matched “{term}”.</p> : null}
      <NoteList notes={visible} folderNames={folderNames} actions />
    </div>
  );
}

