import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useAuth } from "@/lib/auth-context";
import { useApiKeys } from "@/lib/api-keys-context";
import { createChatTransport } from "@/lib/chat-transport";
import {
  clearMessagesFromStorage,
  getDefaultMessage,
  loadMessagesFromStorage,
} from "@/lib/chat-storage";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { useClipboard } from "@/hooks/use-clipboard";
import { useErrorToast } from "@/hooks/use-error-toast";
import { usePersistedMessages } from "@/hooks/use-persisted-messages";
import {
  ApiKeysErrorAlert,
  ErrorToast,
  NoApiKeyAlert,
} from "./chat/chat-alerts";
import { ChatInput } from "./chat/chat-input";
import { MessageList } from "./chat/message-list";

const isAuthError = (error: Error) => error.message.includes("401");

export default function ChatPlayground() {
  const { secret, invalidate, isAuthenticated } = useAuth();
  const {
    selectedPerigonKey,
    isLoadingApiKeys,
    apiKeysError,
    hasNoApiKeys,
    ensureApiKeysLoaded,
  } = useApiKeys();

  const [initialMessages] = useState<UIMessage[]>(loadMessagesFromStorage);
  const [input, setInput] = useState("");

  // Recompute on auth changes so a fresh chat instance is mounted.
  const chatId = `${secret ?? "no-auth"}-${selectedPerigonKey?.id ?? "no-key"}`;

  const transport = useMemo(
    () =>
      createChatTransport({
        secret,
        perigonKey: selectedPerigonKey?.token ?? null,
        onUnauthorized: () => void invalidate(),
      }),
    [secret, selectedPerigonKey?.token, invalidate]
  );

  const { messages, status, error, setMessages, sendMessage, regenerate } =
    useChat({
      id: chatId,
      transport,
      messages: initialMessages,
    });

  const errorToast = useErrorToast({ error, shouldIgnore: isAuthError });
  const { copiedId, copy } = useClipboard();
  usePersistedMessages(messages);

  // Auto-regenerate when the user authenticates and the cached history ends
  // on a user message (interrupted prior session).
  useEffect(() => {
    const last = initialMessages[initialMessages.length - 1];
    if (isAuthenticated && last && last.role !== "assistant") {
      regenerate();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollRef = useAutoScroll({
    trigger: { messages, status },
    resetTrigger: status === "submitted",
  });

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || status !== "ready") return;

      const hasApiKeys = await ensureApiKeysLoaded();
      if (!hasApiKeys) return;

      sendMessage({ text: trimmed });
      setInput("");
    },
    [input, status, ensureApiKeysLoaded, sendMessage]
  );

  const handleClear = useCallback(() => {
    setMessages([getDefaultMessage()]);
    clearMessagesFromStorage();
  }, [setMessages]);

  const showNoKeyAlert =
    !isLoadingApiKeys &&
    !apiKeysError &&
    hasNoApiKeys &&
    !selectedPerigonKey;

  const canSubmit =
    status === "ready" &&
    input.trim().length > 0 &&
    Boolean(selectedPerigonKey) &&
    !isLoadingApiKeys;

  return (
    <div className="fixed inset-0 top-12 flex flex-col bg-background">
      {apiKeysError && <ApiKeysErrorAlert message={apiKeysError} />}
      {showNoKeyAlert && <NoApiKeyAlert />}
      {errorToast.visible && errorToast.message && (
        <ErrorToast
          message={errorToast.message}
          onDismiss={errorToast.dismiss}
        />
      )}

      <MessageList
        messages={messages}
        isThinking={status === "submitted"}
        copiedId={copiedId}
        onCopy={copy}
        scrollRef={scrollRef}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onClear={handleClear}
        disabled={!canSubmit}
        canSubmit={canSubmit}
      />
    </div>
  );
}
