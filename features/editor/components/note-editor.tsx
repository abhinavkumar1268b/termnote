"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Download,
  Eye,
  FileCode2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  History,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Pencil,
  Pilcrow,
  Quote,
  Redo2,
  RefreshCw,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SharedNoteRealtime, type RemoteNoteUpdate } from "@/features/sharing/components/shared-note-realtime";
import { SharingPanel } from "@/features/sharing/components/sharing-panel";
import type { Note } from "@/types/domain";
import { useAutosave } from "../hooks/use-autosave";
import { createEditorExtensions } from "../lib/extensions";
import { downloadMarkdown, exportPdf, toMarkdown } from "../lib/markdown";
import { markdownToTiptapJson } from "../lib/paste";
import { JsonPreview } from "./json-preview";

type EditorMode = "rich" | "markdown" | "preview";

const MODES: ReadonlyArray<{ id: EditorMode; label: string; icon: typeof Pencil }> = [
  { id: "rich", label: "Rich text", icon: Pencil },
  { id: "markdown", label: "Markdown", icon: FileCode2 },
  { id: "preview", label: "Preview", icon: Eye },
];

function ToolButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Bold;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-transparent text-term-muted transition-colors hover:bg-term-elevated hover:text-term-text disabled:cursor-not-allowed disabled:opacity-40",
        active && "border-term-accent/30 bg-term-accent/10 text-term-accent",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-term-border" aria-hidden="true" />;
}

function Toolbar({ content }: { content: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-term-border bg-term-elevated/40 px-3 py-2">
      {content}
    </div>
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function StatusLabel({ status, savedAt, message }: { status: string; savedAt: string | null; message: string | null }) {
  const map: Record<string, { icon: typeof Check; text: string; className: string }> = {
    idle: { icon: Check, text: "All changes saved", className: "text-term-success" },
    saved: { icon: Check, text: "Saved", className: "text-term-success" },
    unsaved: { icon: Clock, text: "Unsaved changes", className: "text-term-bright" },
    saving: { icon: RefreshCw, text: "Saving…", className: "text-term-accent" },
    error: { icon: Clock, text: "Save failed — retrying", className: "text-term-error" },
    conflict: { icon: Clock, text: "Newer content exists", className: "text-term-error" },
  };
  const item = map[status] ?? map.idle;
  const Icon = item.icon;

  return (
    <div className="flex flex-col items-end gap-1">
      <p className={cn("flex items-center gap-1.5 font-mono text-[10px]", item.className)}>
        <Icon className="size-3" aria-hidden="true" />
        {item.text}
      </p>
      <p className="font-mono text-[10px] text-term-muted">
        {message ?? (savedAt ? `Last saved ${savedAt.slice(0, 16).replace("T", " ")} UTC` : "Not saved yet")}
      </p>
    </div>
  );
}

export function NoteEditor({
  note,
  folderName,
  canEdit = false,
  canExport = false,
  canManageSharing = false,
  files = [],
}: {
  note: Note;
  folderName?: string;
  canEdit?: boolean;
  canExport?: boolean;
  canManageSharing?: boolean;
  files?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<EditorMode>("rich");
  const [title, setTitle] = useState(note.title);
  const [markdown, setMarkdown] = useState(note.markdown);
  const [exporting, setExporting] = useState(false);
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);

  const extensions = useMemo(() => createEditorExtensions(), []);
  const suppressUpdateRef = useRef(false);
  const titleRef = useRef(title);
  const markdownRef = useRef(markdown);
  const modeRef = useRef(mode);
  titleRef.current = title;
  markdownRef.current = markdown;
  modeRef.current = mode;

  const getPayload = useCallback(() => {
    if (modeRef.current === "markdown") {
      const json = markdownToTiptapJson(markdownRef.current);
      if (!json) return null;
      return { title: titleRef.current, markdown: markdownRef.current, content: json };
    }
    const json = (editorRef.current?.getJSON() ?? note.content) as Record<string, unknown>;
    return { title: titleRef.current, markdown: toMarkdown(json), content: json };
  }, [note.content]);

  const { status, lastSavedAt, message, scheduleSave, saveNow, applyRemote } = useAutosave({
    noteId: note.id,
    initialSavedAt: note.updatedAt,
    enabled: canEdit,
    getPayload,
  });

  const editor = useEditor({
    extensions,
    content: note.content,
    immediatelyRender: false,
    editable: canEdit,
    editorProps: {
      attributes: { class: "tiptap-content", "aria-label": "Note content" },
    },
    onUpdate: () => {
      if (suppressUpdateRef.current) {
        suppressUpdateRef.current = false;
        return;
      }
      scheduleSave();
    },
  });

  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    function onRemote(event: Event) {
      const update = (event as CustomEvent<RemoteNoteUpdate>).detail;
      if (!applyRemote(update.updatedAt)) {
        setRemoteNotice("A newer shared change is available. Save or discard your edits first.");
        return;
      }
      setRemoteNotice("Applied a shared-note update.");
      setTitle(update.title);
      setMarkdown(update.markdown);
      if (update.content && editorRef.current) {
        suppressUpdateRef.current = true;
        editorRef.current.commands.setContent(update.content as Record<string, unknown>, { emitUpdate: false });
      }
    }
    window.addEventListener("termnote:remote-update", onRemote);
    return () => window.removeEventListener("termnote:remote-update", onRemote);
  }, [applyRemote]);

  useEffect(() => {
    function onModeChange(event: Event) {
      const next = (event as CustomEvent<string>).detail;
      if (next === "rich" || next === "markdown" || next === "preview") changeMode(next);
    }
    window.addEventListener("termnote:editor-mode", onModeChange);
    return () => window.removeEventListener("termnote:editor-mode", onModeChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function changeMode(next: EditorMode) {
    if (next === mode) return;
    if (next === "markdown" && editor) {
      setMarkdown(toMarkdown(editor.getJSON() as Record<string, unknown>));
    } else if (mode === "markdown" && editor) {
      const json = markdownToTiptapJson(markdownRef.current);
      if (json) {
        suppressUpdateRef.current = true;
        editor.commands.setContent(json, { emitUpdate: false });
      }
    }
    setMode(next);
  }

  const canFormat = canEdit && mode === "rich" && editor !== null;
  const currentMarkdown = mode === "markdown" ? markdown : editor ? toMarkdown(editor.getJSON() as Record<string, unknown>) : note.markdown;

  async function handlePdf() {
    setExporting(true);
    try {
      await exportPdf(title, currentMarkdown);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <nav className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-term-muted" aria-label="Breadcrumb">
        <Link href="/notes" className="hover:text-term-accent">All notes</Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span>{folderName ?? "Unfiled"}</span>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-term-text">{note.title}</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-term-text">Note editor</h1>
          <p className="mt-1 font-mono text-[10px] text-term-muted">
            Tiptap JSON is canonical · Markdown generated for export and indexing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/notes/${note.id}/history`}>
            <Button size="sm" variant="ghost"><History className="size-3.5" aria-hidden="true" /> History</Button>
          </Link>
          <Button size="sm" disabled={!canExport} onClick={() => downloadMarkdown(title, currentMarkdown)}>
            <FileCode2 className="size-3.5" aria-hidden="true" /> Export MD
          </Button>
          <Button size="sm" disabled={!canExport || exporting} onClick={() => void handlePdf()}>
            <Download className="size-3.5" aria-hidden="true" /> {exporting ? "Exporting…" : "Export PDF"}
          </Button>
          <Button size="sm" variant="primary" disabled={!canEdit || status === "saving"} onClick={() => void saveNow()}>
            <Check className="size-3.5" aria-hidden="true" /> Save
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-term-border px-5 py-4">
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              scheduleSave();
            }}
            readOnly={!canEdit}
            aria-label="Note title"
            className="w-full bg-transparent text-xl font-semibold text-term-text placeholder:text-term-muted/50 focus:outline-none"
            placeholder="Untitled note"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-term-muted">
            <span>{note.wordCount} words</span>
            <span>{canEdit ? "Editable" : "Read only"}</span>
            {note.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-term-border bg-term-surface px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {MODES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeMode(item.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-[11px] transition-colors",
                    mode === item.id ? "bg-term-accent/10 text-term-accent" : "text-term-muted hover:bg-term-elevated hover:text-term-text",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <StatusLabel status={status} savedAt={lastSavedAt} message={message} />
        </div>

        {status === "conflict" ? (
          <div className="flex items-center justify-between gap-3 border-b border-term-error/30 bg-term-error/5 px-5 py-3">
            <p className="text-xs text-term-error">{message}</p>
            <Button size="sm" onClick={() => router.refresh()}><RefreshCw className="size-3.5" aria-hidden="true" /> Reload</Button>
          </div>
        ) : null}

        {mode === "rich" ? (
          <Toolbar
            content={
              <>
                <ToolButton label="Undo" icon={Undo2} disabled={!canFormat || !editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} />
                <ToolButton label="Redo" icon={Redo2} disabled={!canFormat || !editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} />
                <ToolbarDivider />
                <ToolButton label="Paragraph" icon={Pilcrow} disabled={!canFormat} active={editor?.isActive("paragraph")} onClick={() => editor?.chain().focus().setParagraph().run()} />
                <ToolButton label="Heading 1" icon={Heading1} disabled={!canFormat} active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} />
                <ToolButton label="Heading 2" icon={Heading2} disabled={!canFormat} active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
                <ToolButton label="Heading 3" icon={Heading3} disabled={!canFormat} active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
                <ToolbarDivider />
                <ToolButton label="Bold" icon={Bold} disabled={!canFormat} active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} />
                <ToolButton label="Italic" icon={Italic} disabled={!canFormat} active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} />
                <ToolButton label="Underline" icon={UnderlineIcon} disabled={!canFormat} active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
                <ToolButton label="Strike" icon={Strikethrough} disabled={!canFormat} active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} />
                <ToolbarDivider />
                <ToolButton label="Bullet list" icon={List} disabled={!canFormat} active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
                <ToolButton label="Numbered list" icon={ListOrdered} disabled={!canFormat} active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
                <ToolButton label="Blockquote" icon={Quote} disabled={!canFormat} active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
                <ToolbarDivider />
                <ToolButton label="Link" icon={Link2} disabled={!canFormat} active={editor?.isActive("link")} onClick={() => {
                  const value = window.prompt("Link URL (https://)");
                  if (value && isValidHttpUrl(value)) editor?.chain().focus().setLink({ href: value }).run();
                }} />
                <ToolButton label="Attachment" icon={Paperclip} disabled={!canFormat} active={editor?.isActive("attachment")} onClick={() => {
                  const href = window.prompt("Attachment URL (https://)");
                  if (!href || !isValidHttpUrl(href)) return;
                  const filename = window.prompt("Display name") ?? "attachment";
                  editor?.chain().focus().setMark("attachment", { href, filename }).run();
                }} />
                <ToolButton label="Table" icon={Table2} disabled={!canFormat} active={editor?.isActive("table")} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
                <ToolButton label="Image" icon={ImagePlus} disabled={!canFormat} onClick={() => {
                  const src = window.prompt("Image URL (https://)");
                  if (src && isValidHttpUrl(src)) editor?.chain().focus().setImage({ src }).run();
                }} />
                <ToolButton label="Code block" icon={Code2} disabled={!canFormat} active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} />
              </>
            }
          />
        ) : null}

        <div className="p-5 sm:p-6">
          {mode === "rich" ? <EditorContent editor={editor} /> : null}

          {mode === "markdown" ? (
            <Textarea
              value={markdown}
              onChange={(event) => {
                setMarkdown(event.target.value);
                scheduleSave();
              }}
              readOnly={!canEdit}
              aria-label="Markdown source"
              spellCheck={false}
              className="min-h-[52vh] border-0 bg-transparent p-0 font-mono text-xs leading-relaxed focus:border-0"
            />
          ) : null}

          {mode === "preview" ? (
            <div className="min-h-[52vh]">
              <JsonPreview
                content={
                  modeRef.current === "markdown"
                    ? (markdownToTiptapJson(markdown) ?? note.content)
                    : (editor?.getJSON() ?? note.content)
                }
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-term-border px-5 py-3 font-mono text-[10px] text-term-muted">
          <span>{canEdit ? "Autosaves to Supabase · RLS enforced" : "Read-only view · no permission to edit"}</span>
          <span className="flex items-center gap-1"><FileText className="size-3" aria-hidden="true" /> Tiptap JSON canonical</span>
        </div>
      </Card>

      <SharedNoteRealtime noteId={note.id} />

      {remoteNotice ? (
        <p className="mt-3 rounded border border-term-border px-3 py-2 font-mono text-[10px] text-term-muted">{remoteNotice}</p>
      ) : null}

      <div className="mt-6">
        <SharingPanel
          noteId={note.id}
          canManage={canManageSharing}
          canAttach={canEdit}
          files={files}
        />
      </div>
    </>
  );
}

