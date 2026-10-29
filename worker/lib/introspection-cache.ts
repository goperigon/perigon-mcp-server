import type { AuthIntrospectionResponse } from "../types/types";
import type { Perigon } from "./perigon";
import { hashKey } from "./hash";
import { introspectionCacheTtlMs } from "./mcp-access-token";

/**
 * `introspection()` was previously called on every single MCP request. This
 * caches the result per API key for the isolate's lifetime (bounded by TTL),
 * so a session sending many requests in quick succession pays for one
 * introspection call rather than one per request.
 *
 * Entries are keyed by API origin as well as key: the same key can resolve to
 * different scopes and social sources on a local or staging API.
 */
const INTROSPECTION_CACHE_TTL_MS = 5 * 60 * 1000;
const introspectionCache = new Map<
  string,
  { result: AuthIntrospectionResponse; expiresAt: number }
>();

export async function getCachedIntrospection(
  perigon: Perigon,
  apiKey: string,
  apiOrigin: string,
): Promise<AuthIntrospectionResponse> {
  const cacheKey = `${apiOrigin} ${await hashKey(apiKey)}`;
  const cached = introspectionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const result = await perigon.introspection();
    const ttlMs = introspectionCacheTtlMs(apiKey, INTROSPECTION_CACHE_TTL_MS);
    if (ttlMs > 0) {
      introspectionCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + ttlMs,
      });
    }
    return result;
  } catch (error) {
    introspectionCache.delete(cacheKey);
    throw error;
  }
}
