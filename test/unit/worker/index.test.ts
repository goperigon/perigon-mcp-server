import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";

// Stub PerigonMCP and the handlers BEFORE importing worker/index.
// `mock.module` rewrites the module graph so subsequent imports see the stub.

const handlerSpies = {
  handleChat: mock(async () => new Response("chat", { status: 200 })),
  handleMCP: mock(async () => new Response("mcp", { status: 200 })),
  handlePerigonApiKeys: mock(
    async () => new Response("api-keys", { status: 200 })
  ),
  handleTools: mock(async () => new Response("tools", { status: 200 })),
  handleTurnstileAuth: mock(
    async () => new Response("turnstile", { status: 200 })
  ),
  handleValidateUser: mock(
    async () => new Response("validate-user", { status: 200 })
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
const fakeCtx = {} as ExecutionContext;

beforeAll(() => {
  for (const fn of Object.values(handlerSpies)) fn.mockClear();
});

afterAll(() => {
  for (const fn of Object.values(handlerSpies)) fn.mockClear();
});

describe("worker/index ROUTES", () => {
  test("missing ANTHROPIC_API_KEY → 500 JSON", async () => {
    const errorSpy = mock(() => {});
    const original = console.error;
    console.error = errorSpy as any;
    try {
      const res = await worker.fetch(
        new Request("https://localhost/v1/api/tools"),
        {} as Env,
        fakeCtx
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
      fakeCtx
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
      fakeCtx
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
        fakeCtx
      );
      expect(res.status).toBe(200);
      expect(handlerSpies.handleMCP).toHaveBeenCalledTimes(1);
    }
  );
});
