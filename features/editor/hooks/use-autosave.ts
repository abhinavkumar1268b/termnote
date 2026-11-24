"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveNoteAction } from "@/app/note-actions";
import { SAVE_DEBOUNCE_MS, SAVE_MAX_RETRIES, type SaveStatus } from "@/lib/editor/save";

interface AutosavePayload {
  title: string;
  markdown: string;
  content: Record<string, unknown>;
}

interface AutosaveOptions {
  noteId: string;
  initialSavedAt: string;
  enabled: boolean;
  getPayload: () => AutosavePayload | null;
}

export function useAutosave({ noteId, initialSavedAt, enabled, getPayload }: AutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialSavedAt);
  const [message, setMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const savedAtRef = useRef(initialSavedAt);

  const saveNow = useCallback(async () => {
    if (!enabled) return;
    const payload = getPayload();
    if (!payload) return;

    const revision = ++revisionRef.current;
    setStatus("saving");
    setMessage(null);

    for (let attempt = 0; attempt < SAVE_MAX_RETRIES; attempt += 1) {
      const result = await saveNoteAction({
        noteId,
        title: payload.title,
        markdown: payload.markdown,
        content: JSON.stringify(payload.content),
        expectedUpdatedAt: savedAtRef.current,
      });

      if (revision !== revisionRef.current) return;

      if (result.ok) {
        savedAtRef.current = result.savedAt;
        setLastSavedAt(result.savedAt);
        setStatus("saved");
        dirtyRef.current = false;
        return;
      }

      if (result.code === "CONFLICT" || result.code === "FORBIDDEN") {
        setStatus(result.code === "CONFLICT" ? "conflict" : "error");
        setMessage(result.message);
        return;
      }

      if (attempt === SAVE_MAX_RETRIES - 1) {
        setStatus("error");
        setMessage(result.message);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }, [enabled, getPayload, noteId]);

  const scheduleSave = useCallback(() => {
    if (!enabled) return;
    dirtyRef.current = true;
    setStatus("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void saveNow();
    }, SAVE_DEBOUNCE_MS);
  }, [enabled, saveNow]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const applyRemote = useCallback((incomingAt: string): boolean => {
    if (dirtyRef.current) return false;
    if (incomingAt <= savedAtRef.current) return false;
    savedAtRef.current = incomingAt;
    setLastSavedAt(incomingAt);
    setStatus("saved");
    setMessage(null);
    return true;
  }, []);

  return { status, lastSavedAt, message, scheduleSave, saveNow, applyRemote };
}
