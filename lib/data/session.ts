import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOptionalClient } from "@/lib/supabase/server";
import { NOT_AUTHENTICATED, NOT_CONFIGURED, type DataResult } from "./client";

export interface SessionUser {
  name: string;
  email: string;
  initials: string;
  role: string;
  workspaceName: string;
}

export async function getSessionUser(): Promise<DataResult<SessionUser>> {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED };
  const supabase = await getOptionalClient();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { data: null, error: NOT_AUTHENTICATED };

  const [profile, workspace] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle(),
    supabase.from("workspaces").select("name").eq("owner_id", data.user.id).maybeSingle(),
  ]);

  const name = (profile.data?.display_name as string | undefined) || data.user.email?.split("@")[0] || "User";

  return {
    data: {
      name,
      email: data.user.email ?? "",
      initials: name.slice(0, 2).toUpperCase(),
      role: "Owner",
      workspaceName: (workspace.data?.name as string | undefined) ?? "Personal Workspace",
    },
    error: null,
  };
}
