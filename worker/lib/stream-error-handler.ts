import { InvalidToolInputError, NoSuchToolError } from "ai";

/**
 * Pair of `[clientMessage, logMessage]`. Only the first is forwarded to the
 * client; the second is kept verbose for server-side debugging.
 */
type ErrorMessages = readonly [string, string];

/**
 * Map a streamText error to a sanitized client message + a verbose log line.
 * Recognises the well-known typed AI SDK errors and falls back to a generic
 * pair for everything else.
 */
function classifyStreamError(error: unknown): ErrorMessages {
  if (NoSuchToolError.isInstance(error)) {
    return [
      "Model tried to call an unknown tool",
      `Model tried to call unknown tool: ${error.toolName} - ${error.message}`,
    ];
  }

  if (InvalidToolInputError.isInstance(error)) {
    return [
      "Model called a tool with invalid arguments",
      `Model called tool: ${error.toolName} with invalid input: ${error.toolInput} - ${error.message}`,
    ];
  }

  return ["An unknown error occurred", `Unknown error: ${String(error)}`];
}

/**
 * Builds the `onError` callback for `result.toUIMessageStreamResponse`. The
 * returned string is forwarded to the client; everything else is logged on
 * the server.
 */
export function createStreamErrorHandler(): (error: unknown) => string {
  return (error) => {
    const [clientMessage, logMessage] = classifyStreamError(error);
    console.error("Error while processing chat response:", logMessage);
    return clientMessage;
  };
}

/** `streamText({ onError })` callback for server-side logging only. */
export function logStreamTextError({ error }: { error: unknown }): void {
  console.error("streamText error:", error);
}
