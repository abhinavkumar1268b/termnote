"use client";

import { Check, Link2, Paperclip, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  attachFileToNoteAction,
  getSharedFileUrlAction,
  inviteCollaboratorAction,
  listCollaboratorsAction,
  listNoteAttachmentsAction,
  revokeShareAction,
} from "@/app/sharing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/input";
import type { Permission } from "@/types/domain";

interface Collaborator {
  id: string;
  email: string;
  permission: Permission;
  expiresAt: string | null;
  accepted: boolean;
}

interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export function SharingPanel({
  noteId,
  canManage,
  canAttach,
  files,
}: {
  noteId: string;
  canManage: boolean;
  canAttach: boolean;
  files: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("viewer");
  const [expires, setExpires] = useState("7");
  const [fileId, setFileId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [people, attached] = await Promise.all([
      listCollaboratorsAction({ noteId }),
      listNoteAttachmentsAction({ noteId }),
    ]);
    if (people.ok) setCollaborators(people.data);
    if (attached.ok) setAttachments(attached.data);
  }, [noteId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await inviteCollaboratorAction({
        noteId,
        email,
        permission,
        expiresInDays: expires ? Number(expires) : undefined,
      });
      if (!result.ok) setError(result.message);
      else {
        setToken(result.data.token);
        setEmail("");
        setNotice("Invitation created. Copy the token now; it is not stored in plain text.");
        await load();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const result = await revokeShareAction({ shareId: id });
      if (!result.ok) setError(result.message);
      else {
        setNotice("Access revoked.");
        await load();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function attach() {
    if (!fileId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await attachFileToNoteAction({ noteId, fileId });
      if (!result.ok) setError(result.message);
      else {
        setNotice("File explicitly attached to this shared note.");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function preview(fileId: string) {
    const result = await getSharedFileUrlAction({ fileId });
    if (!result.ok) setError(result.message);
    else window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Share2 className="size-4 text-term-accent" aria-hidden="true" /> Individual note sharing</CardTitle>
        <CardMeta>private by default</CardMeta>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? <p role="alert" className="rounded border border-red-500/30 px-3 py-2 text-xs text-red-300">{error}</p> : null}
        {notice ? <p className="rounded border border-term-border px-3 py-2 text-xs text-term-text">{notice}</p> : null}

        {canManage ? (
          <form onSubmit={(event) => void invite(event)} className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <FieldLabel htmlFor="invite-email">Invite by email</FieldLabel>
              <Input id="invite-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collaborator@example.com" required />
            </div>
            <div className="w-28">
              <FieldLabel htmlFor="invite-role">Permission</FieldLabel>
              <select id="invite-role" value={permission} onChange={(event) => setPermission(event.target.value as Permission)} className="h-9 w-full rounded-md border border-term-border bg-term-bg px-2 text-sm text-term-text">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <div className="w-24">
              <FieldLabel htmlFor="invite-expiry">Expires (days)</FieldLabel>
              <Input id="invite-expiry" type="number" min={1} max={365} value={expires} onChange={(event) => setExpires(event.target.value)} />
            </div>
            <Button type="submit" size="sm" disabled={busy}><Link2 className="size-3.5" aria-hidden="true" /> Invite</Button>
          </form>
        ) : (
          <p className="text-xs text-term-muted">Only the owner can invite or revoke collaborators.</p>
        )}

        {token ? (
          <div className="rounded-md border border-term-accent/30 bg-term-accent/5 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs text-term-text"><Check className="size-3.5 text-term-accent" aria-hidden="true" /> Invitation token (shown once)</p>
            <code className="block break-all font-mono text-[11px] text-term-accent">{token}</code>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => void navigator.clipboard.writeText(token)}>Copy token</Button>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium text-term-text">Collaborators</p>
          {collaborators.length === 0 ? <p className="text-xs text-term-muted">Nobody has been invited yet.</p> : (
            <ul className="divide-y divide-term-border rounded-md border border-term-border">
              {collaborators.map((person) => (
                <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div>
                    <p className="font-mono text-xs text-term-text">{person.email}</p>
                    <p className="font-mono text-[10px] text-term-muted">{person.accepted ? "accepted" : "pending"} · {person.expiresAt ? `expires ${person.expiresAt.slice(0, 10)}` : "no expiry"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={person.permission === "editor" ? "accent" : "neutral"}>{person.permission}</Badge>
                    {canManage ? <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(person.id)}><Trash2 className="size-3.5" aria-hidden="true" /> Revoke</Button> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-term-text"><Paperclip className="size-3.5" aria-hidden="true" /> Explicitly attached files</p>
          {canAttach ? (
            <div className="mb-2 flex gap-2">
              <select value={fileId} onChange={(event) => setFileId(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-term-border bg-term-bg px-2 text-xs text-term-text">
                <option value="">Select a file…</option>
                {files.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}
              </select>
              <Button size="sm" disabled={busy || !fileId} onClick={() => void attach()}>Attach</Button>
            </div>
          ) : null}
          {attachments.length === 0 ? <p className="text-xs text-term-muted">No files attached to this note.</p> : (
            <ul className="divide-y divide-term-border rounded-md border border-term-border">
              {attachments.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate font-mono text-xs text-term-text">{file.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => void preview(file.id)}>Open</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
