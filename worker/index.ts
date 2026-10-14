import { PerigonMCP } from "./mcp/mcp";
import {
  handleChat,
  handleMCP,
  handleOAuthMetadata,
  handleOAuthAuthorizeRedirect,
  handlePerigonApiKeys,
  isOAuthApiProxyPath,
  isOAuthAuthorizePath,
  proxyOAuthApiRequest,
  handleTools,
  handleTurnstileAuth,
  handleValidateUser,
  isOAuthMetadataPath,
} from "./handlers";
import { createCorsPreflightResponse, withCorsHeaders } from "./lib/cors";

export { PerigonMCP };

type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
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

function ensureAnthropicKey(env: Env): Response | null {
  if (env.ANTHROPIC_API_KEY) return null;
  console.error("ANTHROPIC_API_KEY is not set");
  return Response.json(
    { error: "ANTHROPIC_API_KEY is not set" },
    {
      status: 500,
    },
  );
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const { pathname } = new URL(request.url);

    // Public proof of domain ownership for the OpenAI plugin submission.
    // This endpoint must work without authentication or an AI provider key.
    if (pathname === "/.well-known/openai-apps-challenge") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        });
      }
      return new Response(
        request.method === "HEAD"
          ? null
          : "k1tdjijKlL-kd7aPBhSQZWttWmO5fVdKcdMkW_m6k5U",
        { headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    const preflightResponse = createCorsPreflightResponse(request, env);
    if (preflightResponse) return preflightResponse;

    const missingKey = ensureAnthropicKey(env);
    if (missingKey) return withCorsHeaders(request, missingKey, env);

    if (isOAuthMetadataPath(pathname)) {
      const metadataResponse = handleOAuthMetadata(request, env);
      return withCorsHeaders(request, metadataResponse, env);
    }

    if (isOAuthAuthorizePath(pathname)) {
      const authorizeResponse = handleOAuthAuthorizeRedirect(request, env);
      return withCorsHeaders(request, authorizeResponse, env);
    }

    if (isOAuthApiProxyPath(pathname)) {
      const proxyResponse = await proxyOAuthApiRequest(request, env);
      return withCorsHeaders(request, proxyResponse, env);
    }

    const handler = ROUTES[pathname];
    if (!handler) {
      return withCorsHeaders(
        request,
        new Response("Not found", { status: 404 }),
        env,
      );
    }

    const response = await handler(request, env, ctx);
    return withCorsHeaders(request, response, env);
  },
} satisfies ExportedHandler<Env>;
