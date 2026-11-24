"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { uploadFileAction } from "@/app/library-actions";
import { Button } from "@/components/ui/button";
import { FileList } from "@/features/files/components/file-list";
import { cn } from "@/lib/utils";
import type { FileKind, StoredFile } from "@/types/domain";

const FILTERS: ReadonlyArray<{ label: string; value: FileKind | "all" }> = [
  { label: "All", value: "all" },
  { label: "Documents", value: "document" },
  { label: "Images", value: "image" },
  { label: "Sheets", value: "spreadsheet" },
  { label: "Archives", value: "archive" },
];

export function FileManager({
  files,
  folderNames,
  maxUploadBytes,
}: {
  files: StoredFile[];
  folderNames?: Record<string, string>;
  maxUploadBytes: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [filter, setFilter] = useState<FileKind | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = filter === "all" ? files : files.filter((file) => file.kind === filter);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await uploadFileAction(new FormData(event.currentTarget));
      if (!result.ok) setError(result.message);
      else {
        setNotice("File uploaded to private storage.");
        formRef.current?.reset();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form ref={formRef} onSubmit={(event) => void upload(event)} className="mb-5 flex flex-wrap items-end gap-2 rounded-md border border-term-border bg-term-bg p-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="upload-file" className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-term-muted">Upload file</label>
          <input id="upload-file" name="file" type="file" required className="block w-full text-xs text-term-muted file:mr-3 file:rounded file:border-0 file:bg-term-elevated file:px-3 file:py-1.5 file:text-term-text" />
        </div>
        <div className="w-32">
          <label htmlFor="upload-folder" className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-term-muted">Folder id</label>
          <input id="upload-folder" name="folderId" placeholder="optional" className="w-full rounded border border-term-border bg-term-bg px-2 py-1.5 font-mono text-[11px] text-term-text focus:border-term-accent focus:outline-none" />
        </div>
        <Button type="submit" size="sm" disabled={busy}><Upload className="size-3.5" aria-hidden="true" /> {busy ? "Uploading…" : "Upload"}</Button>
        <p className="w-full font-mono text-[10px] text-term-muted">Max {Math.round(maxUploadBytes / 1024 / 1024)} MB · MIME types validated on the server · private bucket</p>
      </form>

      {error ? <p role="alert" className="mb-4 rounded border border-term-error/30 px-3 py-2 text-xs text-term-error">{error}</p> : null}
      {notice ? <p className="mb-4 rounded border border-term-border px-3 py-2 text-xs text-term-text">{notice}</p> : null}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={cn(
            "rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors",
            filter === item.value
              ? "border-term-accent/50 bg-term-accent/10 text-term-accent"
              : "border-term-border bg-term-surface text-term-muted hover:text-term-text",
          )}>
            {item.label}
          </button>
        ))}
      </div>
      <FileList files={visible} folderNames={folderNames} actions />
    </div>
  );
}

