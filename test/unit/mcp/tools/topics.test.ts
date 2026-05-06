import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  searchTopics,
  topicsArgs,
} from "../../../../worker/mcp/tools/search/topics";
import { topicsFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchTopics", () => {
  test("forwards name/category/subcategory verbatim (no AND-joining)", async () => {
    const perigon = createMockPerigon({
      searchTopics: async () => topicsFixture,
    });
    const args = topicsArgs.parse({
      name: "AI Stuff", // no createSearchField — passes through
      category: "Tech",
      subcategory: "ML",
    });
    const result = await searchTopics(perigon)(args);

    const call = firstCallArgs<any>(perigon.searchTopics);
    expect(call.name).toBe("AI Stuff");
    expect(call.category).toBe("Tech");
    expect(call.subcategory).toBe("ML");

    const t = text(result);
    expect(t).toContain("Got 1 topics");
    expect(t).toContain('<topic name="Markets">');
    expect(t).toContain("Category: Business");
    expect(t).toContain("Sub Category: Finance");
  });

  test("uses result.total + result.data (not numResults + results)", async () => {
    const perigon = createMockPerigon({
      // numResults missing intentionally — would break a tool that read it
      searchTopics: async () => ({
        total: 0,
        data: [],
      }),
    });
    const result = await searchTopics(perigon)(topicsArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchTopics: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchTopics(perigon)(topicsArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search topics:")).toBe(true);
    errorSpy.mockRestore();
  });
});
