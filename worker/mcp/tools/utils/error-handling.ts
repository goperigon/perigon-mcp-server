import {
  ResponseError,
  FetchError,
  RequiredError,
} from "@goperigon/perigon-ts";

/**
 * Create a standardized error message from various error types
 * @param error The error object to process
 * @returns Promise resolving to error message string
 */
export async function createErrorMessage(error: any): Promise<string> {
  let msg: string | undefined;
  
  if (error instanceof ResponseError) {
    msg = await error.response.text();
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