import worker from "./worker/index.ts";

const server = Bun.serve({
  port: 3000,
  fetch: async (request) => {
    const url = new URL(request.url);

    // For MCP endpoint, extract configuration from query parameters (Smithery style)
    let apiKey = process.env.PERIGON_API_KEY || "";
    let rateLimitBypass = true; // Default to bypassing rate limits in container

    if (url.pathname === "/mcp" && url.searchParams.has("apiKey")) {
      apiKey = url.searchParams.get("apiKey") || "";
      rateLimitBypass = url.searchParams.get("rateLimitBypass") !== "false";

      // Create a new request with the API key in the Authorization header
      // and route it to the /v1/mcp endpoint
      const newUrl = new URL(request.url);
      newUrl.pathname = "/v1/mcp";
      newUrl.searchParams.delete("apiKey"); // Remove from query params
      newUrl.searchParams.delete("rateLimitBypass");

      const newRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          Authorization: apiKey,
        },
        body: request.body,
      });

      request = newRequest;
    }

    // Create a mock environment for the worker
    const env = {
      PERIGON_API_KEY: apiKey,
      ANTHROPIC_API_KEY:
        process.env.ANTHROPIC_API_KEY || "mock-key-for-mcp-only",
      AUTH_KV: {
        get: async () => null,
        put: async () => {},
        delete: async () => {},
      },
      MCP_OBJECT: null,
      MCP_RATE_LIMITER: {
        limit: async () => ({ success: rateLimitBypass }),
      },
      ASSETS: null,
      VITE_TURNSTILE_SITE_KEY: "",
      VITE_USE_TURNSTILE: false,
    };

    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
      props: undefined,
    };

    return worker.default.fetch(request, env, ctx);
  },
});

console.log(`MCP Server running on http://localhost:${server.port}`);
console.log("MCP endpoint available at: http://localhost:3000/mcp");
console.log("Configure with: ?apiKey=YOUR_PERIGON_API_KEY");
