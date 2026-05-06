import { fetchPerigonApiKeys, getFirstApiKey } from "./api-keys-utils";

const PERIGON_API_KEY_HEADER = "X-Perigon-API-Key";

/**
 * Resolves the Perigon API key to use for a given request, in priority order:
 *   1. The explicit `X-Perigon-API-Key` header (works for both authenticated
 *      and unauthenticated callers).
 *   2. For authenticated Perigon users only: the first key returned from the
 *      Perigon `/v1/apiKeys` endpoint, fetched with the user's session cookie.
 *
 * Returns `null` if no key can be determined. The caller is responsible for
 * surfacing the appropriate HTTP error in that case.
 */
export async function resolvePerigonApiKey(
  request: Request,
  isAuthenticated: boolean,
  options: { fetchFallbackForAuthenticated?: boolean } = {}
): Promise<string | null> {
  const { fetchFallbackForAuthenticated = true } = options;

  const headerKey = request.headers.get(PERIGON_API_KEY_HEADER);
  if (headerKey && headerKey.trim().length > 0) {
    return headerKey;
  }

  if (isAuthenticated && fetchFallbackForAuthenticated) {
    try {
      const apiKeys = await fetchPerigonApiKeys(
        request.headers.get("Cookie") || ""
      );
      return getFirstApiKey(apiKeys);
    } catch (error) {
      console.error("Error fetching Perigon API keys:", error);
    }
  }

  return null;
}
