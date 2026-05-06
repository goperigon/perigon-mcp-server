import { PerigonMCP } from "./mcp/mcp";
import {
  handleChat,
  handleMCP,
  handlePerigonApiKeys,
  handleTools,
  handleTurnstileAuth,
  handleValidateUser,
} from "./handlers";

export { PerigonMCP };

type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => Promise<Response> | Response;

/**
 * Path → handler routing table. Listed top-to-bottom in priority order; the
 * first exact match wins. Keep this small and side-effect free; the actual
 * work happens in the dedicated handlers under `./handlers/`.
 */
const ROUTES: Record<string, RouteHandler> = {
  "/v1/auth": handleTurnstileAuth,
  "/v1/validate-user": handleValidateUser,
  "/v1/perigon-api-keys": handlePerigonApiKeys,
  "/v1/api/chat": handleChat,
  "/v1/api/tools": handleTools,
  "/v1/sse": handleMCP,
  "/v1/sse/message": handleMCP,
  "/v1/mcp": handleMCP,
};

const NOT_FOUND = new Response("Not found", { status: 404 });

function ensureAnthropicKey(env: Env): Response | null {
  if (env.ANTHROPIC_API_KEY) return null;
  console.error("ANTHROPIC_API_KEY is not set");
  return Response.json({ error: "ANTHROPIC_API_KEY is not set" }, {
    status: 500,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const missingKey = ensureAnthropicKey(env);
    if (missingKey) return missingKey;

    const { pathname } = new URL(request.url);
    const handler = ROUTES[pathname];
    if (!handler) return NOT_FOUND;

    return handler(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
