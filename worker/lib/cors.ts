const CORS_ENABLED_PATHS = new Set(["/v1/api/chat", "/v1/api/tools"]);

const PRODUCTION_ORIGINS = new Set([
  "https://mcp.perigon.io",
  "https://perigon.io",
  "https://www.perigon.io",
  "https://vercel-local.perigon.io",
]);

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const PRODUCTION_ENVIRONMENT = "production";

const ALLOW_METHODS = "GET, POST, OPTIONS";
const ALLOW_HEADERS = [
  "Authorization",
  "Content-Type",
  "X-Anthropic-API-Key",
  "X-Perigon-API-Key",
].join(", ");

interface CorsEnv {
  ANTHROPIC_API_KEY?: string;
  ENVIRONMENT?: string;
  ALLOW_LOCAL_CORS?: boolean | string;
}

export function isCorsEnabledPath(pathname: string): boolean {
  return CORS_ENABLED_PATHS.has(pathname);
}

export function createCorsPreflightResponse(
  request: Request,
  env: CorsEnv,
): Response | null {
  const { pathname } = new URL(request.url);
  if (request.method !== "OPTIONS" || !isCorsEnabledPath(pathname)) {
    return null;
  }

  const origin = getAllowedOrigin(request, env);
  if (!origin) {
    return new Response("CORS origin not allowed", { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export function withCorsHeaders(
  request: Request,
  response: Response,
  env: CorsEnv,
): Response {
  const { pathname } = new URL(request.url);
  const origin = getAllowedOrigin(request, env);
  if (!origin || !isCorsEnabledPath(pathname)) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [key, value] of buildCorsHeaders(origin)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getAllowedOrigin(request: Request, env: CorsEnv): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;

  if (PRODUCTION_ORIGINS.has(origin)) {
    return origin;
  }

  try {
    const url = new URL(origin);
    if (
      isLocalCorsAllowed(env) &&
      (url.protocol === "http:" || url.protocol === "https:") &&
      LOCALHOST_HOSTNAMES.has(url.hostname)
    ) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function isLocalCorsAllowed(env: CorsEnv): boolean {
  return (
    env.ENVIRONMENT !== PRODUCTION_ENVIRONMENT &&
    parseBooleanEnv(env.ALLOW_LOCAL_CORS)
  );
}

function parseBooleanEnv(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  return value === "true";
}

function buildCorsHeaders(origin: string): Headers {
  return new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
}
