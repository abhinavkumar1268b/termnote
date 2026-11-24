"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, updatePasswordAction } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/input";
import { INITIAL_AUTH_STATE } from "@/lib/auth/types";

export function ResetPasswordForm({ mode }: { mode: "request" | "update" }) {
  const [state, formAction, pending] = useActionState(
    mode === "request" ? requestPasswordResetAction : updatePasswordAction,
    INITIAL_AUTH_STATE,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === "request" ? "Reset your password" : "Choose a new password"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {mode === "request" ? (
            <div>
              <FieldLabel htmlFor="reset-email">Email address</FieldLabel>
              <Input id="reset-email" name="email" type="email" autoComplete="email" required />
            </div>
          ) : (
            <>
              <div>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input id="new-password" name="password" type="password" autoComplete="new-password" required />
              </div>
              <div>
                <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required />
              </div>
            </>
          )}

          {state.error ? <p role="alert" className="text-xs text-term-error">{state.error}</p> : null}
          {state.message ? <p className="text-xs text-term-text">{state.message}</p> : null}

          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? "Working…" : mode === "request" ? "Send reset link" : "Update password"}
          </Button>
          <Link href="/login" className="block text-center text-xs text-term-muted hover:text-term-accent">
            Back to sign in
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

