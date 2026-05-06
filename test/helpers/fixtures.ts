/**
 * Canned response payloads used across the tool tests.
 *
 * These intentionally include only the minimum fields each tool reads — if
 * the SDK shape grows, these are the spots to update. Each fixture is a
 * named export so failing tests have an obvious anchor.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Pull the first text block out of an MCP `CallToolResult`. The SDK's content
 * type is a discriminated union (`text | image | audio | resource | ...`),
 * so we have to narrow before reading `.text`. Tests always expect a text
 * block — anything else is an error worth surfacing.
 */
export function getResultText(result: CallToolResult): string {
  const first = result.content?.[0];
  if (!first || first.type !== "text") {
    throw new Error(
      `Expected first content block to be 'text', got '${first?.type ?? "<empty>"}'`
    );
  }
  return first.text;
}

export const articlesFixture = {
  status: 200,
  numResults: 2,
  articles: [
    {
      articleId: "a1",
      title: "First article",
      url: "https://example.com/a1",
      summary: "Summary 1",
      content: "Full content 1",
      pubDate: "2024-01-01T00:00:00Z",
      addDate: "2024-01-01T01:00:00Z",
      refreshDate: "2024-01-01T02:00:00Z",
      source: { domain: "example.com" },
      authorsByline: "Jane Doe",
      language: "en",
      country: "us",
      medium: "Article",
      reprint: false,
      sentiment: { positive: 0.5, negative: 0.2, neutral: 0.3 },
      categories: [{ name: "Tech" }],
      topics: [{ name: "AI" }],
      labels: [{ name: "Opinion" }],
      people: [{ name: "Alice" }],
      companies: [{ name: "Acme" }],
      places: [{ city: "NYC", state: "NY", country: "us" }],
      locations: [{ city: "NYC", state: "NY", country: "us" }],
      clusterId: "c1",
      journalists: [{ id: "j1" }],
    },
    {
      articleId: "a2",
      title: "Second article",
      url: "https://example.com/a2",
      summary: "Summary 2",
      content: "Full content 2",
      pubDate: "2024-01-02T00:00:00Z",
      addDate: "2024-01-02T01:00:00Z",
      refreshDate: "2024-01-02T02:00:00Z",
      source: { domain: "example.com" },
      authorsByline: "John Doe",
      language: "en",
      country: "us",
      medium: "Article",
      sentiment: { positive: 0.1, negative: 0.6, neutral: 0.3 },
      categories: [],
      topics: [],
      labels: [],
      people: [],
      companies: [],
      places: [],
      locations: [],
      clusterId: "c2",
      journalists: [],
    },
  ],
};

export const emptyArticlesFixture = {
  status: 200,
  numResults: 0,
  articles: [],
};

export const storiesFixture = {
  status: 200,
  numResults: 1,
  results: [
    {
      id: "story-1",
      name: "Major news event",
      summary: "Things happened.",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T01:00:00Z",
      sentiment: { positive: 0.5, negative: 0.2, neutral: 0.3 },
    },
  ],
};

export const emptyStoriesFixture = { status: 200, numResults: 0, results: [] };

export const storyHistoryFixture = {
  status: 200,
  numResults: 1,
  results: [
    {
      clusterId: "c1",
      createdAt: "2024-01-01T00:00:00Z",
      name: "Cluster name",
      triggeredAt: "2024-01-01T01:00:00Z",
      summary: "Long summary",
      shortSummary: "Short summary",
      changelog: "Initial",
      keyPoints: [{ point: "Point one", references: [] }],
      questions: null,
    },
  ],
};

export const journalistsFixture = {
  status: 200,
  numResults: 1,
  results: [
    {
      id: "j1",
      name: "Jane Doe",
      headline: "Beat reporter",
      topSources: [{ name: "Example", count: 3 }],
      locations: [{ country: "us", city: "NYC" }],
    },
  ],
};

export const sourcesFixture = {
  status: 200,
  numResults: 1,
  results: [
    {
      name: "Example",
      domain: "example.com",
      monthlyVisits: 1_000_000,
      topTopics: [{ name: "Tech" }],
    },
  ],
};

export const peopleFixture = {
  status: 200,
  numResults: 1,
  results: [
    {
      wikidataId: "Q1",
      name: "Alice",
      occupation: [{ label: "engineer" }, { label: "author" }],
      position: [{ label: "CEO" }],
      gender: { label: "female" },
      dateOfBirth: { time: "1980-05-04T00:00:00Z", precision: "day" },
      description: "Notable person.",
    },
  ],
};

export const companiesFixture = {
  status: 200,
  numResults: 1,
  results: [
    {
      id: "c1",
      name: "Acme",
      ceo: "Bob Smith",
      description: "Holding company",
      fullTimeEmployees: 100,
      industry: "Tech",
      country: "us",
    },
  ],
};

export const topicsFixture = {
  status: 200,
  total: 1,
  data: [
    {
      name: "Markets",
      createdAt: "2024-01-01T00:00:00Z",
      labels: { category: "Business", subcategory: "Finance" },
    },
  ],
};

export const wikipediaFixture = {
  status: 200,
  numResults: 1,
  results: [
    {
      id: "w1",
      wikiTitle: "Test Page",
      url: "https://en.wikipedia.org/wiki/Test_Page",
      summary: "A page about testing.",
      wikidataId: "Q42",
      categories: ["Tests", "Examples"],
      pageviews: 1234,
      wikiRevisionTs: "2024-01-01T00:00:00Z",
    },
  ],
};

export const wikipediaVectorFixture = {
  status: 200,
  results: [
    {
      score: 0.91,
      data: {
        id: "w1",
        wikiTitle: "Test Page",
        url: "https://en.wikipedia.org/wiki/Test_Page",
        summary: "A page about testing.",
        wikidataId: "Q42",
        categories: ["Tests"],
        pageviews: 100,
        wikiRevisionTs: "2024-01-01T00:00:00Z",
      },
    },
  ],
};

export const newsVectorFixture = {
  status: 200,
  results: [
    {
      score: 0.88,
      data: {
        articleId: "va1",
        title: "Vector article",
        url: "https://example.com/va1",
        summary: "Vec summary",
        content: "Full vec content",
        pubDate: "2024-01-01T00:00:00Z",
        addDate: "2024-01-01T01:00:00Z",
        refreshDate: "2024-01-01T02:00:00Z",
        source: { domain: "example.com" },
        authorsByline: "Jane Doe",
        language: "en",
        country: "us",
        medium: "Article",
        sentiment: { positive: 0.5, negative: 0.2, neutral: 0.3 },
        categories: [{ name: "Tech" }],
        topics: [{ name: "AI" }],
        labels: [],
        clusterId: "vc1",
        journalists: [{ id: "vj1" }],
      },
    },
  ],
};

export const summarizeFixture = {
  status: 200,
  numResults: 3,
  summary: "Summary of three articles.",
  results: [
    {
      articleId: "s1",
      title: "Supporting article",
      source: { domain: "example.com" },
      pubDate: "2024-01-01T00:00:00Z",
    },
  ],
};

export const summarizeNoResultsFixture = {
  status: 200,
  numResults: 0,
  summary: "",
  results: [],
};

export const avgSentimentFixture = {
  status: 200,
  results: [
    {
      date: "2024-01-01",
      numResults: 10,
      avgSentiment: { positive: 0.5, negative: 0.2, neutral: 0.3 },
    },
    {
      date: "2024-01-02",
      numResults: 5,
      avgSentiment: { positive: 0.1, negative: 0.6, neutral: 0.3 },
    },
  ],
};

export const articleCountsFixture = {
  status: 200,
  results: [
    { date: "2024-01-01", numResults: 10 },
    { date: "2024-01-02", numResults: 5 },
  ],
};

export const topEntitiesFixture = {
  totalArticles: 100,
  totalTopics: 5,
  topics: [
    { key: "AI", count: 30 },
    { key: "Markets", count: 25 },
  ],
  totalPeople: 2,
  people: [{ key: "Alice", count: 12 }],
  totalCompanies: 1,
  companies: [{ key: "Acme", count: 8 }],
};

export const topPeopleFixture = {
  total: 1,
  data: [
    {
      wikidataId: "Q1",
      spikeScore: 4.5,
      currentMentions: 50,
      baselineMentions: 10,
      currentRatePerDay: 16.6,
      baselineRatePerDay: 0.33,
      person: {
        wikidataId: "Q1",
        name: "Alice & co",
        description: 'has "quotes"',
        occupation: [{ wikidataId: "Q1", label: "engineer" }],
      },
    },
  ],
};

export const topCompaniesFixture = {
  total: 1,
  data: [
    {
      wikidataId: "C1",
      spikeScore: 2.5,
      currentMentions: 30,
      baselineMentions: 10,
      currentRatePerDay: 10.0,
      baselineRatePerDay: 0.33,
      company: {
        id: "C1",
        name: "Acme & sons",
        domains: ["acme.com"],
        symbols: [{ symbol: "ACM", exchange: "NYSE" }],
        industry: "Tech",
        sector: "IT",
      },
    },
  ],
};
