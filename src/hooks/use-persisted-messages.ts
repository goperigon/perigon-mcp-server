import { useEffect } from "react";
import type { UIMessage } from "ai";
import { saveMessagesToStorage } from "@/lib/chat-storage";

/**
 * Persists chat messages to `localStorage` whenever they change. Skips empty
 * arrays so a transient empty state doesn't clobber the cache.
 */
export function usePersistedMessages(messages: UIMessage[]): void {
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);
}
