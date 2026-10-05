export const DEFAULT_MCP_PUBLIC_URL = "https://mcp.perigon.io";
export const DEFAULT_PERIGON_API_URL = "https://api.perigon.io";
export const DEFAULT_PERIGON_APP_URL = "https://www.perigon.io";

export function mcpPublicOrigin(env: Env): string {
  return (env.MCP_PUBLIC_URL ?? DEFAULT_MCP_PUBLIC_URL).replace(/\/$/, "");
}

export function perigonApiOrigin(env: Env): string {
  return (env.PERIGON_API_URL ?? DEFAULT_PERIGON_API_URL).replace(/\/$/, "");
}

export function perigonAppOrigin(env: Env): string {
  return (env.PERIGON_APP_URL ?? DEFAULT_PERIGON_APP_URL).replace(/\/$/, "");
}
