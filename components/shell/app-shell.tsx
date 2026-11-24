"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { SessionUser } from "@/lib/data/session";
import type { WorkspaceStatus } from "@/types/domain";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  user,
  status,
}: {
  children: ReactNode;
  user: SessionUser | null;
  status: WorkspaceStatus | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // The terminal-first home is a focused screen without a dominant sidebar.
  if (pathname === "/") return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-term-bg">
      {mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-term-bg/80 md:hidden"
          aria-label="Close navigation overlay"
        />
      ) : null}

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
        status={status}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobile={() => setMobileOpen(true)} user={user} workspaceName={user?.workspaceName} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
