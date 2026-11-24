import { Terminal } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-term-bg">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-term-border px-6">
        <Terminal className="size-4 text-term-accent" aria-hidden="true" />
        <Link href="/" className="font-mono text-sm font-medium tracking-widest text-term-text">
          TERMNOTE
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4">{children}</main>
      <footer className="border-t border-term-border px-6 py-3 text-center font-mono text-[10px] text-term-muted">
        UI preview · no authentication service connected
      </footer>
    </div>
  );
}
