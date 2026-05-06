import { Bot, User } from "lucide-react";
import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { ToolCallVisualization } from "../tool-call-visualization";
import { TextMessagePart } from "./text-message-part";

interface MessageBubbleProps {
  message: UIMessage;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}

/**
 * Renders a single chat message with its avatar and a column of part bubbles
 * (text, tool calls, ...). Layout flips for user messages.
 */
export function MessageBubble({
  message,
  copiedId,
  onCopy,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className="space-y-3">
      <div
        className={`flex items-start space-x-4 ${
          isUser ? "flex-row-reverse space-x-reverse" : ""
        }`}
      >
        <Avatar isUser={isUser} />
        <div
          className={`flex-1 max-w-[85%] ${isUser ? "text-right" : ""}`}
        >
          {message.parts?.map((part, index) => (
            <MessagePart
              key={`${message.id}-part-${index}`}
              messageId={message.id}
              index={index}
              part={part}
              copiedId={copiedId}
              onCopy={onCopy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <div className="w-10 h-10 flex items-center justify-center text-muted-foreground">
      {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
    </div>
  );
}

interface MessagePartProps {
  messageId: string;
  index: number;
  part: UIMessage["parts"][number];
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}

function MessagePart({
  messageId,
  index,
  part,
  copiedId,
  onCopy,
}: MessagePartProps) {
  if (part.type === "text") {
    const copyId = `${messageId}-${index}`;
    return (
      <TextMessagePart
        text={part.text}
        copyId={copyId}
        isCopied={copiedId === copyId}
        onCopy={onCopy}
      />
    );
  }

  // v5: tool parts are typed `tool-${toolName}`. Use the catch-all helpers
  // since we have many tools and don't want a giant per-tool switch.
  if (isToolUIPart(part) || part.type === "dynamic-tool") {
    return (
      <div className="mb-3">
        <ToolCallVisualization part={part as never} />
      </div>
    );
  }

  return null;
}
