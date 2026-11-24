"use client";

import { ChevronDown, LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/auth-actions";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/data/session";

export function ProfileMenu({
  user,
  workspaceName,
  compact = false,
}: {
  user: SessionUser | null;
  workspaceName?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Profile menu"
        className={cn(
          "flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 transition-colors hover:border-term-border hover:bg-term-elevated/60",
          open && "border-term-border bg-term-elevated/60",
        )}
      >
        <Avatar initials={user?.initials ?? "--"} className="size-7" />
        {!compact ? (
          <span className="hidden max-w-32 truncate text-xs text-term-text sm:inline">
            {user?.name ?? "Not signed in"}
          </span>
        ) : null}
        <ChevronDown className={cn("size-3.5 text-term-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-56 overflow-hidden rounded-md border border-term-border bg-term-sidebar p-1.5">
          <div className="border-b border-term-border px-2 pb-2">
            <p className="truncate text-xs text-term-text">{user?.name ?? "Not signed in"}</p>
            <p className="truncate font-mono text-[10px] text-term-muted">{user?.email ?? "No session"}</p>
            {workspaceName ? (
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-term-accent">{workspaceName}</p>
            ) : null}
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded px-2 py-2 text-xs text-term-muted hover:bg-term-elevated hover:text-term-text"
          >
            <Settings2 className="size-3.5" aria-hidden="true" /> Settings
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs text-term-muted hover:bg-term-elevated hover:text-term-error">
              <LogOut className="size-3.5" aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
