import { afterEach, describe, expect, test } from "bun:test";
import { Perigon } from "../../../worker/lib/perigon";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

describe("Perigon MCP auth headers", () => {
  test("sends shared secret on introspection when configured", async () => {
    let secretHeader: string | null = null;
    installFetchMock((_input, init) => {
      const headers = init?.headers as Record<string, string> | undefined;
      secretHeader = headers?.["x-perigon-shared-secret"] ?? null;
      return jsonResponse({ organizationId: 1, scopes: [] });
    });

    const client = new Perigon(
      "aaa.bbb.ccc",
      "https://api.test.local",
      "internal-secret",
    );
    await client.introspection();

    expect(secretHeader).toBe("internal-secret");
  });

  test("does not send shared secret for plain API keys", async () => {
    let secretHeader: string | null = "present";
    installFetchMock((_input, init) => {
      const headers = init?.headers as Record<string, string> | undefined;
      secretHeader = headers?.["x-perigon-shared-secret"] ?? null;
      return jsonResponse({ organizationId: 1, scopes: [] });
    });

    const client = new Perigon("plain-key", "https://api.test.local");
    await client.introspection();

    expect(secretHeader).toBeNull();
  });
});
