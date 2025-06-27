import React, { useRef, useEffect } from "react";
import { TurnstileWidget, TurnstileWidgetRef } from "./TurnstileWidget";

const USE_TURNSTILE = import.meta.env.VITE_USE_TURNSTILE;

interface ChatInputProps {
  input: string;
  status: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  turnstileToken: string | null;
  onTurnstileVerify: (token: string) => void;
  siteKey: string;
}

export function ChatInput({
  input,
  status,
  onInputChange,
  onSubmit,
  turnstileToken,
  onTurnstileVerify,
  siteKey,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (USE_TURNSTILE && !turnstileToken) {
      return;
    }
    onSubmit(e);
    if (USE_TURNSTILE) {
      turnstileRef.current?.reset();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="py-4 pb-8 bg-transparent">
      <div className="flex flex-col gap-4">
        {USE_TURNSTILE && (
          <div className="flex justify-center">
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={siteKey}
              onVerify={onTurnstileVerify}
              onError={() => console.error("Turnstile verification failed")}
            />
          </div>
        )}
        <div className="flex gap-2 items-center bg-surface rounded-2xl p-2 shadow-md hover:shadow-lg transition-all duration-200 border border-border">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 px-6 py-4 bg-transparent rounded-3xl text-[0.875rem] text-light outline-none resize-none min-h-[48px] max-h-32 overflow-y-auto transition-all duration-200 placeholder:text-text-secondary tracking-[0.01em]"
            rows={1}
            onInput={handleInput}
          />
          <button
            type="submit"
            disabled={
              status === "submitted" ||
              status === "streaming" ||
              (USE_TURNSTILE && !turnstileToken)
            }
            className="min-w-[120px] px-6 py-3 bg-primary text-light border-none rounded-xl text-[0.875rem] font-medium cursor-pointer hover:bg-primary/90 hover:shadow-md disabled:bg-primary/30 disabled:text-light/50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
