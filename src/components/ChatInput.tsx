import { useRef, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from "react";

interface ChatInputProps {
  input: string;
  status: string;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function ChatInput({
  input,
  status,
  onInputChange,
  onSubmit,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = "56px";
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const handleInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    const newHeight = Math.min(target.scrollHeight, 128);
    target.style.height = newHeight + "px";
    
    // Show scrollbar only when content exceeds max height
    if (target.scrollHeight > 128) {
      target.style.overflowY = "auto";
    } else {
      target.style.overflowY = "hidden";
    }
  };

  return (
    <form onSubmit={onSubmit} className="py-4 pb-8 bg-transparent">
      <div className="flex gap-2 items-center bg-surface rounded-2xl p-2 shadow-md hover:shadow-lg transition-all duration-200 border border-border">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 px-6 py-4 bg-transparent rounded-3xl text-[0.875rem] text-light outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-transparent resize-none min-h-[56px] max-h-32 overflow-y-hidden transition-all duration-200 placeholder:text-text-secondary tracking-[0.01em]"
          rows={1}
          onInput={handleInput}
        />
        <button
          type="submit"
          disabled={status === "submitted" || status === "streaming"}
          className="min-w-[120px] px-6 py-3 bg-primary text-light border-none rounded-xl text-[0.875rem] font-medium cursor-pointer hover:bg-primary/90 hover:shadow-md disabled:bg-primary/30 disabled:text-light/50 disabled:cursor-not-allowed transition-all duration-200"
        >
          Send
        </button>
      </div>
    </form>
  );
}
