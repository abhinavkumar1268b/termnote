"use client";

import { Link2, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SharedNote } from "@/types/domain";

function ShareList({ shares, emptyText }: { shares: SharedNote[]; emptyText: string }) {
  if (shares.length === 0) return <p className="py-6 text-center text-sm text-term-muted">{emptyText}</p>;
  return (
    <ul className="divide-y divide-term-border">
      {shares.map((share) => (
        <li key={share.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Share2 className="size-4 shrink-0 text-term-accent" aria-hidden="true" />
            <div className="min-w-0">
              <Link href={`/notes/${share.noteId}`} className="block truncate text-sm font-medium text-term-text hover:text-term-accent">{share.title}</Link>
              <p className="truncate font-mono text-[10px] text-term-muted">{share.email} · {share.sharedLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={share.permission === "editor" ? "accent" : "neutral"}>{share.permission}</Badge>
            {share.expiresAt ? <span className="font-mono text-[10px] text-term-muted">expires {share.expiresAt.slice(0, 10)}</span> : null}
            {!share.accepted ? <Badge variant="warning">pending</Badge> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SharedTabs({ byMe, withMe }: { byMe: SharedNote[]; withMe: SharedNote[] }) {
  const [tab, setTab] = useState<"by-me" | "with-me">("with-me");
  const active = tab === "with-me" ? withMe : byMe;

  return (
    <div>
      <div className="mb-4 flex gap-1.5">
        {(["with-me", "by-me"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-[11px] transition-colors",
              tab === value ? "bg-term-accent/10 text-term-accent" : "bg-term-surface text-term-muted hover:text-term-text",
            )}
          >
            <Link2 className="size-3.5" aria-hidden="true" />
            {value === "with-me" ? `Shared with me (${withMe.length})` : `Shared by me (${byMe.length})`}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <ShareList shares={active} emptyText={tab === "with-me" ? "No notes have been shared with you." : "You have not shared any notes."} />
        </CardContent>
      </Card>
    </div>
  );
}
