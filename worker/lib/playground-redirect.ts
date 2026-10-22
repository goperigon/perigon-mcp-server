import { isPublicMcpRequest } from "./mcp-env";

/** Canonical MCP playground UI (sandbox app). */
export const MCP_PLAYGROUND_URL = "https://perigon.io/mcp";

/**
 * Only the legacy playground UI paths redirect. Everything else (including
 * `/.well-known/*` OAuth discovery probes from MCP clients) must keep its
 * existing response so client fallbacks behave the same.
 */
function isPlaygroundPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/inspector" ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/")
  );
}

export function buildPlaygroundRedirectUrl(requestUrl: URL): URL {
  const dest = new URL(MCP_PLAYGROUND_URL);
  const { pathname } = requestUrl;

  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    dest.searchParams.set("tab", "chat");
  }

  requestUrl.searchParams.forEach((value, key) => {
    dest.searchParams.append(key, value);
  });

  return dest;
}

/** Browser UI on mcp.perigon.io → sandbox playground. MCP stays on /v1/*. */
export function playgroundRedirectResponse(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  if (!isPublicMcpRequest(request)) {
    return null;
  }

  const url = new URL(request.url);
  if (!isPlaygroundPath(url.pathname)) {
    return null;
  }

  // An SSE client pointed at the bare origin must not be sent to an HTML page.
  if (request.headers.get("Accept")?.includes("text/event-stream")) {
    return null;
  }

  return Response.redirect(buildPlaygroundRedirectUrl(url).toString(), 302);
}
