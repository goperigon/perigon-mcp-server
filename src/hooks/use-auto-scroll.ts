import { useEffect, useRef } from "react";

const SMOOTH_SCROLL_DURATION_MS = 500;
const BOTTOM_TOLERANCE_PX = 10;

interface UseAutoScrollArgs<T> {
  /** Scrolls to the bottom whenever any of these change. */
  trigger: T;
  /** When this becomes truthy, the auto-scroll-disabled flag is reset. */
  resetTrigger: boolean;
}

/**
 * Returns a ref to attach to the scroll container. Auto-scrolls to the bottom
 * whenever `trigger` changes (e.g. when messages arrive or status flips), but
 * gives up if the user scrolls away mid-stream so we don't fight them.
 */
export function useAutoScroll<T>({
  trigger,
  resetTrigger,
}: UseAutoScrollArgs<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const disabledRef = useRef(false);
  const isAutoScrollingRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabledRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const current = ref.current;
      if (!current || disabledRef.current) return;
      isAutoScrollingRef.current = true;
      current.scrollTo({ top: current.scrollHeight, behavior: "smooth" });
      window.setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, SMOOTH_SCROLL_DURATION_MS);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [trigger]);

  useEffect(() => {
    if (resetTrigger) disabledRef.current = false;
  }, [resetTrigger]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      if (!isAutoScrollingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atBottom =
        scrollTop + clientHeight >= scrollHeight - BOTTOM_TOLERANCE_PX;
      if (!atBottom) {
        disabledRef.current = true;
        isAutoScrollingRef.current = false;
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return ref;
}
