import { describe, expect, mock, test } from "bun:test";
import { getCachedIntrospection } from "../../../worker/lib/introspection-cache";
import type { Perigon } from "../../../worker/lib/perigon";

function perigonReturning(organizationId: number) {
  const introspection = mock(() =>
    Promise.resolve({ scopes: [], organizationId }),
  );
  return { perigon: { introspection } as unknown as Perigon, introspection };
}

describe("getCachedIntrospection", () => {
  test("reuses the cached result for the same key and origin", async () => {
    const { perigon, introspection } = perigonReturning(1);

    await getCachedIntrospection(perigon, "cache-key-same", "https://api.perigon.io");
    await getCachedIntrospection(perigon, "cache-key-same", "https://api.perigon.io");

    expect(introspection).toHaveBeenCalledTimes(1);
  });

  test("does not share results for the same key across API origins", async () => {
    const production = perigonReturning(1);
    const staging = perigonReturning(2);

    const fromProduction = await getCachedIntrospection(
      production.perigon,
      "cache-key-origins",
      "https://api.perigon.io",
    );
    const fromStaging = await getCachedIntrospection(
      staging.perigon,
      "cache-key-origins",
      "https://api.staging.test",
    );

    expect(fromProduction.organizationId).toBe(1);
    expect(fromStaging.organizationId).toBe(2);
    expect(staging.introspection).toHaveBeenCalledTimes(1);
  });
});
