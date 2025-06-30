import React, { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Send,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  PenToolIcon as Tool,
} from "lucide-react";
import { MessageText } from "./message-text";

export default function ChatPlayground() {
  const { messages, input, handleInputChange, handleSubmit, status, error } =
    useChat({
      api: "/v1/api/chat",
      initialMessages: [
        {
          id: "1",
          role: "assistant",
          content: `Hi! I'm Cerebro, your AI assistant powered by Perigon. I can help you search news, research journalists and companies, and find information about public figures and media sources.

What would you like to explore?`,
        },
      ],
    });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoScrollDisabledRef = useRef(false);
  const isAutoScrollingRef = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && !autoScrollDisabledRef.current) {
      // Use setTimeout to ensure DOM is updated before scrolling
      setTimeout(() => {
        if (scrollAreaRef.current && !autoScrollDisabledRef.current) {
          isAutoScrollingRef.current = true;
          scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: "smooth",
          });
          // Clear auto-scrolling flag after smooth scroll completes
          setTimeout(() => {
            isAutoScrollingRef.current = false;
          }, 500);
        }
      }, 0);
    }
  }, [messages, status]);

  // Reset auto-scroll disabled flag when new stream starts
  useEffect(() => {
    if (status === "submitted") {
      autoScrollDisabledRef.current = false;
    }
  }, [status]);

  // Add scroll event listener to detect user scrolling during auto-scroll
  useEffect(() => {
    const scrollElement = scrollAreaRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      // Only disable auto-scroll if we're currently auto-scrolling and user manually scrolled
      if (isAutoScrollingRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
        
        // If user scrolled away from bottom during auto-scroll, disable it
        if (!isAtBottom) {
          autoScrollDisabledRef.current = true;
          isAutoScrollingRef.current = false;
        }
      }
    };

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && status === "ready") {
        const form = e.currentTarget.form;
        if (form) {
          const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          form.dispatchEvent(submitEvent);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 top-12 flex flex-col bg-background">
      {/* Error display */}
      {error && (
        <Card className="mx-6 mt-4 border-destructive/20 bg-destructive/10">
          <CardContent className="py-3 px-4">
            <div className="font-mono text-sm text-destructive">
              <strong>Error:</strong> {error.message}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scrollable messages area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <div
                className={`flex items-start space-x-4 ${
                  message.role === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                  {message.role === "user" ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>

                <div
                  className={`flex-1 max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}
                >
                  {message.parts?.map((part, index) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <Card
                            key={`${message.id}-text-${index}`}
                            className="inline-block mb-3 bg-card/95 backdrop-blur-sm shadow-sm py-0 border border-border/30"
                          >
                            {" "}
                            <CardContent className="py-1.5 px-3">
                              <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert [&>*:last-child]:mb-0">
                                <MessageText text={part.text} />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      case "tool-invocation":
                        return (
                          <div
                            key={`${message.id}-tool-${index}`}
                            className="mb-3"
                          >
                            <ToolCallVisualization
                              toolCall={part.toolInvocation}
                            />
                          </div>
                        );
                      default:
                        return null;
                    }
                  }) ||
                    // Fallback for messages with only content (backward compatibility)
                    (message.content && (
                      <Card className="inline-block mb-3 bg-card/95 backdrop-blur-sm shadow-sm py-0 border border-border/30">
                        {" "}
                        <CardContent className="py-1.5 px-3">
                          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert [&>*:last-child]:mb-0">
                            <MessageText text={message.content} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </div>
          ))}

          {status === "submitted" && (
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                <Bot className="w-5 h-5" />
              </div>
              <Card className="bg-card/95 backdrop-blur-sm shadow-sm py-0 border border-border/30">
                {" "}
                <CardContent className="py-1.5 px-3">
                  <div className="flex items-center space-x-3 text-sm font-mono">
                    <span>Thinking...</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Fixed input area at bottom */}
      <div className="flex-shrink-0 border-t border-border backdrop-blur-sm p-6">
        <div className="max-w-4xl mx-auto">
          <div className="font-mono text-xs text-muted-foreground mb-4 hidden sm:block">
            INPUT CONSOLE • Press Enter to send, Shift+Enter for new line
          </div>
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Enter your query here..."
              className="flex-1 font-mono text-sm resize-none min-h-[60px] max-h-[120px] focus-visible:ring-0 text-foreground"
              disabled={status !== "ready"}
            />
            <Button
              type="submit"
              disabled={status !== "ready" || !input.trim()}
              className="font-mono px-6 pt-7"
              variant="ghost"
            >
              <Send className="w-4 h-4 mr-2" />
              SEND
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Tool call visualization component
function ToolCallVisualization({ toolCall }: { toolCall: any }) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Handle both old and new toolCall structures
  const toolName = toolCall.toolName;
  const args = toolCall.args || {};
  const state = toolCall.state;
  const result = toolCall.result;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-mono text-xs p-3 h-auto bg-muted/50 hover:bg-muted/70 border-border/50"
        >
          <div className="flex items-center space-x-2">
            <Tool className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">TOOL CALL: {toolName}</span>
            <span className="text-muted-foreground">
              ({Object.keys(args).length} params)
            </span>
            {state && (
              <Badge variant="outline" className="text-xs border-border/50">
                {state.toUpperCase()}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="bg-muted/30 border-l border-r border-b border-border/30 rounded-t-none rounded-b-lg">
          <CardContent className="py-3 px-4 font-mono text-xs space-y-3">
            <div>
              <div className="font-semibold text-foreground mb-2">
                PARAMETERS:
              </div>
              <Card className="bg-card/50 border-border/30">
                <CardContent className="py-2 px-3">
                  <pre className="overflow-auto max-h-48 text-foreground whitespace-pre break-words">
                    {JSON.stringify(args, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>

            {state === "result" && result !== undefined && (
              <div>
                <div className="font-semibold text-foreground mb-2">
                  RESULT:
                </div>
                <Card className="bg-card/50 border-border/30">
                  <CardContent className="py-2 px-3">
                    <pre className="overflow-auto max-h-64 text-foreground whitespace-pre-wrap break-words">
                      {typeof result === "string"
                        ? result
                        : JSON.stringify(result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}

            {state === "call" && (
              <div className="text-muted-foreground text-xs">
                Tool call in progress...
              </div>
            )}

            {state === "partial-call" && (
              <div className="text-muted-foreground text-xs">
                Streaming tool call parameters...
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
