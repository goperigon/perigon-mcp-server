import { HttpError } from "../types/types";
import { Perigon } from "../lib/perigon";
import { handleError } from "../lib/handle-error";
import { hashKey } from "../lib/hash";
import { PerigonMCP, type Props } from "../mcp/mcp";

const SSE_PATHS = ["/v1/sse", "/v1/sse/message"] as const;
const STREAMABLE_PATH = "/v1/mcp";

/**
 * Authenticates the MCP request via the `Authorization: Bearer <key>` header
 * (a Perigon API key), enforces a per-key rate limit, and dispatches to the
 * MCP transport (SSE or streamable HTTP).
 */
export async function handleMCP(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const apiKey = extractBearerKey(request);
    if (!apiKey) {
      return handleError("Unauthorized", 401);
    }

    const rateLimitResponse = await enforceRateLimit(apiKey, env);
    if (rateLimitResponse) return rateLimitResponse;

    const props = await loadMcpProps(apiKey);
    ctx.props = props;

    return dispatchMcp(request, env, ctx);
  } catch (error) {
    return handleMcpError(error);
  }
}

function extractBearerKey(request: Request): string | undefined {
  return request.headers.get("Authorization")?.split(" ")[1];
}

/**
 * Per-key rate limit. Returns a 429 response if the limit is exceeded,
 * otherwise `null` to continue processing. Cloudflare's rate limiter is only
 * available in production (see https://github.com/cloudflare/workers-sdk/issues/8661).
 */
async function enforceRateLimit(
  apiKey: string,
  env: Env
): Promise<Response | null> {
  const key = await hashKey(apiKey);
  const { success } = await env.MCP_RATE_LIMITER.limit({ key });
  if (success) return null;

  return handleError(
    "Rate limit exceeded",
    429,
    "You have exceeded allowed number of mcp related requests for this period"
  );
}

async function loadMcpProps(apiKey: string): Promise<Props> {
  const perigon = new Perigon(apiKey);
  const apiKeyDetails = await perigon.introspection();
  return {
    apiKey,
    scopes: apiKeyDetails.scopes,
  };
}

function dispatchMcp(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> | Response {
  const { pathname } = new URL(request.url);

  if (SSE_PATHS.includes(pathname as (typeof SSE_PATHS)[number])) {
    return PerigonMCP.serveSSE("/v1/sse").fetch(request, env, ctx);
  }

  if (pathname === STREAMABLE_PATH) {
    return PerigonMCP.serve(STREAMABLE_PATH).fetch(request, env, ctx);
  }

  return new Response("Not found", { status: 404 });
}

function handleMcpError(error: unknown): Response {
  console.error("Failed to process MCP request:", error);
  if (error instanceof HttpError) {
    return handleError(
      "Failed to process MCP request",
      error.statusCode,
      error.responseBody
    );
  }
  return handleError(
    "Failed to process MCP request",
    500,
    "Error: " + (error instanceof Error ? error.message : String(error))
  );
}
