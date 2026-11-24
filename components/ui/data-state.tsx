import { AlertCircle, DatabaseZap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function DataErrorState({ message }: { message: string }) {
  return (
    <Card className="border-term-error/30">
      <CardContent className="flex flex-col items-start gap-2 py-8">
        <AlertCircle className="size-5 text-term-error" aria-hidden="true" />
        <h2 className="text-sm font-medium text-term-text">Could not load workspace data</h2>
        <p className="text-sm text-term-muted">{message}</p>
        <p className="font-mono text-[10px] text-term-muted">Check .env.local, migrations and RLS policies.</p>
      </CardContent>
    </Card>
  );
}

export function SetupNotice() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-2 py-8">
        <DatabaseZap className="size-5 text-term-accent" aria-hidden="true" />
        <h2 className="text-sm font-medium text-term-text">Supabase is not configured</h2>
        <p className="text-sm text-term-muted">
          Copy .env.example to .env.local, apply the migrations in supabase/migrations and sign in. Sample data is no
          longer shown as persisted data.
        </p>
      </CardContent>
    </Card>
  );
}

