"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen, Terminal, X } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/data/session";
import type { WorkspaceStatus } from "@/types/domain";
import { isNavItemActive, NAV_GROUPS } from "./nav-items";
import { WorkspaceStatusPanel } from "./workspace-status";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: SessionUser | null;
  status: WorkspaceStatus | null;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, user, status }: SidebarProps) {
  const pathname = usePathname();
  const showLabels = !collapsed || mobileOpen;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-term-border bg-term-sidebar transition-[width,transform] duration-150",
        "md:static md:z-auto md:translate-x-0",
        collapsed ? "w-64 md:w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-term-border px-4">
        <Terminal className="size-4 shrink-0 text-term-accent" aria-hidden="true" />
        {showLabels ? (
          <span className="flex-1 font-mono text-sm font-medium tracking-widest text-term-text">TERMNOTE</span>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden text-term-muted hover:text-term-text md:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="text-term-muted hover:text-term-text md:hidden"
          aria-label="Close navigation"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-5 last:mb-0">
            {showLabels ? (
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-term-muted/70">{group.title}</p>
            ) : (
              <div className="mx-2 mb-3 border-t border-term-border" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      title={showLabels ? undefined : item.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-3 rounded-md px-2 text-sm transition-colors",
                        collapsed && !mobileOpen && "justify-center px-0",
                        active
                          ? "bg-term-accent/10 text-term-accent"
                          : "text-term-muted hover:bg-term-elevated hover:text-term-text",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {showLabels ? <span className="flex-1 truncate">{item.label}</span> : null}
                      {showLabels && item.badge ? (
                        <span className="font-mono text-[10px] text-term-muted/70">{item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-term-border p-3">
        {showLabels && status ? <WorkspaceStatusPanel status={status} compact /> : null}
        <div className={cn("flex items-center gap-2 px-1 py-1", collapsed && !mobileOpen && "justify-center px-0")}>
          <Avatar initials={user?.initials ?? "--"} />
          {showLabels ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-term-text">{user?.name ?? "Not signed in"}</p>
              <p className="truncate font-mono text-[10px] text-term-muted">{user?.workspaceName ?? "Setup required"}</p>
            </div>
          ) : null}
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex size-7 items-center justify-center rounded-md text-term-muted hover:bg-term-elevated hover:text-term-text"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
