/** Replaced at build time by Vite `define`; absent under `bun test`. */
declare const __GIT_SHA__: string | undefined;

const GIT_SHA =
  typeof __GIT_SHA__ === "string" && __GIT_SHA__ ? __GIT_SHA__ : "unknown";

/** `User-Agent` sent on every worker-originated request to the Perigon API. */
export const PERIGON_MCP_USER_AGENT = `perigon-mcp-server/${GIT_SHA}`;
