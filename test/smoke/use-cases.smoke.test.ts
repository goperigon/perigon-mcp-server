import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  companyNewsArgs,
  getCompanyNews,
} from "../../worker/mcp/tools/use-cases/company-news";
import {
  getPersonNews,
  personNewsArgs,
} from "../../worker/mcp/tools/use-cases/person-news";
import {
  getLocationNews,
  locationNewsArgs,
} from "../../worker/mcp/tools/use-cases/location-news";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: use-case tools", () => {
  test("get_company_news for OpenAI", async () => {
    const perigon = new Perigon(apiKey);
    const result = await getCompanyNews(perigon)(
      companyNewsArgs.parse({ companyName: "OpenAI", days: 7 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 60_000);

  test("get_person_news for Sam Altman", async () => {
    const perigon = new Perigon(apiKey);
    const result = await getPersonNews(perigon)(
      personNewsArgs.parse({ personName: "Sam Altman", days: 30 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 60_000);

  test("get_location_news for Austin", async () => {
    const perigon = new Perigon(apiKey);
    const result = await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "Austin", days: 7 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 60_000);
});
