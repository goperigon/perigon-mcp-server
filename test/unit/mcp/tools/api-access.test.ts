import { describe, expect, test } from "bun:test";
import { getApiAccess } from "../../../../worker/mcp/tools/access/api-access";
import type { ApiLimitsDto } from "../../../../worker/types/platform";
import { createMockPerigon } from "../../../helpers/mock-perigon";

const baseLimits: ApiLimitsDto = {
  organizationName: "Acme",
  requestsUsed: 120,
  requestLimit: 1000,
  maxPageSize: 100,
  paginationLimit: 10,
  social: { requestsUsed: 3, requestLimit: 50, sharedQuota: false },
};

async function reportFor(limits: ApiLimitsDto): Promise<string> {
  const perigon = createMockPerigon({
    introspection: async () => ({ scopes: [], organizationId: 7 }),
    getLimits: async () => ({ data: limits }),
  });
  const result = await getApiAccess(perigon)({}, {} as never);
  const [content] = result.content;
  if (content?.type !== "text") throw new Error("expected a text result");
  return content.text;
}

describe("get_api_access", () => {
  test("reports the request quota for plans without credits", async () => {
    const text = await reportFor(baseLimits);

    expect(text).toContain("Requests Used: 120 / 1000");
    expect(text).toContain("Social Requests Used: 3 / 50");
    expect(text).not.toContain("Credits");
  });

  test("reports the credit balance instead of the request quota on credit plans", async () => {
    const text = await reportFor({
      ...baseLimits,
      credits: {
        remaining: 0,
        allowance: 10000,
        allowanceUsed: 10000,
        grantBalance: 0,
        periodUsed: 10000,
        resetAt: "2026-12-01T00:00:00Z",
        exhausted: true,
        rates: { "*/default": 1, "*/stories": 2 },
      },
    });

    expect(text).toContain("Credits Remaining: 0 (exhausted");
    expect(text).toContain(
      "Credits Used This Period: 10000 (monthly allowance 10000 / 10000, free credits left 0)",
    );
    expect(text).toContain("Credits Reset At: 2026-12-01T00:00:00Z");
    expect(text).toContain("Credits Per Request: */default=1, */stories=2");
    expect(text).not.toContain("Requests Used");
    expect(text).not.toContain("Social Requests");
  });
});
