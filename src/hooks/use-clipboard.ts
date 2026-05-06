import { useCallback, useState } from "react";

const COPY_FEEDBACK_DURATION_MS = 2000;

interface UseClipboardResult {
  /** ID of the last successfully-copied entry, or `null` after the timeout. */
  copiedId: string | null;
  /** Copies text to the clipboard and tags the success with `id` for UI state. */
  copy: (id: string, text: string) => Promise<void>;
}

/**
 * Tiny clipboard helper that tracks which entry was last copied so a row can
 * show a transient checkmark.
 */
export function useClipboard(): UseClipboardResult {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), COPY_FEEDBACK_DURATION_MS);
    } catch (error) {
      console.error("Failed to copy text: ", error);
    }
  }, []);

  return { copiedId, copy };
}
