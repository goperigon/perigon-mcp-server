import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  articleCountsArgs,
  getArticleCounts,
} from "../../worker/mcp/tools/search/stats-article-counts";
import {
  avgSentimentArgs,
  getAvgSentiment,
} from "../../worker/mcp/tools/search/stats-avg-sentiment";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

describe.skipIf(skip)("smoke: stats", () => {
  test("get_article_counts for the last 24h", async () => {
    const perigon = new Perigon(apiKey);
    const result = await getArticleCounts(perigon)(
      articleCountsArgs.parse({ from: yesterday, splitBy: "DAY" })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 60_000);

  test("get_avg_sentiment for the last 24h", async () => {
    const perigon = new Perigon(apiKey);
    const result = await getAvgSentiment(perigon)(
      avgSentimentArgs.parse({ from: yesterday, splitBy: "DAY" })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 60_000);
});
