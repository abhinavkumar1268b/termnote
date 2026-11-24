import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardMeta } from "@/components/ui/card";

export function SettingsSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {meta ? <CardMeta>{meta}</CardMeta> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-term-border py-3 last:border-0 last:pb-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs text-term-muted">{label}</span>
      <div className="text-sm text-term-text">{children}</div>
    </div>
  );
}
