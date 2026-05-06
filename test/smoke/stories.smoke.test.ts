import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  newsStoriesArgs,
  searchNewsStories,
} from "../../worker/mcp/tools/search/news-stories";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;

if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_news_stories", () => {
  test("returns stories", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchNewsStories(perigon)(
      newsStoriesArgs.parse({ size: 1 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 30_000);
});
