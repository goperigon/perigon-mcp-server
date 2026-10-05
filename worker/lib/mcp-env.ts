export const DEFAULT_MCP_PUBLIC_URL = "https://mcp.perigon.io";
export const DEFAULT_PERIGON_API_URL = "https://api.perigon.io";
export const DEFAULT_PERIGON_APP_URL = "https://www.perigon.io";

const LOCAL_DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function stripTrailingSlash(origin: string): string {
  return origin.replace(/\/$/, "");
}

function hostnameFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

function isLocalDevOrigin(origin: string): boolean {
  const hostname = hostnameFromOrigin(origin);
  return hostname != null && LOCAL_DEV_HOSTNAMES.has(hostname);
}

/** True when the request hit the public MCP host (not wrangler/miniflare localhost). */
function isPublicMcpRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === "mcp.perigon.io";
}

/**
 * Wrangler's default deploy target uses local dev vars. If those vars were
 * deployed to mcp.perigon.io, OAuth clients would discover localhost endpoints.
 * Prefer the request origin (and production defaults for upstream URLs) on the
 * public host when env still points at local dev.
 */
function shouldIgnoreLocalDevEnv(
  configuredOrigin: string,
  request?: Request,
): request is Request {
  return (
    request != null &&
    isPublicMcpRequest(request) &&
    isLocalDevOrigin(configuredOrigin)
  );
}

export function mcpPublicOrigin(env: Env, request?: Request): string {
  const configured = stripTrailingSlash(
    env.MCP_PUBLIC_URL ?? DEFAULT_MCP_PUBLIC_URL,
  );
  if (shouldIgnoreLocalDevEnv(configured, request)) {
    return new URL(request.url).origin;
  }
  return configured;
}

export function perigonApiOrigin(env: Env, request?: Request): string {
  const configured = stripTrailingSlash(
    env.PERIGON_API_URL ?? DEFAULT_PERIGON_API_URL,
  );
  if (shouldIgnoreLocalDevEnv(configured, request)) {
    return DEFAULT_PERIGON_API_URL;
  }
  return configured;
}

export function perigonAppOrigin(env: Env, request?: Request): string {
  const configured = stripTrailingSlash(
    env.PERIGON_APP_URL ?? DEFAULT_PERIGON_APP_URL,
  );
  if (shouldIgnoreLocalDevEnv(configured, request)) {
    return DEFAULT_PERIGON_APP_URL;
  }
  return configured;
}
