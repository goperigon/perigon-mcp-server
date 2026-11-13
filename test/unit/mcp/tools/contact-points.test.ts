import { describe, expect, test } from "bun:test";
import {
  contactPointsArgs,
  getContactPoints,
} from "../../../../worker/mcp/tools/platform/contact-points";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

describe("contact_points status filter", () => {
  test("accepts the API's lifecycle statuses and forwards them", async () => {
    const perigon = createMockPerigon({
      listContactPoints: async () => ({ total: 0, data: [] }),
    });
    const status = ["ACTIVE", "STOPPED", "FAILING", "ARCHIVED"] as const;

    await getContactPoints(perigon)(contactPointsArgs.parse({ status }));

    expect(firstCallArgs<any>(perigon.listContactPoints).status).toEqual(status);
  });

  test("rejects statuses the API does not have", () => {
    for (const status of ["PENDING", "DISABLED"]) {
      expect(() => contactPointsArgs.parse({ status: [status] })).toThrow();
    }
  });
});
