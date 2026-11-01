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
      "https://mcp.perigon.io/oauth/authorize",
    );
    expect(body.token_endpoint).toBe(
      "https://mcp.perigon.io/v1/mcp/oauth/token",
    );
  });

  test("public MCP host ignores IPv6 loopback in MCP_PUBLIC_URL", async () => {
    const devEnv = {
      MCP_PUBLIC_URL: "http://[::1]:8787",
      PERIGON_API_URL: "http://localhost:8080",
      PERIGON_APP_URL: "http://localhost:3000",
    } as unknown as Env;

    const response = handleOAuthMetadata(
      new Request(
        "https://mcp.perigon.io/.well-known/oauth-protected-resource",
      ),
      devEnv,
    );
    const body = (await response.json()) as { resource: string };
    expect(body.resource).toBe("https://mcp.perigon.io");
  });

  test("public MCP host ignores accidentally deployed local dev env vars", async () => {
    const devEnv = {
      MCP_PUBLIC_URL: "http://127.0.0.1:8787",
      PERIGON_API_URL: "http://localhost:8080",
      PERIGON_APP_URL: "http://localhost:3000",
    } as unknown as Env;

    const protectedResource = handleOAuthMetadata(
      new Request(
        "https://mcp.perigon.io/.well-known/oauth-protected-resource",
      ),
      devEnv,
    );
    expect((await protectedResource.json()) as { resource: string }).toEqual({
      resource: "https://mcp.perigon.io",
      authorization_servers: ["https://mcp.perigon.io"],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://perigon.io/docs/api/mcp",
    });

    const authServer = handleOAuthMetadata(
      new Request(
        "https://mcp.perigon.io/.well-known/oauth-authorization-server",
      ),
      devEnv,
    );
    const body = (await authServer.json()) as {
      issuer: string;
      authorization_endpoint: string;
      token_endpoint: string;
    };
    expect(body.issuer).toBe("https://mcp.perigon.io");
    expect(body.authorization_endpoint).toBe(
      "https://mcp.perigon.io/oauth/authorize",
    );
    expect(body.token_endpoint).toBe(
      "https://mcp.perigon.io/v1/mcp/oauth/token",
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
      "https://mcp.test.local/oauth/authorize",
    );
    expect(body.token_endpoint).toBe(
      "https://mcp.test.local/v1/mcp/oauth/token",
    );
    expect(body.registration_endpoint).toBe(
      "https://mcp.test.local/v1/mcp/oauth/register",
    );
  });
});
