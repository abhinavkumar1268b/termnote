"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { emptyTrashAction, purgeItemAction, restoreFileAction, restoreFolderAction, restoreNoteAction } from "@/app/library-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";
import type { TrashItem } from "@/types/domain";

export function TrashManager({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (!result.ok) setError(result.message ?? "Action failed.");
      else {
        setNotice(success);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function restore(item: TrashItem) {
    const action = item.kind === "note" ? restoreNoteAction : item.kind === "folder" ? restoreFolderAction : restoreFileAction;
    await run(() => action({ id: item.id }), `Restored "${item.name}".`);
  }

  async function purge(item: TrashItem) {
    if (!window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    let includeContents = false;
    if (item.kind === "folder" && window.confirm("Also permanently delete any contents of this folder?")) includeContents = true;
    await run(() => purgeItemAction({ kind: item.kind, id: item.id, confirmed: true, includeContents }), `Deleted "${item.name}" permanently.`);
  }

  async function empty() {
    if (window.confirm("Permanently delete every item in trash? This cannot be undone.") !== true) return;
    if (window.prompt("Type DELETE to confirm") !== "DELETE") return;
    await run(() => emptyTrashAction({ confirmed: true }), "Trash emptied.");
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="danger" disabled={busy || items.length === 0} onClick={() => void empty()}>
          <Trash2 className="size-3.5" aria-hidden="true" /> Empty trash
        </Button>
        {error ? <p role="alert" className="rounded border border-red-500/30 px-3 py-2 text-xs text-red-300">{error}</p> : null}
        {notice ? <p className="rounded border border-term-border px-3 py-2 text-xs text-term-text">{notice}</p> : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recently deleted</CardTitle>
          <CardMeta>{items.length} items</CardMeta>
        </CardHeader>
        <CardContent className="p-0">
          <ul>
            {items.map((item, index) => (
              <li key={`${item.kind}-${item.id}`} className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? "border-t border-term-border" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-term-text">{item.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-term-muted">{item.detail} · {item.deletedLabel}</p>
                </div>
                <Button size="sm" disabled={busy} onClick={() => void restore(item)}><RotateCcw className="size-3.5" aria-hidden="true" /> Restore</Button>
                <Button size="sm" variant="danger" disabled={busy} onClick={() => void purge(item)}><Trash2 className="size-3.5" aria-hidden="true" /> Delete</Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
