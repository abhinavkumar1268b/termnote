"use client";

import { Download, Eye, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteFileAction, getFileUrlAction, setStarAction } from "@/app/library-actions";
import type { StoredFile } from "@/types/domain";

const buttonClass = "inline-flex size-7 items-center justify-center rounded text-term-muted hover:bg-term-elevated hover:text-term-text disabled:opacity-40";

export function FileRowActions({ file }: { file: StoredFile }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openUrl(download: boolean) {
    setBusy(true);
    setError(null);
    try {
      const result = await getFileUrlAction({ id: file.id, download });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = result.data.url;
        anchor.download = result.data.name;
        anchor.click();
      } else {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Move "${file.name}" to trash?`)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteFileAction({ id: file.id });
      if (!result.ok) setError(result.message);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const previewable = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain", "text/markdown", "text/csv"].includes(file.mimeType);

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {error ? <span role="alert" title={error} className="mr-1 max-w-40 truncate text-[10px] text-term-error">{error}</span> : null}
      {previewable ? (
        <button type="button" disabled={busy} className={buttonClass} title="Preview" aria-label={`Preview ${file.name}`} onClick={() => void openUrl(false)}>
          <Eye className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
      <button type="button" disabled={busy} className={buttonClass} title="Download" aria-label={`Download ${file.name}`} onClick={() => void openUrl(true)}>
        <Download className="size-3.5" aria-hidden="true" />
      </button>
      <button type="button" disabled={busy} className={buttonClass} title={file.starred ? "Unstar" : "Star"} aria-label="Star file"
        onClick={async () => {
          setBusy(true);
          try {
            const result = await setStarAction({ type: "file", id: file.id, starred: !file.starred });
            if (!result.ok) setError(result.message);
            else router.refresh();
          } finally {
            setBusy(false);
          }
        }}>
        <Star className={file.starred ? "size-3.5 fill-term-accent text-term-accent" : "size-3.5"} aria-hidden="true" />
      </button>
      <button type="button" disabled={busy} className={buttonClass} title="Move to trash" aria-label={`Delete ${file.name}`} onClick={() => void remove()}>
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

