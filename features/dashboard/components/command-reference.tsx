import { Terminal } from "lucide-react";
import { listCommands } from "@/lib/commands/registry";
import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";

export function CommandReference() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Command reference</CardTitle>
        <CardMeta>sample catalogue</CardMeta>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-term-border">
          {listCommands().map((command) => (
            <li key={command.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-mono text-xs text-term-accent">
                <Terminal className="size-3 text-term-muted" aria-hidden="true" />
                {command.usage}
              </span>
              <span className="text-xs text-term-muted">{command.description}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
