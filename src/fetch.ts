import { type Result, Ok, Err } from "./types/result";

export class HttpError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string, message?: string) {
    super(message || `HTTP Error ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export async function fetchWithResult<T>(
  url: string,
  options: RequestInit,
): Promise<Result<T, HttpError | Error>> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const responseBody = await response.text();
      console.error(
        `Failed to fetch: status: ${response.status} response: ${responseBody}`,
      );

      return Err(
        new HttpError(
          response.status,
          responseBody,
          `Request failed with status: ${response.status}`,
        ),
      );
    }

    const jsonData = (await response.json()) as T;
    return Ok(jsonData);
  } catch (e) {
    return Err(
      new Error(
        `Failed to process request: ${e instanceof Error ? e.message : JSON.stringify(e)}`,
        {
          cause: e,
        },
      ),
    );
  }
}
