import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOptionalClient } from "@/lib/supabase/server";

export interface DataResult<T> {
  data: T | null;
  error: string | null;
}

export const NOT_CONFIGURED = "Supabase is not configured. See supabase/README.md for setup.";
export const NOT_AUTHENTICATED = "Sign in to view this workspace.";

export async function getWorkspaceContext(): Promise<DataResult<{ workspaceId: string; userId: string }>> {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED };

  const supabase = await getOptionalClient();
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { data: null, error: NOT_AUTHENTICATED };

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", data.user.id)
    .limit(1)
    .maybeSingle();

  if (workspaceError) return { data: null, error: workspaceError.message };
  if (!workspace) return { data: null, error: "No workspace found for this account." };

  return { data: { workspaceId: workspace.id, userId: data.user.id }, error: null };
}
