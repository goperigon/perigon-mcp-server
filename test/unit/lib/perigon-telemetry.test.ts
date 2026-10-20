import { afterEach, describe, expect, test } from "bun:test";
import { Perigon } from "../../../worker/lib/perigon";
import {
  PERIGON_CLIENT_HEADER,
  PERIGON_MCP_TOOL_HEADER,
  buildMcpTelemetryHeaders,
} from "../../../worker/lib/telemetry-headers";
import {
  installFetchMock,
  restoreFetch,
  urlOf,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

describe("Perigon telemetry headers", () => {
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
