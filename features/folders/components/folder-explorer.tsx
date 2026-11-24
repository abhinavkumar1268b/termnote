"use client";

import { ChevronDown, ChevronRight, FilePlus2, FileText, Folder, FolderOpen, FolderPlus, MoveRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createFolderAction,
  deleteFolderAction,
  moveFolderAction,
  renameFolderAction,
} from "@/app/library-actions";
import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileList } from "@/features/files/components/file-list";
import { NoteList } from "@/features/notes/components/note-list";
import { buildFolderTree } from "@/lib/folders/tree";
import { cn } from "@/lib/utils";
import type { Folder as FolderRecord, Note, StoredFile } from "@/types/domain";

type TreeNode = ReturnType<typeof buildFolderTree<FolderRecord>>[number];

function TreeRow({
  node,
  depth,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.folder.id);
  const isSelected = selectedId === node.folder.id;
  const Icon = isOpen && hasChildren ? FolderOpen : Folder;

  return (
    <li>
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors",
          isSelected ? "bg-term-accent/10 text-term-accent" : "text-term-muted hover:bg-term-elevated hover:text-term-text",
        )}
        style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
      >
        {hasChildren ? (
          <button type="button" onClick={() => onToggle(node.folder.id)} className="shrink-0 text-term-muted hover:text-term-text" aria-label={isOpen ? `Collapse ${node.folder.name}` : `Expand ${node.folder.name}`}>
            {isOpen ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
          </button>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <button type="button" onClick={() => onSelect(node.folder.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{node.folder.name}</span>
        </button>
        <span className="font-mono text-[10px] text-term-muted/70">{node.folder.noteCount}</span>
      </div>
      {hasChildren && isOpen ? (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeRow key={child.folder.id} node={child} depth={depth + 1} expanded={expanded} selectedId={selectedId} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FolderExplorer({
  folders,
  notes,
  files = [],
}: {
  folders: FolderRecord[];
  notes: Note[];
  files?: StoredFile[];
}) {
  const router = useRouter();
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.filter((folder) => folder.parentId === null).map((folder) => folder.id)));
  const [selectedId, setSelectedId] = useState(folders[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedFolder = folders.find((folder) => folder.id === selectedId);
  const folderNotes = notes.filter((note) => note.folderId === selectedId);
  const folderFiles = files.filter((file) => file.folderId === selectedId);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(action: () => Promise<{ ok: boolean; code?: string; message?: string }>, successMessage: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "Action failed.");
        return;
      }
      setNotice(successMessage);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const name = window.prompt("New folder name");
    if (!name) return;
    await run(() => createFolderAction({ name, parentId: selectedId || null }), "Folder created.");
  }

  async function rename() {
    if (!selectedFolder) return;
    const name = window.prompt("New folder name", selectedFolder.name);
    if (!name) return;
    await run(() => renameFolderAction({ id: selectedFolder.id, name }), "Folder renamed.");
  }

  async function move() {
    if (!selectedFolder) return;
    const destination = window.prompt("Move to folder id (or type root)", selectedFolder.parentId ?? "root");
    if (!destination) return;
    await run(() => moveFolderAction({ id: selectedFolder.id, parentId: destination }), "Folder moved.");
  }

  async function remove() {
    if (!selectedFolder) return;
    const first = await deleteFolderAction({ id: selectedFolder.id });
    if (first.ok) {
      setError(null);
      setNotice("Folder moved to trash.");
      router.refresh();
      return;
    }
    if (first.code === "CONFLICT") {
      const details = first as { details?: string[] };
      const include = window.confirm(`${first.message}\n${(details.details ?? []).join("\n")}\n\nMove all of them to trash too?`);
      if (include) await run(() => deleteFolderAction({ id: selectedFolder.id, includeContents: true }), "Folder and contents moved to trash.");
      else setError(first.message);
      return;
    }
    setError(first.message);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Folder tree</CardTitle>
          <CardMeta>{folders.length} folders</CardMeta>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => void create()} disabled={busy}><FolderPlus className="size-3.5" aria-hidden="true" /> New</Button>
            <Button size="sm" onClick={() => void rename()} disabled={busy || !selectedFolder}><Pencil className="size-3.5" aria-hidden="true" /> Rename</Button>
            <Button size="sm" onClick={() => void move()} disabled={busy || !selectedFolder}><MoveRight className="size-3.5" aria-hidden="true" /> Move</Button>
            <Button size="sm" variant="danger" onClick={() => void remove()} disabled={busy || !selectedFolder}><Trash2 className="size-3.5" aria-hidden="true" /> Trash</Button>
          </div>
          {error ? <p role="alert" className="mb-3 rounded border border-term-error/30 px-2 py-1.5 text-xs text-term-error">{error}</p> : null}
          {notice ? <p className="mb-3 rounded border border-term-border px-2 py-1.5 text-xs text-term-text">{notice}</p> : null}
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <TreeRow key={node.folder.id} node={node} depth={0} expanded={expanded} selectedId={selectedId} onToggle={toggle} onSelect={setSelectedId} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="size-4 text-term-accent" aria-hidden="true" />
            {selectedFolder?.name ?? "Select a folder"}
          </CardTitle>
          <CardMeta className="flex items-center gap-1"><FileText className="size-3" aria-hidden="true" /> {folderNotes.length} notes · {folderFiles.length} files</CardMeta>
        </CardHeader>
        <CardContent className="space-y-6">
          <NoteList notes={folderNotes} showFolder={false} emptyTitle="This folder is empty" emptyDescription="Notes moved into this folder will appear here." />
          {folderFiles.length > 0 ? <FileList files={folderFiles} showFolder={false} /> : null}
          {selectedFolder ? (
            <p className="flex items-center gap-1.5 font-mono text-[10px] text-term-muted"><FolderOpen className="size-3" aria-hidden="true" /> Folder id: {selectedFolder.id}</p>
          ) : (
            <p className="flex items-center gap-1.5 font-mono text-[10px] text-term-muted"><FilePlus2 className="size-3" aria-hidden="true" /> Create a folder to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

