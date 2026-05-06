import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  getTopCompanies,
  topCompaniesArgs,
} from "../../../../worker/mcp/tools/search/stats-top-companies";
import { topCompaniesFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getTopCompanies", () => {
  test("uses first domain and first symbol from the company arrays", async () => {
    const perigon = createMockPerigon({
      getTopCompanies: async () => topCompaniesFixture,
    });
    const result = await getTopCompanies(perigon)(topCompaniesArgs.parse({}));
    const t = text(result);
    expect(t).toContain('domain="acme.com"');
    expect(t).toContain('ticker="ACM"');
    expect(t).toContain('industry="Tech"');
    expect(t).toContain('sector="IT"');
    expect(t).toContain('name="Acme &amp; sons"');
    expect(t).toContain('current_rate_per_day="10.00"');
    expect(t).toContain('spike_score="2.50"');
  });

  test("forwards spike-detection params and stats filters", async () => {
    const perigon = createMockPerigon({
      getTopCompanies: async () => topCompaniesFixture,
    });
    const args = topCompaniesArgs.parse({
      q: "Acme",
      currentFrom: "2024-01-01",
      currentTo: "2024-01-04",
      baselineFrom: "2023-12-01",
      baselineTo: "2024-01-01",
      normalizeByDay: false,
      size: 5,
    });
    await getTopCompanies(perigon)(args);
    const call = firstCallArgs<any>(perigon.getTopCompanies);
    expect(call.q).toBe("Acme");
    expect(call.normalizeByDay).toBe(false);
    expect(call.size).toBe(5);
    expect(call.currentFrom).toBeInstanceOf(Date);
  });

  test("noResults when data is empty", async () => {
    const perigon = createMockPerigon({
      getTopCompanies: async () => ({ total: 0, data: [] }),
    });
    const result = await getTopCompanies(perigon)(topCompaniesArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      getTopCompanies: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getTopCompanies(perigon)(topCompaniesArgs.parse({}));
    expect(
      text(result).startsWith("Error: Failed to retrieve top companies:")
    ).toBe(true);
    errorSpy.mockRestore();
  });
});
