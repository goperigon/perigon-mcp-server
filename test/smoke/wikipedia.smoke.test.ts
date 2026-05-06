import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  searchWikipedia,
  wikipediaArgs,
} from "../../worker/mcp/tools/search/wikipedia";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_wikipedia", () => {
  test("returns Wikipedia pages for a query", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchWikipedia(perigon)(
      wikipediaArgs.parse({ query: "OpenAI", size: 1 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 30_000);
});
