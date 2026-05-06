import { useEffect, useRef } from "react";

const MAX_HEIGHT_PX = 120;

/**
 * Auto-resizes a textarea to fit its content, capped at `MAX_HEIGHT_PX`.
 * Re-runs whenever `value` changes. Returns the ref to attach to the element.
 */
export function useTextareaAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  return ref;
}
