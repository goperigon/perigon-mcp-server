import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  companiesArgs,
  searchCompanies,
} from "../../../../worker/mcp/tools/search/companies";
import { companiesFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchCompanies", () => {
  test("maps query → q, domains → domain, id → id", async () => {
    const perigon = createMockPerigon({
      searchCompanies: async () => companiesFixture,
    });
    const args = companiesArgs.parse({
      query: "Acme corp",
      name: "Acme",
      domains: ["acme.com"],
      symbol: ["ACM"],
      id: ["c1"],
      country: ["us"],
      exchange: ["NYSE"],
      industry: "Tech",
      sector: "IT",
    });
    const result = await searchCompanies(perigon)(args);

    const call = firstCallArgs<any>(perigon.searchCompanies);
    expect(call.q).toBe("Acme AND corp");
    expect(call.name).toBe("Acme");
    expect(call.domain).toEqual(["acme.com"]);
    expect(call.symbol).toEqual(["ACM"]);
    expect(call.id).toEqual(["c1"]);
    expect(call.country).toEqual(["us"]);
    expect(call.exchange).toEqual(["NYSE"]);
    expect(call.industry).toBe("Tech");
    expect(call.sector).toBe("IT");
    expect(text(result)).toContain('<company name="Acme">');
    expect(text(result)).toContain("CEO: Bob Smith");
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchCompanies: async () => ({ status: 200, numResults: 0, results: [] }),
    });
    const result = await searchCompanies(perigon)(companiesArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchCompanies: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchCompanies(perigon)(companiesArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search companies:")).toBe(true);
    errorSpy.mockRestore();
  });
});
