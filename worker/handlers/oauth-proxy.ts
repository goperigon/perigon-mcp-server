import { perigonApiOrigin, perigonAppOrigin } from "../lib/mcp-env";

const OAUTH_API_PREFIX = "/v1/mcp/oauth/";

export function isOAuthAuthorizePath(pathname: string): boolean {
  return pathname === "/oauth/authorize";
}

export function isOAuthApiProxyPath(pathname: string): boolean {
  return pathname.startsWith(OAUTH_API_PREFIX);
}

/** Browser authorize step: same host as issuer, UI on the app origin. */
export function handleOAuthAuthorizeRedirect(
  request: Request,
  env: Env,
): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const appOrigin = perigonAppOrigin(env, request);
  const incoming = new URL(request.url);
  const target = new URL("/oauth/authorize", appOrigin);
  target.search = incoming.search;

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 302,
      headers: { Location: target.toString() },
    });
  }

  return Response.redirect(target.toString(), 302);
}

/** Token, registration, and revocation live on the API; expose them on the MCP origin for OAuth metadata consistency. */
export async function proxyOAuthApiRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const apiOrigin = perigonApiOrigin(env, request);
  const incoming = new URL(request.url);
  const target = `${apiOrigin}${incoming.pathname}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  return fetch(target, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
    redirect: "manual",
  });
}
