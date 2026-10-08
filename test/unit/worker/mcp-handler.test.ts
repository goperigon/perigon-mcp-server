import { afterEach, describe, expect, mock, test } from "bun:test";
import type { Props } from "../../../worker/mcp/mcp";
import { HttpError } from "../../../worker/types/types";
import { restoreFetch } from "../../helpers/mock-fetch";

let introspectionError = new HttpError(401, "invalid api key");
let introspectionSucceeds = false;
const introspectionSuccess = {
  scopes: [],
  organizationId: 1,
};

let sessionPropsFromDispatch: Props | undefined;

await mock.module("agents/mcp", () => ({
  McpAgent: class {},
}));
await mock.module("../../../worker/mcp/mcp", () => ({
  PerigonMCP: class {
    static serve(_path: string) {
      return {
        fetch: (
          _request: Request,
          _env: Env,
          ctx: ExecutionContext & { props?: Props },
        ) => {
          sessionPropsFromDispatch = ctx.props;
          return Promise.resolve(new Response("ok", { status: 200 }));
        },
      };
    }
  },
}));
await mock.module("../../../worker/lib/perigon", () => ({
  Perigon: class {
    introspection() {
      if (introspectionSucceeds) {
        return Promise.resolve(introspectionSuccess);
      }
      return Promise.reject(introspectionError);
    }
  },
}));
const { handleMCP } = await import("../../../worker/handlers/mcp");

const KEYS_URL = "https://perigon.io/dev/keys";

const env = {
  MCP_PUBLIC_URL: "https://mcp.perigon.io",
  PERIGON_API_URL: "https://api.test.local",
  MCP_RATE_LIMITER: {
    limit: async () => ({ success: true }),
  },
} as unknown as Env;

afterEach(() => {
  restoreFetch();
  introspectionSucceeds = false;
  sessionPropsFromDispatch = undefined;
});

function testJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${encode({ alg: "none" })}.${encode(payload)}.sig`;
}

const ctx = {} as ExecutionContext;

function mcpRequest(authorization?: string, url?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("Authorization", authorization);
  }
  return new Request(url ?? "https://mcp.perigon.io/v1/mcp", {
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

  test("returns 503 for transient introspection failures without OAuth challenge", async () => {
    introspectionError = new HttpError(503, "upstream unavailable");

    const response = await handleMCP(
      mcpRequest("Bearer some-other-key"),
      env,
      ctx,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("WWW-Authenticate")).toBeNull();
    const body = (await response.json()) as { details: string };
    expect(body.details).toBe("upstream unavailable");
  });

  test("uses default MCP public URL in OAuth challenge when env is unset", async () => {
    const response = await handleMCP(
      mcpRequest(),
      {} as Env,
      ctx,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain(
      "https://mcp.perigon.io/.well-known/oauth-protected-resource",
    );
  });
});

describe("handleMCP tool filter forwarding", () => {
  test("?tools=all forwards explicitAllTools and null requestedTools to the session", async () => {
    introspectionSucceeds = true;

    const response = await handleMCP(
      mcpRequest(
        "Bearer test-key-tools-all",
        "https://mcp.perigon.io/v1/mcp?tools=all",
      ),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(sessionPropsFromDispatch).toEqual(
      expect.objectContaining({
        requestedTools: null,
        explicitAllTools: true,
      }),
    );
  });
});
