import {
  ResponseError,
  FetchError,
  RequiredError,
} from "@goperigon/perigon-ts";
import { HttpError } from "../../../types/types";

/**
 * Try to extract a human-readable message from an api.perigon.io error body.
 * The API typically returns JSON like `{"timestamp":...,"status":500,"message":"...","error":"...","path":"..."}`,
 * but on some 5xxs it returns a plain string such as "internal error; reference = abc123".
 * We preserve any reference id since that's what the Perigon team uses to debug.
 */
function extractApiErrorMessage(status: number, body: string): string {
  if (!body) return `Request failed with status: ${status}`;

  const trimmed = body.trim();
  // JSON body: prefer message > error > raw
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        message?: string;
        error?: string;
        path?: string;
      };
      const parts = [parsed.message, parsed.error].filter(
        (p): p is string => typeof p === "string" && p.length > 0
      );
      if (parts.length > 0) {
        return `${parts.join(" — ")} (status ${status}${
          parsed.path ? `, path ${parsed.path}` : ""
        })`;
      }
    } catch {
      // fall through to raw body
    }
  }

  // Plain-text body — surface as-is so trace refs survive
  return `${trimmed} (status ${status})`;
}

/**
 * Create a standardized error message from various error types
 * @param error The error object to process
 * @returns Promise resolving to error message string
 */
export async function createErrorMessage(error: any): Promise<string> {
  let msg: string | undefined;

  if (error instanceof HttpError) {
    msg = extractApiErrorMessage(error.statusCode, error.responseBody);
  } else if (error instanceof ResponseError) {
    const body = await error.response.text().catch(() => "");
    msg = extractApiErrorMessage(error.response.status, body);
  } else if (error instanceof FetchError) {
    msg = error.cause.message;
  } else if (error instanceof RequiredError) {
    msg = error.message;
  } else if (error instanceof Error) {
    msg = error.message;
  } else {
    msg = String(error);
  }

  return msg || "Unknown error occurred";
}