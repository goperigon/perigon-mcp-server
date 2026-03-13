import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import {
  toolResult,
  noResults,
  createPaginationHeader,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const wikipediaVectorArgs = z.object({
  ...paginationArgs.shape,
  query: z
    .string()
    .describe(
      "Natural language query for semantic search of Wikipedia content. Describe what you're looking for in conversational language. The query is converted to a vector embedding to find semantically similar Wikipedia pages and sections."
    ),
  wikiCode: z
    .array(z.string())
    .optional()
    .describe(
      "Wiki project codes (e.g., enwiki). Currently only 'enwiki' is supported."
    ),
  wikidataId: z
    .array(z.string())
    .optional()
    .describe("Filter by Wikidata entity IDs (e.g., Q42, Q937)."),
  wikidataInstanceOfId: z
    .array(z.string())
    .optional()
    .describe(
      "Filter pages whose Wikidata entities are instances of these IDs."
    ),
  wikidataInstanceOfLabel: z
    .array(z.string())
    .optional()
    .describe(
      "Filter pages whose Wikidata entities are instances of these labels (e.g., human, city, country)."
    ),
  category: z
    .array(z.string())
    .optional()
    .describe("Filter by Wikipedia categories."),
  withPageviews: z
    .boolean()
    .optional()
    .describe("Only return pages that have viewership statistics."),
  pageviewsFrom: z
    .number()
    .optional()
    .describe("Minimum average daily page views."),
  pageviewsTo: z
    .number()
    .optional()
    .describe("Maximum average daily page views."),
  wikiRevisionFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Pages modified on Wikipedia after this date. ISO 8601 or yyyy-mm-dd."
    ),
  wikiRevisionTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Pages modified on Wikipedia before this date. ISO 8601 or yyyy-mm-dd."
    ),
});

export function searchVectorWikipedia(perigon: Perigon): ToolCallback {
  return async ({
    query,
    page,
    size,
    wikiCode,
    wikidataId,
    wikidataInstanceOfId,
    wikidataInstanceOfLabel,
    category,
    withPageviews,
    pageviewsFrom,
    pageviewsTo,
    wikiRevisionFrom,
    wikiRevisionTo,
  }: z.infer<typeof wikipediaVectorArgs>): Promise<CallToolResult> => {
    try {
      const filter: Record<string, any> = {};
      if (wikiCode) filter.wikiCode = wikiCode;
      if (wikidataId) filter.wikidataId = wikidataId;
      if (wikidataInstanceOfId)
        filter.wikidataInstanceOfId = wikidataInstanceOfId;
      if (wikidataInstanceOfLabel)
        filter.wikidataInstanceOfLabel = wikidataInstanceOfLabel;
      if (category) filter.category = category;

      const result = await perigon.vectorSearchWikipedia({
        wikipediaSearchParams: {
          prompt: query,
          page,
          size,
          pageviewsFrom,
          pageviewsTo,
          wikiRevisionFrom,
          wikiRevisionTo,
          ...(Object.keys(filter).length > 0 ? { filter } : {}),
        },
      });

      if (!result.results || result.results.length === 0) return noResults;

      const articles = result.results.map((scored: any) => {
        const pageData = scored.data || scored;
        return `<wikipedia_page id="${pageData.id || "N/A"}" title="${pageData.wikiTitle || pageData.title || "N/A"}">
URL: ${pageData.url || "N/A"}
Summary: ${pageData.summary || "N/A"}
Wikidata ID: ${pageData.wikidataId || "N/A"}
Categories: ${pageData.categories?.join(", ") || "N/A"}
Page Views: ${pageData.pageviews || "N/A"}
Last Modified: ${pageData.wikiRevisionTs || "N/A"}
Similarity Score: ${scored.score || "N/A"}
</wikipedia_page>`;
      });

      let output = createPaginationHeader(
        result.results.length,
        page,
        size,
        "Wikipedia pages (vector search)"
      );
      output += "\n<wikipedia_pages>\n";
      output += articles.join("\n\n");
      output += "\n</wikipedia_pages>";

      return toolResult(output);
    } catch (error: any) {
      console.error("Error searching Wikipedia with vector:", error);
      return toolResult(
        `Error: Failed to search Wikipedia with vector: ${await createErrorMessage(
          error
        )}`
      );
    }
  };
}

export const wikipediaVectorTool: ToolDefinition = {
  name: "search_vector_wikipedia",
  description:
    "Semantic search over Wikipedia pages using natural language and vector embeddings. Use this instead of search_wikipedia when the query is conceptual or conversational rather than keyword-based. Finds pages related by meaning even without exact keyword matches. Returns page summaries, content excerpts, Wikidata IDs, categories, and similarity scores.",
  parameters: wikipediaVectorArgs,
  createHandler: (perigon: Perigon) => searchVectorWikipedia(perigon),
};
