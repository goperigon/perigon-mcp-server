import { describe, expect, test } from "bun:test";
import {
  contactPointsArgs,
  getContactPoints,
} from "../../../../worker/mcp/tools/platform/contact-points";
import { createMockPerigon, firstRequestOf } from "../../../helpers/mock-perigon";

describe("contact_points status filter", () => {
  test("accepts the API's lifecycle statuses and forwards them", async () => {
    const perigon = createMockPerigon({
      listContactPoints: async () => ({ total: 0, data: [] }),
    });
    const status = ["ACTIVE", "STOPPED", "FAILING", "ARCHIVED"];

    await getContactPoints(perigon)(contactPointsArgs.parse({ status }));

    expect(firstRequestOf(perigon, "listContactPoints").status).toEqual(status);
  });

  test("rejects statuses the API does not have", () => {
    for (const status of ["PENDING", "DISABLED"]) {
      expect(() => contactPointsArgs.parse({ status: [status] })).toThrow();
    }
  });
});
