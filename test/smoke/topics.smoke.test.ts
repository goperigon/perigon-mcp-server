import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  searchTopics,
  topicsArgs,
} from "../../worker/mcp/tools/search/topics";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_topics", () => {
  test("returns topics", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchTopics(perigon)(topicsArgs.parse({ size: 1 }));
    expect(getResultText(result)).not.toContain("Error:");
  }, 30_000);
});
