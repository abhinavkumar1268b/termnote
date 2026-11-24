"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArchiveRestore,
  ArrowRight,
  Clock3,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  FolderTree,
  History,
  MoveRight,
  Pencil,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  command?: string;
  run?: boolean;
  href?: string;
  shortcut?: string;
}

const CATEGORIES: ReadonlyArray<{ title: string; items: readonly ActionItem[] }> = [
  {
    title: "CREATE",
    items: [
      { id: "new-note", label: "New Note", description: "Create a note", icon: FilePlus2, command: "create file ", shortcut: "C N" },
      { id: "new-file", label: "New File", description: "Upload a file", icon: Upload, command: "upload file", run: true, shortcut: "C F" },
      { id: "new-folder", label: "New Folder", description: "Create a folder", icon: FolderPlus, command: "create folder " },
      { id: "new-subfolder", label: "New Subfolder", description: "Nest under a folder", icon: FolderTree, command: "create subfolder  inside " },
    ],
  },
  {
    title: "OPEN",
    items: [
      { id: "open-note", label: "Open Note", description: "Open by name", icon: FileText, command: 'open ""' },
      { id: "open-folder", label: "Open Folder", description: "Open by name", icon: Folder, command: 'open folder ""' },
      { id: "open-recent", label: "Open Recent", description: "Latest notes", icon: Clock3, command: "open recent", run: true },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { id: "rename", label: "Rename", description: "Rename a note or folder", icon: Pencil, command: 'rename "" to ""' },
      { id: "move", label: "Move", description: "Move into a folder", icon: MoveRight, command: 'move "" to ""' },
      { id: "star", label: "Star", description: "Star a note", icon: Star, command: 'star ""' },
      { id: "delete", label: "Delete", description: "Move to trash", icon: Trash2, command: 'delete ""' },
      { id: "restore", label: "Restore", description: "Recover from trash", icon: ArchiveRestore, command: 'restore ""' },
    ],
  },
  {
    title: "FILES",
    items: [
      { id: "upload", label: "Upload File", description: "Private storage", icon: Upload, command: "upload file", run: true },
      { id: "browse", label: "Browse Files", description: "List all files", icon: Folder, command: "show files", run: true },
      { id: "download", label: "Download File", description: "Signed URL", icon: ArrowRight, command: "file url " },
    ],
  },
  {
    title: "OTHER",
    items: [
      { id: "search", label: "Search", description: "Find notes", icon: Search, command: 'search ""', shortcut: "/" },
      { id: "starred", label: "View Starred", description: "Pinned items", icon: Star, command: "show starred", run: true },
      { id: "trash", label: "View Trash", description: "Deleted items", icon: Trash2, command: "show trash", run: true },
      { id: "shared", label: "View Shared Notes", description: "Collaborators", icon: Share2, command: "show shared", run: true },
      { id: "history", label: "Note History", description: "Version timeline", icon: History, command: "note history " },
      { id: "settings", label: "Settings", description: "Workspace settings", icon: Settings, href: "/settings" },
    ],
  },
];

export interface ActionLauncherProps {
  setQuery: (value: string) => void;
  run: (value: string) => Promise<void> | void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function ActionLauncher({ setQuery, run, inputRef }: ActionLauncherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return CATEGORIES
      .map((category) => ({
        title: category.title,
        items: category.items.filter((item) =>
          !needle || item.label.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [filter]);

  const flat = useMemo(() => visible.flatMap((category) => [...category.items]), [visible]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (open) filterRef.current?.focus();
  }, [open]);

  function select(item: ActionItem) {
    setOpen(false);
    setFilter("");
    setActiveIndex(0);
    if (item.href) {
      router.push(item.href);
      return;
    }
    if (!item.command) return;
    if (item.run) {
      void run(item.command);
      return;
    }
    setQuery(item.command);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(flat.length, 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + Math.max(flat.length, 1)) % Math.max(flat.length, 1));
      return;
    }
    if (event.key === "Enter" && flat[activeIndex]) {
      event.preventDefault();
      select(flat[activeIndex]);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open action launcher"
        aria-expanded={open}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md border border-term-border bg-term-elevated/60 text-term-muted transition-colors hover:border-term-accent hover:text-term-accent",
          open && "border-term-accent text-term-accent",
        )}
      >
        {open ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[19rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-term-border bg-term-sidebar">
          <div className="border-b border-term-border p-2">
            <div className="flex items-center gap-2 rounded border border-term-border bg-term-bg px-2">
              <Search className="size-3.5 text-term-muted" aria-hidden="true" />
              <input
                ref={filterRef}
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Filter actions..."
                aria-label="Filter actions"
                className="h-8 min-w-0 flex-1 bg-transparent font-mono text-xs text-term-text placeholder:text-term-muted/60 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {flat.length === 0 ? <p className="px-2 py-4 text-center text-xs text-term-muted">No matching actions.</p> : null}
            {visible.map((category) => (
              <div key={category.title} className="mb-2 last:mb-0">
                <p className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-term-muted/70">{category.title}</p>
                {category.items.map((item) => {
                  const currentIndex = flat.indexOf(item);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left",
                        activeIndex === currentIndex ? "bg-term-elevated" : "hover:bg-term-elevated/60",
                      )}
                    >
                      <Icon className="size-3.5 shrink-0 text-term-accent" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-term-text">{item.label}</span>
                        <span className="block truncate text-[10px] text-term-muted">{item.description}</span>
                      </span>
                      {item.shortcut ? <kbd className="rounded border border-term-border px-1 font-mono text-[9px] text-term-muted">{item.shortcut}</kbd> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="border-t border-term-border px-3 py-2 font-mono text-[10px] text-term-muted">↑↓ navigate · Enter select · Esc close</div>
        </div>
      ) : null}
    </div>
  );
}
