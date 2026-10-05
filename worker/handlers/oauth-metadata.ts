import { mcpPublicOrigin } from "../lib/mcp-env";

const PROTECTED_RESOURCE_PATHS = new Set([
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/v1/mcp",
]);

export function isOAuthMetadataPath(pathname: string): boolean {
  return (
    PROTECTED_RESOURCE_PATHS.has(pathname) ||
    pathname === "/.well-known/oauth-authorization-server"
  );
}

export function handleOAuthMetadata(request: Request, env: Env): Response {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { pathname } = new URL(request.url);
  const mcpPublicUrl = mcpPublicOrigin(env, request);

  if (PROTECTED_RESOURCE_PATHS.has(pathname)) {
    return Response.json({
      resource: mcpPublicUrl,
      authorization_servers: [mcpPublicUrl],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://perigon.io/docs/api/mcp",
    });
  }

  if (pathname === "/.well-known/oauth-authorization-server") {
    return Response.json({
      issuer: mcpPublicUrl,
      authorization_endpoint: `${mcpPublicUrl}/oauth/authorize`,
      token_endpoint: `${mcpPublicUrl}/v1/mcp/oauth/token`,
      registration_endpoint: `${mcpPublicUrl}/v1/mcp/oauth/register`,
      revocation_endpoint: `${mcpPublicUrl}/v1/mcp/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      registration_endpoint_auth_methods_supported: ["none"],
    });
  }

  return new Response("Not found", { status: 404 });
}
