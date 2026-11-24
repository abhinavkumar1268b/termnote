import type { AppUser, Workspace, WorkspaceStatus } from "@/types/domain";

export const mockUser: AppUser = {
  name: "Alex Morgan",
  email: "alex@termnote.app",
  initials: "AM",
  role: "Owner",
};

export const mockWorkspace: Workspace = {
  id: "ws-personal",
  ownerId: "usr-alex",
  name: "Personal Workspace",
  createdAt: "2026-04-02T08:00:00Z",
  updatedAt: "2026-11-23T09:24:00Z",
};

export const mockWorkspaceStatus: WorkspaceStatus = {
  label: "Workspace ready",
  detail: "Private storage · synced",
  storageUsedBytes: 1_240_000_000,
  storageLimitBytes: 5_000_000_000,
};
