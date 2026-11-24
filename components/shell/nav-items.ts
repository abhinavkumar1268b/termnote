import { FileText, Files, Folder, LayoutDashboard, Settings, Share2, Star, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAV_GROUPS: ReadonlyArray<{ title: string; items: readonly NavItem[] }> = [
  {
    title: "Workspace",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "All notes", href: "/notes", icon: FileText, badge: "10" },
      { label: "Folders", href: "/folders", icon: Folder, badge: "7" },
      { label: "Files", href: "/files", icon: Files, badge: "8" },
    ],
  },
  {
    title: "Organise",
    items: [
      { label: "Starred", href: "/starred", icon: Star, badge: "3" },
      { label: "Shared", href: "/shared", icon: Share2, badge: "3" },
      { label: "Trash", href: "/trash", icon: Trash2, badge: "4" },
    ],
  },
  {
    title: "Preferences",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionLabel(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item.href)) return item.label;
    }
  }
  return "Workspace";
}
