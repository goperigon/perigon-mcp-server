import type { UIMessage } from "ai";

const STORAGE_KEY = "chat-messages";

const DEFAULT_GREETING = `Hi! I'm Cerebro, your AI assistant powered by Perigon. I can help you search news, research journalists and companies, and find information about public figures and media sources.

What would you like to explore?`;

/**
 * Returns the canonical default greeting message used on a fresh chat or after
 * `clearConversation`.
 */
export function getDefaultMessage(): UIMessage {
  return {
    id: "1",
    role: "assistant",
    parts: [{ type: "text", text: DEFAULT_GREETING }],
  };
}

/**
 * Validates a stored message payload. v5 UIMessages are required to have a
 * `parts` array; anything else (including the v4 `content` shape) is rejected.
 */
function isValidMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  return (
    typeof msg.id === "string" &&
    typeof msg.role === "string" &&
    Array.isArray(msg.parts)
  );
}

/**
 * Loads chat history from `localStorage`. Returns the default greeting if the
 * cache is missing, malformed, or in the legacy v4 shape (which is reset to
 * avoid runtime crashes when the v5 `useChat` reads it).
 */
export function loadMessagesFromStorage(): UIMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [getDefaultMessage()];

    const parsed = JSON.parse(stored);
    const isValidArray =
      Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidMessage);

    if (!isValidArray) {
      localStorage.removeItem(STORAGE_KEY);
      return [getDefaultMessage()];
    }

    return parsed;
  } catch (error) {
    console.warn(
      "Failed to load messages from localStorage, clearing storage:",
      error
    );
    localStorage.removeItem(STORAGE_KEY);
    return [getDefaultMessage()];
  }
}

/** Persist the current chat messages. Silently swallows quota errors. */
export function saveMessagesToStorage(messages: UIMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn("Failed to save messages to localStorage:", error);
  }
}

/** Clear the persisted chat history. Used when the user resets the chat. */
export function clearMessagesFromStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
