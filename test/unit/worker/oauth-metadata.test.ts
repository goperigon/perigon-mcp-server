import { describe, expect, test } from "bun:test";
import {
  handleOAuthMetadata,
  isOAuthMetadataPath,
} from "../../../worker/handlers/oauth-metadata";

const env = {
  MCP_PUBLIC_URL: "https://mcp.test.local/",
  PERIGON_API_URL: "https://api.test.local",
  PERIGON_APP_URL: "https://app.test.local",
} as unknown as Env;

describe("oauth metadata", () => {
  test("isOAuthMetadataPath matches discovery routes", () => {
    expect(isOAuthMetadataPath("/.well-known/oauth-protected-resource")).toBe(
      true,
    );
    expect(
      isOAuthMetadataPath("/.well-known/oauth-protected-resource/v1/mcp"),
    ).toBe(true);
    expect(isOAuthMetadataPath("/.well-known/oauth-authorization-server")).toBe(
      true,
    );
    expect(isOAuthMetadataPath("/v1/mcp")).toBe(false);
  });

  test("protected resource metadata points at the MCP public URL", async () => {
    const response = handleOAuthMetadata(
      new Request("https://mcp.test.local/.well-known/oauth-protected-resource"),
      env,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      resource: string;
      authorization_servers: string[];
    };
    expect(body.resource).toBe("https://mcp.test.local");
    expect(body.authorization_servers).toEqual(["https://mcp.test.local"]);
  });

  test("metadata uses production defaults when env URLs are missing", async () => {
    const response = handleOAuthMetadata(
      new Request(
        "https://mcp.test.local/.well-known/oauth-authorization-server",
      ),
      {} as Env,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      token_endpoint: string;
      authorization_endpoint: string;
    };
    expect(body.authorization_endpoint).toBe(
      "https://www.perigon.io/oauth/authorize",
    );
    expect(body.token_endpoint).toBe(
      "https://api.perigon.io/v1/mcp/oauth/token",
    );
  });

  test("authorization server metadata exposes Perigon OAuth endpoints", async () => {
    const response = handleOAuthMetadata(
      new Request(
        "https://mcp.test.local/.well-known/oauth-authorization-server",
      ),
      env,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      authorization_endpoint: string;
      token_endpoint: string;
      registration_endpoint: string;
    };
    expect(body.authorization_endpoint).toBe(
      "https://app.test.local/oauth/authorize",
    );
    expect(body.token_endpoint).toBe(
      "https://api.test.local/v1/mcp/oauth/token",
    );
    expect(body.registration_endpoint).toBe(
      "https://api.test.local/v1/mcp/oauth/register",
    );
  });
});
