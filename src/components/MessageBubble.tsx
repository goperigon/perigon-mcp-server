import React from "react";
import ReactMarkdown from "react-markdown";
import { ToolInvocation } from "./ToolInvocation";

interface MessageBubbleProps {
  message: any;
  expandedToolCalls: Set<string>;
  onToggleToolCall: (toolCallId: string) => void;
}

export function MessageBubble({
  message,
  expandedToolCalls,
  onToggleToolCall,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`${message.role === "user" ? "max-w-[50%]" : "max-w-[65%]"} px-4 py-3 rounded-2xl break-words transition-shadow duration-200 ${
          message.role === "user"
            ? "bg-gold text-dark rounded-br-sm shadow-md hover:shadow-lg"
            : "bg-surface text-light rounded-bl-sm shadow-md hover:shadow-lg border border-border"
        }`}
      >
        <div className="leading-relaxed">
          {message.parts.map((part: any, index: number) => {
            switch (part.type) {
              case "text":
                return (
                  <div key={index} className="markdown-content">
                    <ReactMarkdown
                      components={{
                        code: ({ children, ...props }) => (
                          <code
                            className="bg-surface-elevated text-primary px-2 py-1 rounded text-xs font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-surface-elevated p-4 rounded-lg overflow-x-auto my-3 border border-border">
                            {children}
                          </pre>
                        ),
                        p: ({ children }) => (
                          <p className="mb-3 leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-outside mb-3 space-y-1 ml-4">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-outside mb-3 space-y-1 ml-4">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="mb-1">{children}</li>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-[1.875rem] font-semibold mb-4 text-light border-b border-border pb-2 tracking-tight">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-[1.45rem] font-semibold mb-3 text-light tracking-tight">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold mb-2 text-light">
                            {children}
                          </h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-base font-semibold mb-2 text-light">
                            {children}
                          </h4>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-light">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-light-gray">{children}</em>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary pl-4 italic mb-3 text-light-gray bg-surface-elevated/30 py-2 rounded-r">
                            {children}
                          </blockquote>
                        ),
                        hr: () => <hr className="border-border my-4" />,
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className="text-primary hover:text-primary/80 underline transition-colors duration-200"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {part.text}
                    </ReactMarkdown>
                  </div>
                );
              case "tool-invocation":
                const toolCallId = `${message.id}-${index}-${part.toolInvocation.toolName}`;
                const isCollapsed = !expandedToolCalls.has(toolCallId);

                return (
                  <ToolInvocation
                    key={index}
                    toolInvocation={part.toolInvocation}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => onToggleToolCall(toolCallId)}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
