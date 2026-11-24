"use client";

import { ArrowRight, Lock, Mail, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { StatusDot } from "@/components/ui/status-dot";
import { INITIAL_AUTH_STATE } from "@/lib/auth/types";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = useActionState(
    isSignup ? signupAction : loginAction,
    INITIAL_AUTH_STATE,
  );

  return (
    <div className="w-full max-w-sm rounded-lg border border-term-border bg-term-surface">
      <div className="border-b border-term-border p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-term-accent">
          {isSignup ? "Create account" : "Welcome back"}
        </p>
        <h1 className="mt-2 text-xl font-semibold text-term-text">
          {isSignup ? "Set up your workspace" : "Sign in to TermNote"}
        </h1>
        <p className="mt-1.5 text-sm text-term-muted">
          {isSignup ? "A private workspace is created automatically." : "Continue to your private notes and files."}
        </p>
      </div>

      <form action={formAction} className="space-y-4 p-6">
        {isSignup ? (
          <div>
            <FieldLabel htmlFor="name">Display name</FieldLabel>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-2.5 size-4 text-term-muted" aria-hidden="true" />
              <Input id="name" name="name" placeholder="Alex Morgan" className="pl-9" autoComplete="name" required />
            </div>
          </div>
        ) : null}

        <div>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-term-muted" aria-hidden="true" />
            <Input id="email" name="email" type="email" placeholder="you@example.com" className="pl-9" autoComplete="email" required />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-2.5 size-4 text-term-muted" aria-hidden="true" />
            <Input id="password" name="password" type="password" placeholder="••••••••" className="pl-9" autoComplete={isSignup ? "new-password" : "current-password"} required />
          </div>
        </div>

        {state.error ? (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs leading-relaxed text-red-300">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p className="rounded-md border border-term-border bg-term-elevated px-3 py-2 text-xs leading-relaxed text-term-text">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Working…" : isSignup ? "Create account" : "Sign in"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t border-term-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-term-muted">
          {isSignup ? "Already have an account?" : "New to TermNote?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="text-term-accent hover:underline">
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
        {!isSignup ? (
          <Link href="/reset-password" className="text-xs text-term-muted hover:text-term-accent">
            Forgot password?
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AuthPrivacyNote() {
  return (
    <p className="mt-5 flex items-center justify-center gap-2 font-mono text-[10px] text-term-muted">
      <StatusDot /> <ShieldCheck className="size-3" aria-hidden="true" /> Private by default
    </p>
  );
}
