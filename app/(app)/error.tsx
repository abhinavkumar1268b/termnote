"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-term-surface p-8">
      <AlertTriangle className="mb-3 size-5 text-red-300" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-term-text">Something went wrong</h1>
      <p className="mt-2 text-sm text-term-muted">{error.message}</p>
      <Button className="mt-5" onClick={reset}>
        <RotateCcw className="size-4" aria-hidden="true" /> Try again
      </Button>
    </div>
  );
}
