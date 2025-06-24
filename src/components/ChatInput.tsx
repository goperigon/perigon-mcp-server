import React, { useRef, useEffect } from "react";

interface ChatInputProps {
  input: string;
  status: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function ChatInput({ input, status, onInputChange, onSubmit }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = "48px";
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 128) + "px";
  };

  return (
    <form onSubmit={onSubmit} className="py-4 pb-8 bg-transparent">
      <div className="flex gap-2 items-center bg-surface rounded-2xl p-2 shadow-md hover:shadow-lg transition-shadow duration-200 border border-border">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 bg-transparent rounded-3xl text-base text-light outline-none resize-none min-h-[48px] max-h-32 overflow-y-auto focus:ring-2 focus:ring-gold/60 focus:shadow-lg focus:shadow-gold/20 transition-all duration-300 placeholder:text-text-secondary"
          rows={1}
          onInput={handleInput}
        />
        <button
          type="submit"
          disabled={status === "submitted" || status === "streaming"}
          className="px-6 py-3 bg-gold text-dark border-none rounded-3xl text-base font-medium cursor-pointer hover:bg-gold-muted hover:shadow-md disabled:bg-light-gray disabled:cursor-not-allowed transition-all duration-200"
        >
          Send
        </button>
      </div>
    </form>
  );
}