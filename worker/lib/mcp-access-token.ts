const JWT_SEGMENT_COUNT = 3;

/** MCP OAuth access tokens are JWTs (three base64url segments). */
export function looksLikeMcpAccessToken(token: string): boolean {
  return token.split(".").length === JWT_SEGMENT_COUNT;
}

/** Returns JWT `exp` in milliseconds, or null when absent or unparsable. */
export function mcpAccessTokenExpiryMs(token: string): number | null {
  if (!looksLikeMcpAccessToken(token)) {
    return null;
  }

  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;
    const padded = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Introspection cache TTL for bearer credentials. API keys may reuse cached
 * introspection briefly. MCP OAuth JWTs are not cached so revocation and scope
 * changes are visible on the next request.
 */
export function introspectionCacheTtlMs(
  bearerToken: string,
  maxTtlMs: number,
): number {
  if (looksLikeMcpAccessToken(bearerToken)) {
    return 0;
  }

  return maxTtlMs;
}
