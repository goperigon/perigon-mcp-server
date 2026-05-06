import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  newsVectorArgs,
  searchVectorNews,
} from "../../worker/mcp/tools/search/news-vector";
import {
  searchVectorWikipedia,
  wikipediaVectorArgs,
} from "../../worker/mcp/tools/search/wikipedia-vector";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: vector search", () => {
  test("search_vector_news returns articles for a conversational query", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchVectorNews(perigon)(
      newsVectorArgs.parse({ query: "AI safety progress this year" })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 60_000);

  test("search_vector_wikipedia returns pages for a conversational query", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchVectorWikipedia(perigon)(
      wikipediaVectorArgs.parse({ query: "history of OpenAI" })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 60_000);
});
