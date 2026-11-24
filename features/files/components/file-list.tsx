"use client";

import { File, FileArchive, FileImage, FileSpreadsheet, FileText, Search, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/lib/format";
import type { FileKind, StoredFile } from "@/types/domain";
import { FileRowActions } from "./file-row-actions";

const kindIcons: Record<FileKind, typeof File> = {
  document: FileText,
  image: FileImage,
  spreadsheet: FileSpreadsheet,
  archive: FileArchive,
  other: File,
};

export function FileList({
  files,
  searchable = false,
  showFolder = true,
  folderNames,
  actions = false,
  emptyTitle = "No files found",
  emptyDescription = "Files added to this workspace will appear here.",
}: {
  files: StoredFile[];
  searchable?: boolean;
  showFolder?: boolean;
  folderNames?: Record<string, string>;
  actions?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const visible = files.filter((file) => file.name.toLowerCase().includes(normalized));

  return (
    <div>
      {searchable ? (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-term-muted" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter files by name"
            aria-label="Filter files"
            className="pl-9"
          />
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState icon={File} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-term-border bg-term-surface">
          {visible.map((file, index) => {
            const Icon = kindIcons[file.kind];
            return (
              <div
                key={file.id}
                className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? "border-t border-term-border" : ""}`}
              >
                <Icon className="size-4 shrink-0 text-term-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-term-text">{file.name}</p>
                  <p className="mt-0.5 text-[11px] text-term-muted">{file.updatedLabel}</p>
                </div>
                {showFolder ? (
                  <span className="hidden w-28 truncate text-right font-mono text-[10px] text-term-muted md:block">
                    {file.folderId ? (folderNames?.[file.folderId] ?? "Unfiled") : "Unfiled"}
                  </span>
                ) : null}
                <Badge>{file.extension}</Badge>
                <span className="w-20 shrink-0 text-right font-mono text-[10px] text-term-muted">
                  {formatBytes(file.sizeBytes)}
                </span>
                {file.starred ? <Star className="size-3 shrink-0 fill-term-accent text-term-accent" aria-hidden="true" /> : null}
                {actions ? <FileRowActions file={file} /> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
