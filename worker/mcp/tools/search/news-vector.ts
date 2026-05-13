import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import {
  toolResult,
  noResults,
  createCurrentPageHeader,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const newsVectorArgs = z.object({
  ...paginationArgs.shape,
  query: z
    .string()
    .describe(
      "Natural language query for semantic search of news articles. Describe what you're looking for in conversational language (e.g., 'impact of artificial intelligence on healthcare outcomes'). The query is converted to a vector embedding to find semantically similar articles."
    ),
  pubDateFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Only return articles published after this date. ISO 8601 or yyyy-mm-dd. Default: last 30 days."
    ),
  pubDateTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Only return articles published before this date. ISO 8601 or yyyy-mm-dd."
    ),
  showReprints: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include wire-service reprints (AP, Reuters) that appear on multiple sites. Default: false for deduplication."
    ),
  category: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by content categories (e.g., Politics, Tech, Sports, Business, Finance). Multiple values use OR logic."
    ),
  topic: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by specific topics (e.g., Markets, Cryptocurrency, Climate Change). More granular than categories."
    ),
  source: z
    .array(z.string())
    .optional()
    .describe("Filter by publisher domains (e.g., cnn.com, nytimes.com)."),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Filter using curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto, etc."
    ),
  language: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by language using ISO-639 two-letter codes (e.g., en, es, fr)."
    ),
  country: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by country using two-letter codes (e.g., us, gb, jp)."
    ),
  personName: z
    .array(z.string())
    .optional()
    .describe("Filter for articles mentioning specific people by name."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning companies by domain (e.g., apple.com)."
    ),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning companies by stock ticker symbol (e.g., AAPL)."
    ),
  label: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by editorial labels: Opinion, Paid-news, Non-news, Fact Check, Press Release."
    ),
});

export function searchVectorNews(perigon: Perigon): ToolCallback {
  return async ({
    query,
    page,
    size,
    pubDateFrom,
    pubDateTo,
    showReprints,
    category,
    topic,
    source,
    sourceGroup,
    language,
    country,
    personName,
    companyDomain,
    companySymbol,
    label,
  }: z.infer<typeof newsVectorArgs>): Promise<CallToolResult> => {
    try {
      const filter: Record<string, any> = {};
      if (category) filter.category = category;
      if (topic) filter.topic = topic;
      if (source) filter.source = source;
      if (sourceGroup) filter.sourceGroup = sourceGroup;
      if (language) filter.language = language;
      if (country) filter.country = country;
      if (personName) filter.personName = personName;
      if (companyDomain) filter.companyDomain = companyDomain;
      if (companySymbol) filter.companySymbol = companySymbol;
      if (label) filter.label = label;

      const result = await perigon.vectorSearchArticles({
        articleSearchParams: {
          prompt: query,
          page,
          size,
          pubDateFrom,
          pubDateTo,
          showReprints,
          ...(Object.keys(filter).length > 0 ? { filter } : {}),
        },
      });

      if (!result.results || result.results.length === 0) return noResults;

      const articles = result.results.map((scored) => {
        const article = scored.data;
        if (!article) return "";
        const journalistIds =
          (article as any).journalists
            ?.map((j: any) => j.id)
            .join(", ") ?? "";
        const categories =
          (article as any).categories
            ?.map((c: any) => c.name)
            .join(", ") ?? "";
        const topics =
          (article as any).topics
            ?.map((t: any) => t.name)
            .join(", ") ?? "";
        const labels =
          (article as any).labels
            ?.map((l: any) => l.name)
            .join(", ") ?? "";

        return `<article id="${article.articleId}" title="${article.title}" score="${scored.score ?? "N/A"}">
URL: ${article.url}
Content: ${article.summary || article.content}
Pub Date: ${article.pubDate} (utc)
Add Date: ${(article as any).addDate} (utc)
Refresh Date: ${(article as any).refreshDate} (utc)
Source: ${article.source?.domain}
Author: ${(article as any).authorsByline}
Language: ${(article as any).language}
Country: ${(article as any).country}
Medium: ${(article as any).medium}
Sentiment: ${JSON.stringify((article as any).sentiment)}
Categories: ${categories}
Topics: ${topics}
Labels: ${labels}
Story Id: ${article.clusterId}
Journalist Ids: ${journalistIds}
Similarity Score: ${scored.score ?? "N/A"}
</article>`;
      });

      let output = createCurrentPageHeader(
        result.results.length,
        page,
        size,
        "articles (vector search)"
      );
      output += "\n<articles>\n";
      output += articles.filter(Boolean).join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error in vector news search:", error);
      return toolResult(
        `Error: Failed to perform vector news search: ${await createErrorMessage(
          error
        )}`
      );
    }
  };
}

export const newsVectorTool: ToolDefinition = {
  name: "search_vector_news",
  description:
    "Semantic search over recent news articles using natural language and vector embeddings. Use this instead of search_news_articles when the query is conversational, conceptual, or intent-based rather than keyword-based (e.g., 'how is AI transforming drug discovery' vs 'AI drug discovery'). Searches articles from the last 6 months by semantic similarity. Returns articles ranked by relevance score with content, metadata, and similarity scores.",
  parameters: newsVectorArgs,
  createHandler: (perigon: Perigon) => searchVectorNews(perigon),
};
