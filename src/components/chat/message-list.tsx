import React from "react";
import type { UIMessage } from "ai";
import { MessageBubble } from "./message-bubble";
import { ThinkingIndicator } from "./thinking-indicator";

interface MessageListProps {
  messages: UIMessage[];
  /** Whether to show the "Thinking..." indicator after the last message. */
  isThinking: boolean;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Scrollable region containing the chat history. Owns the scroll container
 * (the parent passes a ref so it can drive auto-scroll).
 */
export function MessageList({
  messages,
  isThinking,
  copiedId,
  onCopy,
  scrollRef,
}: MessageListProps) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            copiedId={copiedId}
            onCopy={onCopy}
          />
        ))}
        {isThinking && <ThinkingIndicator />}
      </div>
    </div>
  );
}
