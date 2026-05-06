import { useCallback, useEffect, useState } from "react";

const TOAST_DURATION_MS = 3000;

interface UseErrorToastArgs {
  error: Error | undefined;
  /** Predicate for errors that should be silenced (e.g. handled 401s). */
  shouldIgnore?: (error: Error) => boolean;
}

interface UseErrorToastResult {
  /** Whether the toast is currently visible. */
  visible: boolean;
  /** Current message to display, or `null` when hidden. */
  message: string | null;
  /** Manually dismiss the toast. */
  dismiss: () => void;
}

/**
 * Surfaces an error as a self-dismissing toast. Errors matching
 * `shouldIgnore` (e.g. 401 errors handled elsewhere) are suppressed.
 */
export function useErrorToast({
  error,
  shouldIgnore,
}: UseErrorToastArgs): UseErrorToastResult {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!error || shouldIgnore?.(error)) return;

    setMessage(error.message);
    setVisible(true);

    const timer = window.setTimeout(dismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [error, shouldIgnore, dismiss]);

  return { visible, message, dismiss };
}
