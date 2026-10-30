import { afterEach, describe, expect, test } from "bun:test";
import { InsightsApiClient } from "../../../worker/lib/insights-api-client";
import { Perigon } from "../../../worker/lib/perigon";
import {
  PERIGON_CLIENT_HEADER,
  PERIGON_MCP_TOOL_HEADER,
  buildMcpTelemetryHeaders,
} from "../../../worker/lib/telemetry-headers";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
  urlOf,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

describe("Perigon telemetry headers", () => {
  test("SDK searchArticles includes telemetry and Authorization via middleware", async () => {
    let capturedHeaders: Headers | undefined;
    installFetchMock((input, init) => {
      const url = urlOf(input);
      if (url.includes("/articles/all")) {
        capturedHeaders = new Headers(init?.headers);
        return jsonResponse({ numResults: 0, articles: [] });
      }
      return jsonResponse({});
    });

    const perigon = new Perigon("test-key", "https://api.test.local", () =>
      buildMcpTelemetryHeaders({ toolName: "search_news_articles" }),
    );
    await perigon.searchArticles({ q: "test" });

    expect(capturedHeaders?.get(PERIGON_CLIENT_HEADER)).toBe("mcp");
    expect(capturedHeaders?.get(PERIGON_MCP_TOOL_HEADER)).toBe(
      "search_news_articles",
    );
    expect(capturedHeaders?.get("Authorization")).toBe("Bearer test-key");
  });

  test("direct fetch includes telemetry and Authorization headers", async () => {
    let capturedHeaders: Headers | undefined;
    installFetchMock((input, init) => {
      if (urlOf(input).includes("/auth/introspect")) {
        capturedHeaders = new Headers(init?.headers);
        return Response.json({ scopes: [], organizationId: 1 });
      }
      return Response.json({});
    });

    const perigon = new Perigon("test-key", "https://api.test.local", () =>
      buildMcpTelemetryHeaders({ toolName: "search_news_articles" }),
    );
    await perigon.introspection();

    expect(capturedHeaders?.get(PERIGON_CLIENT_HEADER)).toBe("mcp");
    expect(capturedHeaders?.get(PERIGON_MCP_TOOL_HEADER)).toBe(
      "search_news_articles",
    );
    expect(capturedHeaders?.get("Authorization")).toBe("Bearer test-key");
  });

  test("client without provider sends no x-perigon headers on introspection", async () => {
    let capturedHeaders: Headers | undefined;
    installFetchMock((input, init) => {
      if (urlOf(input).includes("/auth/introspect")) {
        capturedHeaders = new Headers(init?.headers);
        return Response.json({ scopes: [], organizationId: 1 });
      }
      return Response.json({});
    });

    const perigon = new Perigon("test-key", "https://api.test.local");
    await perigon.introspection();

    expect(capturedHeaders?.get(PERIGON_CLIENT_HEADER)).toBeNull();
    expect(capturedHeaders?.get(PERIGON_MCP_TOOL_HEADER)).toBeNull();
  });
});

describe("InsightsApiClient telemetry headers", () => {
  test("searchSignals includes telemetry and Authorization headers", async () => {
    let capturedHeaders: Headers | undefined;
    installFetchMock((input, init) => {
      const url = urlOf(input);
      if (url.includes("/signal/insights/mcp/search")) {
        capturedHeaders = new Headers(init?.headers);
        return jsonResponse({ signals: [], total: 0 });
      }
      return jsonResponse({});
    });

    const client = new InsightsApiClient(
      "test-key",
      60_000,
      "https://api.test.local",
      () =>
        buildMcpTelemetryHeaders({
          toolName: "signal_insights_search_signals",
        }),
    );
    await client.searchSignals({ query: "test", limit: 1 });

    expect(capturedHeaders?.get(PERIGON_CLIENT_HEADER)).toBe("mcp");
    expect(capturedHeaders?.get(PERIGON_MCP_TOOL_HEADER)).toBe(
      "signal_insights_search_signals",
    );
    expect(capturedHeaders?.get("Authorization")).toBe("Bearer test-key");
  });
});
