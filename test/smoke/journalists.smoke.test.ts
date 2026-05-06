import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  journalistsArgs,
  searchJournalists,
} from "../../worker/mcp/tools/search/journalists";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_journalists", () => {
  test("returns journalists", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchJournalists(perigon)(
      journalistsArgs.parse({ size: 1 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 30_000);
});
