import { HttpError } from "./types/error";

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

    throw new HttpError(response.status, responseBody);
  }

  const typedResp = (await response.json()) as T;
  return typedResp;
}
