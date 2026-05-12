import React from "react";
import { Send, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTextareaAutoResize } from "@/hooks/use-textarea-auto-resize";
import { TOOL_COUNT } from "@/lib/mcp-tools";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  disabled: boolean;
  canSubmit: boolean;
  /** Opens the tool selector settings dialog. */
  onSettingsOpen: () => void;
  /** Number of currently active tools (used to show filter badge). */
  activeToolCount: number;
}

/**
 * The chat composer at the bottom of the playground: auto-resizing textarea,
 * Enter-to-send / Shift+Enter for newline, Send and Clear buttons.
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  onClear,
  disabled,
  canSubmit,
  onSettingsOpen,
  activeToolCount,
}: ChatInputProps) {
  const textareaRef = useTextareaAutoResize(value);
  const isFiltered = activeToolCount < TOOL_COUNT;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!canSubmit) return;
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <div className="shrink-0 border-t border-border backdrop-blur-sm p-6">
      <div className="max-w-4xl mx-auto">
        <div className="font-mono text-xs text-muted-foreground mb-4 hidden sm:block">
          INPUT CONSOLE • Press Enter to send, Shift+Enter for new line
        </div>
        <form onSubmit={onSubmit} className="flex space-x-3">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your query here..."
            className="flex-1 font-mono text-sm resize-none min-h-[60px] max-h-[120px] focus-visible:ring-0 text-foreground"
          />
          <Button
            type="submit"
            disabled={disabled}
            className="font-mono mt-3"
            variant="outline"
          >
            <Send className="size-4" />
            SEND
          </Button>
          <Button
            type="button"
            onClick={onClear}
            className="font-mono mt-3"
            variant="ghost"
            title="Clear conversation"
          >
            <Trash2 className="size-4" />
            CLEAR
          </Button>
          <div className="relative mt-3">
            <Button
              type="button"
              onClick={onSettingsOpen}
              variant="ghost"
              size="icon"
              title={
                isFiltered
                  ? `Tool settings (${activeToolCount}/${TOOL_COUNT} active)`
                  : "Tool settings"
              }
              className={isFiltered ? "text-primary" : ""}
            >
              <Settings2 className="size-4" />
            </Button>
            {isFiltered && (
              <span className="pointer-events-none absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
                {activeToolCount}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
