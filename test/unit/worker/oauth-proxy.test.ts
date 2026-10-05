import { afterEach, describe, expect, test } from "bun:test";
import {
  handleOAuthAuthorizeRedirect,
  isOAuthApiProxyPath,
  isOAuthAuthorizePath,
  proxyOAuthApiRequest,
} from "../../../worker/handlers/oauth-proxy";
import {
  installFetchMock,
  restoreFetch,
  urlOf,
} from "../../helpers/mock-fetch";

const env = {
  MCP_PUBLIC_URL: "https://mcp.test.local",
  PERIGON_APP_URL: "https://app.test.local",
  PERIGON_API_URL: "https://api.test.local",
} as unknown as Env;

afterEach(() => {
  restoreFetch();
});

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

describe("proxyOAuthApiRequest", () => {
  test("forwards POST token exchange to the API origin with body and headers", async () => {
    const upstream: { url: string; init?: RequestInit } = {};
    installFetchMock((input, init) => {
      upstream.url = urlOf(input);
      upstream.init = init;
      return new Response(JSON.stringify({ access_token: "tok", token_type: "Bearer" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const formBody =
      "grant_type=authorization_code&code=abc&code_verifier=verifier";
    const request = new Request(
      "https://mcp.test.local/v1/mcp/oauth/token?resource=https%3A%2F%2Fmcp.test.local",
      {
        method: "POST",
        headers: {
          host: "mcp.test.local",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      },
    );

    const response = await proxyOAuthApiRequest(request, env);

    expect(upstream.url).toBe(
      "https://api.test.local/v1/mcp/oauth/token?resource=https%3A%2F%2Fmcp.test.local",
    );
    expect(upstream.init?.method).toBe("POST");
    expect(upstream.init?.redirect).toBe("manual");

    const forwardedHeaders = new Headers(upstream.init?.headers);
    expect(forwardedHeaders.get("host")).toBeNull();
    expect(forwardedHeaders.get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );

    expect(await new Response(upstream.init?.body).text()).toBe(formBody);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      access_token: "tok",
      token_type: "Bearer",
    });
  });
});
