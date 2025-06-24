import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageBubble } from "./components/MessageBubble";
import { ChatInput } from "./components/ChatInput";

function App() {
  const [collapsedToolCalls, setCollapsedToolCalls] = useState<Set<string>>(
    new Set(),
  );

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/v1/api/chat",
    maxSteps: 5,
  });

  // Collapse tool calls when text starts streaming after them
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      const toolCallIds = new Set<string>();
      let hasTextAfterTools = false;
      let foundTools = false;

      // Check if there are tool calls followed by text in the same message
      for (const part of lastMessage.parts) {
        if (part.type === "tool-invocation") {
          foundTools = true;
          toolCallIds.add(`${lastMessage.id}-${part.toolInvocation.toolName}`);
        } else if (part.type === "text" && foundTools && part.text.trim()) {
          hasTextAfterTools = true;
        }
      }

      if (hasTextAfterTools && toolCallIds.size > 0) {
        setCollapsedToolCalls((prev) => new Set([...prev, ...toolCallIds]));
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = document.getElementById('messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleToggleToolCall = (toolCallId: string) => {
    setCollapsedToolCalls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolCallId)) {
        newSet.delete(toolCallId);
      } else {
        newSet.add(toolCallId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-dark">
      <header className="flex items-center justify-between px-8 py-4 glass sticky top-0 z-50 shadow-lg">
        <div className="flex-1 flex items-center">
          <a
            href="https://perigon.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity duration-200"
          >
            <img src="/favicon.ico" alt="Perigon" className="size-8" />
          </a>
        </div>
        <div className="flex-[2] flex justify-center">
          <h1 className="m-0 text-2xl font-semibold text-light">
            Perigon MCP Playground
          </h1>
        </div>
        <div className="flex-1 flex justify-end">
          <a
            href="https://github.com/goperigon/perigon-mcp-server"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-light no-underline hover:text-gold transition-colors duration-200"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      <main className="flex-1 flex justify-center overflow-hidden">
        <div className="flex flex-col h-full w-full max-w-4xl px-8">
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4" id="messages-container">
            {messages?.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                collapsedToolCalls={collapsedToolCalls}
                onToggleToolCall={handleToggleToolCall}
              />
            ))}

            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-surface text-light rounded-bl-sm shadow-md border border-border">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold"></div>
                    <span className="text-sm text-light-gray">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ChatInput
            input={input}
            status={status}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
