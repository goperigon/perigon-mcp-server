import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  companiesArgs,
  searchCompanies,
} from "../../worker/mcp/tools/search/companies";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_companies", () => {
  test("returns companies for a known ticker", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchCompanies(perigon)(
      companiesArgs.parse({ symbol: ["AAPL"], size: 1 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 30_000);
});
