import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  searchSources,
  sourcesArgs,
} from "../../worker/mcp/tools/search/sources";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_sources", () => {
  test("returns sources", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchSources(perigon)(
      sourcesArgs.parse({ size: 1 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 30_000);
});
