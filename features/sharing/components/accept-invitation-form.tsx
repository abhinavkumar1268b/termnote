"use client";

import { Check, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { acceptInvitationAction } from "@/app/sharing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/input";

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [value, setValue] = useState(token);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await acceptInvitationAction({ token: value });
      if (!result.ok) setError(result.message);
      else router.push(`/notes/${result.data.noteId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link2 className="size-4 text-term-accent" aria-hidden="true" /> Accept note invitation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void accept(event)} className="space-y-4">
          <div>
            <FieldLabel htmlFor="invite-token">Invitation token</FieldLabel>
            <Input id="invite-token" value={value} onChange={(event) => setValue(event.target.value)} className="font-mono text-[11px]" required />
          </div>
          {error ? <p role="alert" className="text-xs text-term-error">{error}</p> : null}
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            <Check className="size-4" aria-hidden="true" /> {busy ? "Checking…" : "Accept invitation"}
          </Button>
          <p className="text-center text-xs text-term-muted">You must be signed in as the invited email address.</p>
        </form>
      </CardContent>
    </Card>
  );
}

