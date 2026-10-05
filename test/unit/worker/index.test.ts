import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";

// Stub PerigonMCP and the handlers BEFORE importing worker/index.
// `mock.module` rewrites the module graph so subsequent imports see the stub.

const handlerSpies = {
  handleChat: mock(async () => new Response("chat", { status: 200 })),
  handleMCP: mock(async () => new Response("mcp", { status: 200 })),
  handlePerigonApiKeys: mock(
    async () => new Response("api-keys", { status: 200 }),
  ),
  handleTools: mock(async () => new Response("tools", { status: 200 })),
  handleTurnstileAuth: mock(
    async () => new Response("turnstile", { status: 200 }),
  ),
  handleValidateUser: mock(
    async () => new Response("validate-user", { status: 200 }),
  ),
};

await mock.module("../../../worker/handlers", () => handlerSpies);
await mock.module("../../../worker/mcp/mcp", () => ({
  // Replace the Durable-Object-backed agent class with a no-op so importing
  // worker/index doesn't drag in the agents/mcp implementation.
  PerigonMCP: class {},
}));

const workerModule = await import("../../../worker/index");
const worker = workerModule.default;

const fakeEnv = { ANTHROPIC_API_KEY: "sk-ant-fake" } as unknown as Env;
const fakeLocalCorsEnv = {
  ANTHROPIC_API_KEY: "sk-ant-fake",
  ENVIRONMENT: "development",
  ALLOW_LOCAL_CORS: true,
} as unknown as Env;
const fakeProductionCorsEnv = {
  ANTHROPIC_API_KEY: "sk-ant-fake",
  ENVIRONMENT: "production",
  ALLOW_LOCAL_CORS: true,
} as unknown as Env;
const fakeCtx = {} as ExecutionContext;

beforeAll(() => {
  for (const fn of Object.values(handlerSpies)) fn.mockClear();
});

afterAll(() => {
  for (const fn of Object.values(handlerSpies)) fn.mockClear();
});

describe("worker/index ROUTES", () => {
  test("allowlisted playground API preflight returns CORS headers", async () => {
    const res = await worker.fetch(
      new Request("https://localhost/v1/api/tools", {
        method: "OPTIONS",
        headers: {
          Origin: "https://perigon.io",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "content-type,authorization,x-perigon-api-key",
        },
      }),
      {} as Env,
      fakeCtx,
    );

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://perigon.io",
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Perigon-API-Key",
    );
  });

  test.each([
    "https://perigon.io",
    "https://www.perigon.io",
    "https://app.perigon.io",
    "https://vercel-local.perigon.io",
  ])("trusted production origin %s receives CORS headers", async (origin) => {
    const res = await worker.fetch(
      new Request("https://localhost/v1/api/tools", {
        headers: { Origin: origin },
      }),
      fakeEnv,
      fakeCtx,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  test.each([
    "http://app.perigon.io",
    "https://evilperigon.io",
    "https://perigon.io.evil.com",
  ])("untrusted production-like origin %s is rejected", async (origin) => {
    const res = await worker.fetch(
      new Request("https://localhost/v1/api/tools", {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
        },
      }),
      fakeEnv,
      fakeCtx,
    );

    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("disallowed playground API preflight is rejected", async () => {
    const res = await worker.fetch(
      new Request("https://localhost/v1/api/tools", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "POST",
        },
      }),
      fakeEnv,
      fakeCtx,
    );

    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("local playground API preflight is allowed only in local CORS mode", async () => {
    const res = await worker.fetch(
      new Request("https://localhost/v1/api/tools", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "POST",
        },
      }),
      fakeLocalCorsEnv,
      fakeCtx,
    );

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
  });

  test("local playground API preflight is rejected in production", async () => {
    const res = await worker.fetch(
      new Request("https://localhost/v1/api/tools", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "POST",
        },
      }),
      fakeProductionCorsEnv,
      fakeCtx,
    );

    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("allowlisted playground API responses include CORS headers", async () => {
    handlerSpies.handleTools.mockClear();
    const res = await worker.fetch(
      new Request("https://localhost/v1/api/tools", {
        headers: { Origin: "https://perigon.io" },
      }),
      fakeEnv,
      fakeCtx,
    );

    expect(res.status).toBe(200);
    expect(handlerSpies.handleTools).toHaveBeenCalledTimes(1);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://perigon.io",
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  test("non-playground routes do not receive CORS headers", async () => {
    handlerSpies.handleMCP.mockClear();
    const res = await worker.fetch(
      new Request("https://localhost/v1/mcp", {
        headers: { Origin: "https://perigon.io" },
      }),
      fakeEnv,
      fakeCtx,
    );

    expect(res.status).toBe(200);
    expect(handlerSpies.handleMCP).toHaveBeenCalledTimes(1);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("missing ANTHROPIC_API_KEY → 500 JSON", async () => {
    const errorSpy = mock(() => {});
    const original = console.error;
    console.error = errorSpy as any;
    try {
      const res = await worker.fetch(
        new Request("https://localhost/v1/api/tools"),
        {} as Env,
        fakeCtx,
      );
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("ANTHROPIC_API_KEY");
    } finally {
      console.error = original;
    }
  });

  test("unknown path → 404 'Not found'", async () => {
    const res = await worker.fetch(
      new Request("https://localhost/v1/totally-bogus"),
      fakeEnv,
      fakeCtx,
    );
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found");
  });

  test.each([
    ["/v1/auth", "handleTurnstileAuth"],
    ["/v1/validate-user", "handleValidateUser"],
    ["/v1/perigon-api-keys", "handlePerigonApiKeys"],
    ["/v1/api/chat", "handleChat"],
    ["/v1/api/tools", "handleTools"],
  ] as const)("%s → %s", async (path, handlerKey) => {
    handlerSpies[handlerKey].mockClear();
    const res = await worker.fetch(
      new Request(`https://localhost${path}`),
      fakeEnv,
      fakeCtx,
    );
    expect(res.status).toBe(200);
    expect(handlerSpies[handlerKey]).toHaveBeenCalledTimes(1);
  });

  test.each(["/v1/sse", "/v1/sse/message", "/v1/mcp"])(
    "%s → handleMCP",
    async (path) => {
      handlerSpies.handleMCP.mockClear();
      const res = await worker.fetch(
        new Request(`https://localhost${path}`),
        fakeEnv,
        fakeCtx,
      );
      expect(res.status).toBe(200);
      expect(handlerSpies.handleMCP).toHaveBeenCalledTimes(1);
    },
  );
});
