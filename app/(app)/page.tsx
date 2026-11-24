import { Clock, Files, Folder, Star, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";
import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { CommandReference } from "@/features/dashboard/components/command-reference";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { StorageUsage } from "@/features/dashboard/components/storage-usage";
import { NoteList } from "@/features/notes/components/note-list";
import { getWorkspaceSummary, listNotes } from "@/lib/data/queries";
import type { WorkspaceStatus } from "@/types/domain";

export const metadata = { title: "Overview — TermNote" };
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [summary, notes] = await Promise.all([getWorkspaceSummary(), listNotes({ limit: 5 })]);
  const error = summary.error ?? notes.error;

  if (error) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Workspace overview" />
        {error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />}
      </>
    );
  }

  const data = summary.data;
  const status: WorkspaceStatus = {
    label: "Workspace ready",
    detail: "Private storage · RLS enforced",
    storageUsedBytes: data?.storageUsedBytes ?? 0,
    storageLimitBytes: data?.storageLimitBytes ?? 1,
  };

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Workspace overview"
        description="Your private workspace at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Notes" value={data?.notes ?? 0} hint="in this workspace" icon={FileText} />
        <StatCard label="Folders" value={data?.folders ?? 0} hint="nested hierarchy" icon={Folder} />
        <StatCard label="Files" value={data?.files ?? 0} hint="private storage" icon={Files} />
        <StatCard label="Starred" value={data?.starred ?? 0} hint="notes and files" icon={Star} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent notes</CardTitle>
            <CardMeta>persisted</CardMeta>
          </CardHeader>
          <CardContent>
            <NoteList notes={notes.data ?? []} showFolder={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently updated</CardTitle>
            <CardMeta>by update time</CardMeta>
          </CardHeader>
          <CardContent>
            <NoteList notes={notes.data ?? []} showFolder={false} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CommandReference />
        <StorageUsage status={status} />
      </div>

      <p className="mt-6 flex items-center gap-2 font-mono text-[10px] text-term-muted">
        <Clock className="size-3" aria-hidden="true" /> Data is read from Supabase with row-level security.
      </p>
    </>
  );
}
