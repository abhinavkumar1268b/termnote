import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { VersionTimeline } from "@/features/history/components/version-timeline";
import { getNote, getNoteAccess, listVersions } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function NoteHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [note, versions, access] = await Promise.all([getNote(id), listVersions(id), getNoteAccess(id)]);
  const error = note.error ?? versions.error ?? access.error;

  if (error) {
    if (error.includes("not found")) notFound();
    return error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />;
  }

  return (
    <>
      <nav className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-term-muted" aria-label="Breadcrumb">
        <Link href="/notes" className="hover:text-term-accent">All notes</Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link href={`/notes/${id}`} className="hover:text-term-accent">{note.data?.title ?? "Note"}</Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-term-text">History</span>
      </nav>

      <PageHeader eyebrow="Version history" title="Note history" description="Preserved snapshots for this note." />

      {(versions.data ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-term-border bg-term-surface p-8 text-center text-sm text-term-muted">
          No version snapshots are available yet. Editing a note creates a snapshot automatically.
        </p>
      ) : (
        <VersionTimeline versions={versions.data ?? []} canRestore={access.data === "owner" || access.data === "editor"} />
      )}
    </>
  );
}
