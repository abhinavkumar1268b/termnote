"use client";

import { ChevronRight, FileText, Search, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { Note } from "@/types/domain";
import { NoteRowActions } from "./note-row-actions";

interface NoteListProps {
  notes: Note[];
  searchable?: boolean;
  showFolder?: boolean;
  folderNames?: Record<string, string>;
  actions?: boolean;
  limit?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function NoteList({
  notes,
  searchable = false,
  showFolder = true,
  folderNames,
  actions = false,
  limit,
  emptyTitle = "No notes yet",
  emptyDescription = "Notes created in this workspace will appear here.",
}: NoteListProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const visible = notes
    .filter((note) => {
      if (!normalized) return true;
      return (
        note.title.toLowerCase().includes(normalized) ||
        note.excerpt.toLowerCase().includes(normalized) ||
        note.tags.some((tag) => tag.toLowerCase().includes(normalized))
      );
    })
    .slice(0, limit);

  return (
    <div>
      {searchable ? (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-term-muted" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter notes by title or tag" aria-label="Filter notes" className="pl-9" />
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-term-border bg-term-surface">
          {visible.map((note, index) => (
            <div key={note.id} className={`flex items-center gap-2 px-4 py-3 transition-colors hover:bg-term-elevated ${index > 0 ? "border-t border-term-border" : ""}`}>
              <Link href={`/notes/${note.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <FileText className="size-4 shrink-0 text-term-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-term-text">{note.title}</span>
                    {note.starred ? <Star className="size-3 shrink-0 fill-term-accent text-term-accent" aria-hidden="true" /> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-term-muted">{note.excerpt}</p>
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  {note.tags.slice(0, 2).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                </div>
                {showFolder ? (
                  <span className="hidden w-28 truncate text-right font-mono text-[10px] text-term-muted lg:block">
                    {note.folderId ? (folderNames?.[note.folderId] ?? "Unfiled") : "Unfiled"}
                  </span>
                ) : null}
                <span className="hidden w-20 shrink-0 text-right font-mono text-[10px] text-term-muted sm:block">{note.updatedLabel}</span>
                <ChevronRight className="size-3.5 shrink-0 text-term-muted" aria-hidden="true" />
              </Link>
              {actions ? <NoteRowActions note={note} /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
