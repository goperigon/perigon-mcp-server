import { hashKey } from "./hash";

const EXCHANGE_CACHE_TTL_MS = 5 * 60 * 1000;

const exchangeCache = new Map<
  string,
  { apiKey: string; expiresAt: number }
>();

interface TokenExchangeResponse {
  apiKey: string;
  organizationId: number;
}

function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

export function isMcpOAuthAccessToken(token: string): boolean {
  return looksLikeJwt(token);
}

export async function exchangeMcpAccessTokenForApiKey(
  token: string,
  env: Env,
): Promise<string> {
  if (!looksLikeJwt(token)) {
    return token;
  }

  const cacheKey = await hashKey(token);
  const cached = exchangeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.apiKey;
  }

  const perigonApiUrl = env.PERIGON_API_URL.replace(/\/$/, "");
  const response = await fetch(`${perigonApiUrl}/v1/internal/mcp/token-exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-perigon-shared-secret": env.PERIGON_SHARED_SECRET,
    },
    body: JSON.stringify({ access_token: token }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new McpTokenExchangeError(response.status, body);
  }

  const payload = (await response.json()) as TokenExchangeResponse;
  exchangeCache.set(cacheKey, {
    apiKey: payload.apiKey,
    expiresAt: Date.now() + EXCHANGE_CACHE_TTL_MS,
  });
  return payload.apiKey;
}

export class McpTokenExchangeError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super("MCP token exchange failed");
    this.name = "McpTokenExchangeError";
  }
}
