"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { canUseBrowserHistory } from "@/lib/navigation/history";

export function SettingsBackButton() {
  const router = useRouter();

  function goBack() {
    if (canUseBrowserHistory(window.history.length, document.referrer, window.location.origin)) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Back to previous screen"
      title="Back"
      className="inline-flex size-8 items-center justify-center rounded-md border border-term-border bg-term-elevated/60 text-term-muted transition-colors hover:border-term-accent hover:text-term-accent"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
    </button>
  );
}
