import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  getTopEntities,
  topEntitiesArgs,
} from "../../../../worker/mcp/tools/search/stats-top-entities";
import { topEntitiesFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getTopEntities", () => {
  test("defaults entity to topics/people/companies", async () => {
    const perigon = createMockPerigon({
      getTopEntities: async () => topEntitiesFixture,
    });
    await getTopEntities(perigon)(topEntitiesArgs.parse({}));
    expect(firstCallArgs<any>(perigon.getTopEntities).entity).toEqual([
      "topics",
      "people",
      "companies",
    ]);
  });

  test("renders requested entity buckets with totals", async () => {
    const perigon = createMockPerigon({
      getTopEntities: async () => topEntitiesFixture,
    });
    const result = await getTopEntities(perigon)(topEntitiesArgs.parse({}));
    const t = text(result);
    expect(t).toContain('<top_entities total_articles="100">');
    expect(t).toContain('<topics total="5">');
    expect(t).toContain('<item rank="1" key="AI" count="30" />');
    expect(t).toContain('<item rank="2" key="Markets" count="25" />');
    expect(t).toContain('<people total="2">');
    expect(t).toContain('<companies total="1">');
  });

  test("rejects unknown entity types in schema", () => {
    expect(() =>
      topEntitiesArgs.parse({ entity: ["dragons" as any] })
    ).toThrow();
  });

  test("noResults when no requested entity has data", async () => {
    const perigon = createMockPerigon({
      getTopEntities: async () => ({ totalArticles: 0 }),
    });
    const result = await getTopEntities(perigon)(topEntitiesArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      getTopEntities: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getTopEntities(perigon)(topEntitiesArgs.parse({}));
    expect(
      text(result).startsWith("Error: Failed to retrieve top entities:")
    ).toBe(true);
    errorSpy.mockRestore();
  });
});
