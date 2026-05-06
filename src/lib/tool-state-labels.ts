/**
 * AI SDK v5 tool-invocation states. Listed in their natural lifecycle order.
 */
export type ToolInvocationState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

const STATE_LABELS: Record<ToolInvocationState, string> = {
  "input-streaming": "STREAMING",
  "input-available": "RUNNING",
  "output-available": "RESULT",
  "output-error": "ERROR",
};

/** Human-readable badge label for a tool invocation state. */
export function getToolStateLabel(state: string | undefined): string {
  if (!state) return "";
  return STATE_LABELS[state as ToolInvocationState] ?? state.toUpperCase();
}
