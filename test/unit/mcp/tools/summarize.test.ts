import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  summarizeArgs,
  summarizeNews,
} from "../../../../worker/mcp/tools/search/summarize";
import {
  summarizeFixture,
  summarizeNoResultsFixture,
} from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("summarizeNews", () => {
  test("forwards mapped params and renders summary + supporting articles", async () => {
    const perigon = createMockPerigon({
      searchSummarizer: async () => summarizeFixture,
    });
    const args = summarizeArgs.parse({
      query: "AI policy",
      categories: ["Tech"],
      topics: ["AI"],
      cities: ["Austin"],
      states: ["tx"],
      countries: ["us"],
      sources: ["nyt.com"],
      sourceGroup: ["top10"],
      language: ["en"],
      personName: ["Alice"],
      companyDomain: ["acme.com"],
      companySymbol: ["ACM"],
      prompt: "Summarize key points",
      maxArticleCount: 25,
      returnedArticleCount: 5,
      maxTokens: 1024,
      temperature: 0.3,
      topP: 0.9,
      model: "gpt-4o-mini",
      method: "ARTICLES",
      summarizeFields: "SUMMARY",
    });
    const result = await summarizeNews(perigon)(args);

    const call = firstCallArgs<any>(perigon.searchSummarizer);
    expect(call.q).toBe("AI AND policy");
    expect(call.category).toEqual(["Tech"]);
    expect(call.topic).toEqual(["AI"]);
    expect(call.city).toEqual(["Austin"]);
    expect(call.state).toEqual(["TX"]);
    expect(call.country).toEqual(["us"]);
    expect(call.source).toEqual(["nyt.com"]);
    expect(call.sourceGroup).toEqual(["top10"]);
    expect(call.language).toEqual(["en"]);
    expect(call.personName).toEqual(["Alice"]);
    expect(call.companyDomain).toEqual(["acme.com"]);
    expect(call.companySymbol).toEqual(["ACM"]);
    expect(call.showReprints).toBe(false);

    expect(call.summaryBody).toEqual({
      prompt: "Summarize key points",
      maxArticleCount: 25,
      returnedArticleCount: 5,
      maxTokens: 1024,
      temperature: 0.3,
      topP: 0.9,
      model: "gpt-4o-mini",
      method: "ARTICLES",
      summarizeFields: "SUMMARY",
    });

    expect(text(result)).toContain("<summary>");
    expect(text(result)).toContain("Summary of three articles.");
    expect(text(result)).toContain("Based on 3 articles.");
    expect(text(result)).toContain('<supporting_article id="s1"');
  });

  test("PINNED BEHAVIOR: temperature 0 IS preserved (uses !== undefined check)", async () => {
    const perigon = createMockPerigon({
      searchSummarizer: async () => summarizeFixture,
    });
    await summarizeNews(perigon)(
      summarizeArgs.parse({ temperature: 0, topP: 0 })
    );
    const body = firstCallArgs<any>(perigon.searchSummarizer).summaryBody;
    expect(body.temperature).toBe(0);
    expect(body.topP).toBe(0);
  });

  test("PINNED BEHAVIOR: numeric 0 for token/article counts is dropped (truthy check)", async () => {
    const perigon = createMockPerigon({
      searchSummarizer: async () => summarizeFixture,
    });
    await summarizeNews(perigon)(
      summarizeArgs.parse({
        maxArticleCount: 0,
        returnedArticleCount: 0,
        maxTokens: 0,
      })
    );
    const body = firstCallArgs<any>(perigon.searchSummarizer).summaryBody;
    expect(body).not.toHaveProperty("maxArticleCount");
    expect(body).not.toHaveProperty("returnedArticleCount");
    expect(body).not.toHaveProperty("maxTokens");
  });

  test("rejects unknown model", () => {
    expect(() =>
      summarizeArgs.parse({ model: "claude-7-omega" as any })
    ).toThrow();
  });

  test("rejects out-of-range temperature/topP", () => {
    expect(() => summarizeArgs.parse({ temperature: 2.1 })).toThrow();
    expect(() => summarizeArgs.parse({ topP: -0.1 })).toThrow();
  });

  test("returns noResults only when summary is empty AND numResults is 0", async () => {
    const perigon = createMockPerigon({
      searchSummarizer: async () => summarizeNoResultsFixture,
    });
    const result = await summarizeNews(perigon)(summarizeArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchSummarizer: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await summarizeNews(perigon)(summarizeArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to summarize news:")).toBe(true);
    errorSpy.mockRestore();
  });
});
