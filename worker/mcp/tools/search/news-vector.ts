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
      "Natural-language description of what you are looking for, matched by meaning (e.g. 'impact of AI on healthcare outcomes').",
    ),
  pubDateFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Published after this date (ISO 8601 or yyyy-mm-dd). Default: 30 days ago.",
    ),
  pubDateTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Published before this date.",
    ),
  showReprints: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include wire-service reprints (AP, Reuters) duplicated across sites.",
    ),
  category: z
    .array(z.string())
    .optional()
    .describe(
      "Content categories (e.g. Politics, Tech, Business).",
    ),
  topic: z
    .array(z.string())
    .optional()
    .describe(
      "Topics, more granular than categories (e.g. Markets, Climate Change).",
    ),
  source: z
    .array(z.string())
    .optional()
    .describe("Publisher domains (e.g. cnn.com)."),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto.",
    ),
  language: z
    .array(z.string())
    .optional()
    .describe(
      "ISO-639 language codes (e.g. en, es).",
    ),
  country: z
    .array(z.string())
    .optional()
    .describe("2-letter country codes (e.g. us, gb)."),
  personName: z
    .array(z.string())
    .optional()
    .describe("Mentioned people, by name."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe(
      "Mentioned companies, by domain (e.g. apple.com).",
    ),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe(
      "Mentioned companies, by ticker (e.g. AAPL).",
    ),
  label: z
    .array(z.string())
    .optional()
    .describe(
      "Editorial labels: Opinion, Paid-news, Non-news, Fact Check, Press Release.",
    ),
});

export function searchVectorNews(
  perigon: Perigon,
): ToolCallback<typeof newsVectorArgs> {
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
          (article as any).journalists?.map((j: any) => j.id).join(", ") ?? "";
        const categories =
          (article as any).categories?.map((c: any) => c.name).join(", ") ?? "";
        const topics =
          (article as any).topics?.map((t: any) => t.name).join(", ") ?? "";
        const labels =
          (article as any).labels?.map((l: any) => l.name).join(", ") ?? "";

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
        "articles (vector search)",
      );
      output += "\n<articles>\n";
      output += articles.filter(Boolean).join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error in vector news search:", error);
      return toolResult(
        `Error: Failed to perform vector news search: ${await createErrorMessage(
          error,
        )}`,
      );
    }
  };
}

export const newsVectorTool = {
  name: "search_vector_news",
  title: "Vector News",
  description:
    "Semantic search over recent news; use instead of search_news_articles when the query is conversational or conceptual rather than keyword-based ('how is AI transforming drug discovery' vs 'AI drug discovery'). Covers the last 30 days unless pubDateFrom/To is set. Returns articles with content, metadata, and similarity scores.",
  parameters: newsVectorArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchVectorNews(perigon),
} satisfies ToolDefinition<typeof newsVectorArgs>;
