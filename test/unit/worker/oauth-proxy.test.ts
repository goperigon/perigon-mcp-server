import { describe, expect, test } from "bun:test";
import {
  handleOAuthAuthorizeRedirect,
  isOAuthApiProxyPath,
  isOAuthAuthorizePath,
} from "../../../worker/handlers/oauth-proxy";

const env = {
  MCP_PUBLIC_URL: "https://mcp.test.local",
  PERIGON_APP_URL: "https://app.test.local",
  PERIGON_API_URL: "https://api.test.local",
} as unknown as Env;

describe("oauth proxy routing helpers", () => {
  test("matches authorize and oauth API paths", () => {
    expect(isOAuthAuthorizePath("/oauth/authorize")).toBe(true);
    expect(isOAuthApiProxyPath("/v1/mcp/oauth/token")).toBe(true);
    expect(isOAuthApiProxyPath("/v1/mcp/oauth/register")).toBe(true);
    expect(isOAuthApiProxyPath("/v1/mcp")).toBe(false);
  });
});

describe("oauth authorize redirect", () => {
  test("redirects to the app origin with query params preserved", () => {
    const response = handleOAuthAuthorizeRedirect(
      new Request(
        "https://mcp.test.local/oauth/authorize?client_id=abc&resource=https%3A%2F%2Fmcp.test.local",
      ),
      env,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://app.test.local/oauth/authorize?client_id=abc&resource=https%3A%2F%2Fmcp.test.local",
    );
  });
});
