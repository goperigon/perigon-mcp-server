import { AuthIntrospectionResponse, HttpError } from "../types/types";
import { Perigon } from "../lib/perigon";
import { handleError } from "../lib/handle-error";
import { hashKey } from "../lib/hash";
import { McpAgent } from "agents/mcp";
import { PerigonMCP, type Props } from "../mcp/mcp";
import { introspectionCacheTtlMs } from "../lib/mcp-access-token";
import { mcpPublicOrigin } from "../lib/mcp-env";
import { parseRequestedTools, resolveToolParam } from "../mcp/tools/selection";

const SSE_PATHS = ["/v1/sse", "/v1/sse/message"] as const;
const STREAMABLE_PATH = "/v1/mcp";
const API_KEY_HELP =
  "Sign in with your Perigon account via OAuth, or create a free account and copy a key from https://perigon.io/dev/keys, then send it as Authorization: Bearer <key>.";

/**
 * `introspection()` was previously called on every single MCP request. This
 * caches the result per API key for the isolate's lifetime (bounded by TTL),
 * so a session sending many requests in quick succession pays for one
 * introspection call rather than one per request.
 */
const INTROSPECTION_CACHE_TTL_MS = 5 * 60 * 1000;
const introspectionCache = new Map<
  string,
  { result: AuthIntrospectionResponse; expiresAt: number }
>();

async function getCachedIntrospection(
  perigon: Perigon,
  apiKey: string,
): Promise<AuthIntrospectionResponse> {
  const cacheKey = await hashKey(apiKey);
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

/**
 * Authenticates the MCP request via the `Authorization: Bearer <key>` header
 * (a Perigon API key or MCP OAuth JWT), enforces a per-key rate limit, and
 * dispatches to the MCP transport (SSE or streamable HTTP).
 */
export async function handleMCP(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    const bearerToken = extractBearerKey(request);
    if (!bearerToken) {
      return unauthorizedResponse(request, env, "Unauthorized", API_KEY_HELP);
    }

    const apiKey = await resolveApiKey(bearerToken, env);

    const rateLimitResponse = await enforceRateLimit(apiKey, env);
    if (rateLimitResponse) return rateLimitResponse;

    const props = await loadMcpProps(request, apiKey, env);
    ctx.props = props;

    return dispatchMcp(request, env, ctx);
  } catch (error) {
    return handleMcpError(error, request, env);
  }
}

function extractBearerKey(request: Request): string | undefined {
  return request.headers.get("Authorization")?.split(" ")[1];
}

async function resolveApiKey(bearerToken: string, _env: Env): Promise<string> {
  return bearerToken;
}

/**
 * Per-key rate limit. Returns a 429 response if the limit is exceeded,
 * otherwise `null` to continue processing. Cloudflare's rate limiter is only
 * available in production (see https://github.com/cloudflare/workers-sdk/issues/8661).
 */
async function enforceRateLimit(
  apiKey: string,
  env: Env,
): Promise<Response | null> {
  const key = await hashKey(apiKey);
  const { success } = await env.MCP_RATE_LIMITER.limit({ key });
  if (success) return null;

  return handleError(
    "Rate limit exceeded",
    429,
    "You have exceeded allowed number of mcp related requests for this period",
  );
}

async function loadMcpProps(
  request: Request,
  apiKey: string,
  env: Env,
): Promise<Props> {
  const perigon = new Perigon(apiKey, env.PERIGON_API_URL);
  const apiKeyDetails = await getCachedIntrospection(perigon, apiKey);
  const requestedTools = parseRequestedTools(
    resolveToolParam(new URL(request.url)),
  );
  return {
    apiKey,
    scopes: apiKeyDetails.scopes,
    organizationId: apiKeyDetails.organizationId,
    requestedTools,
  };
}

function dispatchMcp(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> | Response {
  const { pathname } = new URL(request.url);

  // Cast required: TypeScript doesn't propagate static methods from a generic
  // abstract base class (McpAgent) onto the concrete subclass type.
  const McpAgentClass = PerigonMCP as unknown as typeof McpAgent;

  if (SSE_PATHS.includes(pathname as (typeof SSE_PATHS)[number])) {
    return McpAgentClass.serveSSE("/v1/sse").fetch(request, env, ctx);
  }

  if (pathname === STREAMABLE_PATH) {
    return McpAgentClass.serve(STREAMABLE_PATH).fetch(request, env, ctx);
  }

  return new Response("Not found", { status: 404 });
}

function unauthorizedResponse(
  request: Request,
  env: Env,
  error: string,
  details: string,
): Response {
  const resourceMetadata = `${mcpPublicOrigin(env, request)}/.well-known/oauth-protected-resource`;
  return Response.json(
    { error, details },
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadata}"`,
      },
    },
  );
}

function handleMcpError(
  error: unknown,
  request: Request,
  env: Env,
): Response {
  if (error instanceof HttpError) {
    if (error.statusCode === 401) {
      return unauthorizedResponse(
        request,
        env,
        "Failed to process MCP request",
        API_KEY_HELP,
      );
    }
    return handleError(
      "Failed to process MCP request",
      error.statusCode,
      error.responseBody,
    );
  }

  console.error("Failed to process MCP request", error);
  return handleError(
    "Failed to process MCP request",
    500,
    error instanceof Error ? error.message : "Unknown error",
  );
}
