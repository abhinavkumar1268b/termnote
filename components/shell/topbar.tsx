"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { StatusDot } from "@/components/ui/status-dot";
import { CommandConsole } from "@/features/commands/components/command-console";
import type { SessionUser } from "@/lib/data/session";
import { ProfileMenu } from "./profile-menu";
import { sectionLabel } from "./nav-items";

export function Topbar({
  onOpenMobile,
  user,
  workspaceName,
  showCommand = true,
}: {
  onOpenMobile: () => void;
  user: SessionUser | null;
  workspaceName?: string;
  showCommand?: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-term-border px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="shrink-0 text-term-muted hover:text-term-text md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <span className="font-mono text-xs text-term-muted">workspace</span>
        <span className="text-term-border">/</span>
        <span className="text-xs text-term-text">{sectionLabel(pathname)}</span>
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        {showCommand ? <CommandConsole /> : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <StatusDot tone={user ? "success" : "muted"} />
          <span className="font-mono text-[10px] text-term-muted">{user ? "synced" : "offline"}</span>
        </div>
        <ProfileMenu user={user} workspaceName={workspaceName} compact />
      </div>
    </header>
  );
}
