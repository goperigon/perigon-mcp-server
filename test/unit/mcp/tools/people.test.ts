import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  peopleArgs,
  searchPeople,
} from "../../../../worker/mcp/tools/search/people";
import { peopleFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchPeople", () => {
  test("maps wikidataIds → wikidataId and occupation → occupationLabel", async () => {
    const perigon = createMockPerigon({
      searchPeople: async () => peopleFixture,
    });
    const args = peopleArgs.parse({
      name: "Alice Bob",
      occupation: "engineer",
      wikidataIds: ["Q1", "Q2"],
    });
    const result = await searchPeople(perigon)(args);

    const call = firstCallArgs<any>(perigon.searchPeople);
    expect(call.name).toBe("Alice AND Bob");
    expect(call.occupationLabel).toBe("engineer");
    expect(call.wikidataId).toEqual(["Q1", "Q2"]);

    const t = text(result);
    expect(t).toContain('<person wikidata_id="Q1" name="Alice">');
    expect(t).toContain("Occupation: engineer, author");
    expect(t).toContain("Position: CEO");
    expect(t).toContain("Date Of Birth: 1980-05-04");
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchPeople: async () => ({ status: 200, numResults: 0, results: [] }),
    });
    const result = await searchPeople(perigon)(peopleArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchPeople: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchPeople(perigon)(peopleArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search people:")).toBe(true);
    errorSpy.mockRestore();
  });
});
