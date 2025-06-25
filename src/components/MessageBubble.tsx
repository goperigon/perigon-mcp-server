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
                            className="bg-gray-800 text-green-400 px-2 py-1 rounded text-sm font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto my-3 border border-gray-700">
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
                          <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-600 pb-2">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold mb-3 text-white">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold mb-2 text-white">
                            {children}
                          </h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-base font-semibold mb-2 text-white">
                            {children}
                          </h4>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-white">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-gray-300">{children}</em>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gold pl-4 italic mb-3 text-gray-300 bg-gray-800/30 py-2 rounded-r">
                            {children}
                          </blockquote>
                        ),
                        hr: () => <hr className="border-gray-600 my-4" />,
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className="text-gold hover:text-gold/80 underline"
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
