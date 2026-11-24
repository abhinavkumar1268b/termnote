import { Download, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataErrorState, SetupNotice } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { StorageUsage } from "@/features/dashboard/components/storage-usage";
import { SettingsRow, SettingsSection } from "@/features/settings/components/settings-section";
import { getWorkspaceSummary } from "@/lib/data/queries";
import { getSessionUser } from "@/lib/data/session";
import type { WorkspaceStatus } from "@/types/domain";

export const metadata = { title: "Settings — TermNote" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, summary] = await Promise.all([getSessionUser(), getWorkspaceSummary()]);
  const error = session.error ?? summary.error;
  const status: WorkspaceStatus | null = summary.data
    ? {
        label: "Workspace ready",
        detail: "Private storage · RLS enforced",
        storageUsedBytes: summary.data.storageUsedBytes,
        storageLimitBytes: summary.data.storageLimitBytes,
      }
    : null;

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Workspace and account details." />
      {error ? (
        error.includes("not configured") ? <SetupNotice /> : <DataErrorState message={error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <SettingsSection title="Profile" meta="from Supabase Auth">
              <SettingsRow label="Name">{session.data?.name ?? "—"}</SettingsRow>
              <SettingsRow label="Email">{session.data?.email ?? "—"}</SettingsRow>
              <SettingsRow label="Role"><Badge variant="accent">{session.data?.role ?? "—"}</Badge></SettingsRow>
            </SettingsSection>

            <SettingsSection title="Workspace" meta="private">
              <SettingsRow label="Name">{session.data?.workspaceName ?? "—"}</SettingsRow>
              <SettingsRow label="Owner">{session.data?.email ?? "—"}</SettingsRow>
              <SettingsRow label="Access">Owner only (RLS)</SettingsRow>
            </SettingsSection>

            <SettingsSection title="Appearance" meta="fixed in this build">
              <SettingsRow label="Theme"><Badge>Cyber Blue</Badge></SettingsRow>
              <SettingsRow label="Content font"><span className="font-sans">Inter</span></SettingsRow>
              <SettingsRow label="Terminal font"><span className="font-mono">JetBrains Mono</span></SettingsRow>
            </SettingsSection>
          </div>

          <div className="space-y-6">
            {status ? <StorageUsage status={status} /> : null}

            <SettingsSection title="Privacy and security" meta="server enforced">
              <SettingsRow label="Row-level security">
                <span className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-term-accent" aria-hidden="true" /> Enabled on all tables</span>
              </SettingsRow>
              <SettingsRow label="File storage">
                <span className="flex items-center gap-2"><LockKeyhole className="size-3.5 text-term-accent" aria-hidden="true" /> Private bucket</span>
              </SettingsRow>
              <SettingsRow label="Service role key">Never exposed to the client</SettingsRow>
            </SettingsSection>

            <SettingsSection title="Data controls" meta="individual notes only">
              <SettingsRow label="Export note">
                <Link href="/notes">
                  <Button size="sm" tabIndex={-1}>
                    <Download className="size-3.5" aria-hidden="true" /> Open notes
                  </Button>
                </Link>
              </SettingsRow>
              <SettingsRow label="Workspace deletion">
                <span className="text-xs text-term-muted">Not offered — workspaces are private and individual.</span>
              </SettingsRow>
            </SettingsSection>
          </div>
        </div>
      )}
    </>
  );
}
