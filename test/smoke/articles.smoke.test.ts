/**
 * Live-API smoke test for `search_news_articles`.
 * Skipped automatically when no PERIGON_API_KEY is present.
 */
import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  newsArticlesArgs,
  searchNewsArticles,
} from "../../worker/mcp/tools/search/news-articles";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;

// The setup file replaces fetch with a noisy stub when there's no key.
// Restore the real fetch when running smoke tests.
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_news_articles", () => {
  test("returns articles for a generic query", async () => {
    const perigon = new Perigon(apiKey);
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({ query: "AI", size: 1 });
    const result = await handler(args);
    const text = getResultText(result);
    expect(text).not.toContain("Error:");
    expect(text.length).toBeGreaterThan(0);
  }, 30_000);
});
