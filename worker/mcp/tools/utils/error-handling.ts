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
 * Coarse classification of an upstream error, used to append retry/troubleshooting
 * guidance the model can act on without re-deriving it from prose every time.
 */
export type ErrorClassification =
  | "plan-restriction"
  | "quota-exceeded"
  | "rate-limited"
  | "pagination-limit"
  | "not-found"
  | "unclassified";

const PLAN_RESTRICTION_PATTERN = /not supported by your plan/i;
const QUOTA_PATTERNS = [
  /quota/i,
  /usage limit/i,
  /requests? (used|remaining)/i,
];
const PAGINATION_PATTERNS = [/pagination/i, /page.{0,20}(limit|exceed)/i];

function classify(
  statusCode: number,
  body: string,
): ErrorClassification {
  if (statusCode === 429) return "rate-limited";
  if (statusCode === 404) return "not-found";
  if (statusCode === 403) {
    if (PLAN_RESTRICTION_PATTERN.test(body)) return "plan-restriction";
    if (QUOTA_PATTERNS.some((p) => p.test(body))) return "quota-exceeded";
    return "plan-restriction";
  }
  if (statusCode === 400 && PAGINATION_PATTERNS.some((p) => p.test(body))) {
    return "pagination-limit";
  }
  return "unclassified";
}

/** One-clause, model-actionable guidance per classification. `null` means no extra guidance is warranted. */
function guidanceFor(
  classification: ErrorClassification,
  retryAfterMillis?: number,
): string | null {
  switch (classification) {
    case "plan-restriction":
      return "This API key's plan does not include this parameter or endpoint — do not retry; call get_api_access to see what this key supports, or tell the user to upgrade their plan.";
    case "quota-exceeded":
      return "This API key has exhausted its usage quota for the current period — do not retry; call get_api_access to check remaining quota.";
    case "rate-limited":
      return retryAfterMillis
        ? `Rate limited — wait at least ${retryAfterMillis}ms before retrying this exact request.`
        : "Rate limited — wait briefly before retrying this exact request.";
    case "pagination-limit":
      return "Requested page/size exceeds this key's pagination limit — reduce page or size rather than retrying as-is.";
    case "not-found":
      return "The requested ID was not found — do not retry; verify the ID came from a prior search result on this same endpoint.";
    case "unclassified":
      return null;
  }
}

/**
 * Create a standardized error message from various error types
 * @param error The error object to process
 * @returns Promise resolving to error message string
 */
export async function createErrorMessage(error: any): Promise<string> {
  let msg: string | undefined;
  let statusCode: number | undefined;
  let body = "";
  let retryAfterMillis: number | undefined;

  if (error instanceof HttpError) {
    statusCode = error.statusCode;
    body = error.responseBody;
    retryAfterMillis = error.retryAfterMillis;
    msg = extractApiErrorMessage(statusCode, body);
  } else if (error instanceof ResponseError) {
    statusCode = error.response.status;
    body = await error.response.text().catch(() => "");
    msg = extractApiErrorMessage(statusCode, body);
  } else if (error instanceof FetchError) {
    msg = error.cause.message;
  } else if (error instanceof RequiredError) {
    msg = error.message;
  } else if (error instanceof Error) {
    msg = error.message;
  } else {
    msg = String(error);
  }

  if (!msg) return "Unknown error occurred";

  if (statusCode !== undefined) {
    const classification = classify(statusCode, body);
    const guidance = guidanceFor(classification, retryAfterMillis);
    if (guidance) return `${msg} — ${guidance}`;
  }

  return msg;
}