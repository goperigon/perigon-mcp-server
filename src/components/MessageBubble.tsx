import ReactMarkdown from "react-markdown";

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
                          <code className="bg-surface-elevated text-primary px-2 py-1 rounded text-xs font-mono" {...props}>
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-surface-elevated p-4 rounded-lg overflow-x-auto my-3 border border-border">
                            {children}
                          </pre>
                        ),
                        a: ({ children, href }) => (
                          <a href={href} className="text-primary hover:text-primary/80 underline" target="_blank" rel="noopener noreferrer">
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
                const { toolName, state, args } = part.toolInvocation;

                return (
                  <div key={index} className="bg-surface-elevated p-4 rounded-lg border-l-4 border-accent my-3 text-light shadow-md hover:shadow-lg transition-shadow duration-200 border">
                    <div
                      className="text-sm font-semibold text-accent mb-3 cursor-pointer hover:text-accent/80 flex items-center gap-2 transition-colors duration-200"
                      onClick={() => onToggleToolCall(toolCallId)}
                    >
                      <span>{isCollapsed ? "▶" : "▼"}</span>
                      🔧 {toolName} ({state})
                    </div>
                    {!isCollapsed && (
                      <>
                        {args && (
                          <div className="text-xs text-light mb-3">
                            <strong>Arguments:</strong>
                            <pre className="mt-1 overflow-x-auto">
                              {JSON.stringify(args, null, 2)}
                            </pre>
                          </div>
                        )}
                        {state === "result" && "result" in part.toolInvocation && (
                          <div className="text-xs text-light">
                            <strong>Result:</strong>
                            <pre className="mt-1 overflow-x-auto">
                              {typeof part.toolInvocation.result === "string"
                                ? part.toolInvocation.result
                                : JSON.stringify(part.toolInvocation.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
