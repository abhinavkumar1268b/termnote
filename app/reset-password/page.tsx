import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { AlertCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOptionalClient } from "@/lib/supabase/server";

export const metadata = { title: "Reset password — TermNote" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-term-bg p-4">
        <div className="w-full max-w-sm rounded-lg border border-term-border bg-term-surface p-6">
          <AlertCircle className="mb-3 size-5 text-term-accent" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-term-text">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-term-muted">
            Copy .env.example to .env.local and set the project URL and anon key to use password reset.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await getOptionalClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-term-bg p-4">
      <ResetPasswordForm mode={data.user ? "update" : "request"} />
    </main>
  );
}
