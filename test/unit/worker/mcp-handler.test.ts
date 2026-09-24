import { describe, expect, mock, test } from "bun:test";
import { HttpError } from "../../../worker/types/types";

let introspectionError = new HttpError(401, "invalid api key");

await mock.module("agents/mcp", () => ({
  McpAgent: class {},
}));
await mock.module("../../../worker/mcp/mcp", () => ({
  PerigonMCP: class {},
}));
await mock.module("../../../worker/lib/perigon", () => ({
  Perigon: class {
    introspection() {
      return Promise.reject(introspectionError);
    }
  },
}));
await mock.module("../../../worker/mcp/tools/selection", () => ({
  parseRequestedTools: () => undefined,
  resolveToolParam: () => null,
}));

const { handleMCP } = await import("../../../worker/handlers/mcp");

const KEYS_URL = "https://perigon.io/dev/keys";

const env = {
  MCP_RATE_LIMITER: {
    limit: async () => ({ success: true }),
  },
} as unknown as Env;

const ctx = {} as ExecutionContext;

function mcpRequest(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("Authorization", authorization);
  }
  return new Request("https://mcp.perigon.io/v1/mcp", {
    method: "POST",
    headers,
  });
}

describe("handleMCP auth errors", () => {
  test("tells a caller with no bearer token where to get an API key", async () => {
    const response = await handleMCP(mcpRequest(), env, ctx);

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string; details: string };
    expect(body.error).toBe("Unauthorized");
    expect(body.details).toContain(KEYS_URL);
  });

  test("replaces an introspection 401 with the API key help", async () => {
    introspectionError = new HttpError(401, "invalid api key");

    const response = await handleMCP(
      mcpRequest("Bearer not-a-real-key"),
      env,
      ctx,
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string; details: string };
    expect(body.error).toBe("Failed to process MCP request");
    expect(body.details).toContain(KEYS_URL);
    expect(body.details).not.toContain("invalid api key");
  });

  test("keeps the upstream body for a non-401 introspection failure", async () => {
    introspectionError = new HttpError(403, "plan does not include this");

    const response = await handleMCP(
      mcpRequest("Bearer some-other-key"),
      env,
      ctx,
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string; details: string };
    expect(body.details).toBe("plan does not include this");
  });
});
