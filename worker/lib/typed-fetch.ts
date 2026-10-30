import { HttpError } from "../types/types";

export async function typedFetch<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const responseBody = await response.text();
    console.error(
      `Failed to fetch: status: ${response.status} response: ${responseBody}`,
    );

    const retryAfterHeader = response.headers.get(
      "X-Rate-Limit-Retry-After-Millis",
    );
    const retryAfterMillis = retryAfterHeader
      ? Number(retryAfterHeader)
      : undefined;

    throw new HttpError(
      response.status,
      responseBody,
      undefined,
      Number.isFinite(retryAfterMillis) ? retryAfterMillis : undefined,
    );
  }

  const typedResp = (await response.json()) as T;
  return typedResp;
}
