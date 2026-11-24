import { FileText, Files, Folder, Share2, Star, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_GROUPS: ReadonlyArray<{ title: string; items: readonly NavItem[] }> = [
  {
    title: "WORKSPACE",
    items: [
      { label: "All Notes", href: "/notes", icon: FileText },
      { label: "Folders", href: "/folders", icon: Folder },
      { label: "Files", href: "/files", icon: Files },
    ],
  },
  {
    title: "SHORTCUTS",
    items: [
      { label: "Starred", href: "/starred", icon: Star },
      { label: "Shared", href: "/shared", icon: Share2 },
      { label: "Trash", href: "/trash", icon: Trash2 },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
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
