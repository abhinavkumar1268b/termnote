"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface RemoteNoteUpdate {
  title: string;
  content: unknown;
  markdown: string;
  updatedAt: string;
  actorId: string | null;
}

/** Best-effort Realtime updates; conflicts are resolved in the editor. */
export function SharedNoteRealtime({ noteId }: { noteId: string }) {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`note:${noteId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notes",
        filter: `id=eq.${noteId}`,
      }, (payload) => {
        const row = payload.new as {
          title?: string;
          content?: unknown;
          markdown?: string;
          updated_at?: string;
        };
        if (!row.updated_at) return;
        const update: RemoteNoteUpdate = {
          title: row.title ?? "",
          content: row.content,
          markdown: row.markdown ?? "",
          updatedAt: row.updated_at,
          actorId: (payload.new as { actor_id?: string | null }).actor_id ?? null,
        };
        window.dispatchEvent(new CustomEvent<RemoteNoteUpdate>("termnote:remote-update", { detail: update }));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [noteId]);

  return null;
}
