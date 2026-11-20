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

export const wikipediaVectorArgs = z.object({
  ...paginationArgs.shape,
  query: z
    .string()
    .describe(
      "Natural-language description of what you are looking for; matched by meaning.",
    ),
  wikiCode: z
    .array(z.string())
    .optional()
    .describe(
      "Wiki project codes; only enwiki is supported.",
    ),
  wikidataId: z
    .array(z.string())
    .optional()
    .describe("Wikidata IDs (e.g. Q42)."),
  wikidataInstanceOfId: z
    .array(z.string())
    .optional()
    .describe("Pages whose Wikidata entity is an instance of these IDs."),
  wikidataInstanceOfLabel: z
    .array(z.string())
    .optional()
    .describe(
      "Pages whose Wikidata entity is an instance of these labels (e.g. human, city).",
    ),
  category: z
    .array(z.string())
    .optional()
    .describe("Wikipedia categories."),
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
      "Edited on Wikipedia after this date.",
    ),
  wikiRevisionTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Edited on Wikipedia before this date.",
    ),
});

export function searchVectorWikipedia(
  perigon: Perigon,
): ToolCallback<typeof wikipediaVectorArgs> {
  return async ({
    query,
    page,
    size,
    wikiCode,
    wikidataId,
    wikidataInstanceOfId,
    wikidataInstanceOfLabel,
    category,
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

      let output = createCurrentPageHeader(
        result.results.length,
        page,
        size,
        "Wikipedia pages (vector search)",
      );
      output += "\n<wikipedia_pages>\n";
      output += articles.join("\n\n");
      output += "\n</wikipedia_pages>";

      return toolResult(output);
    } catch (error: any) {
      console.error("Error searching Wikipedia with vector:", error);
      return toolResult(
        `Error: Failed to search Wikipedia with vector: ${await createErrorMessage(
          error,
        )}`,
      );
    }
  };
}

export const wikipediaVectorTool = {
  name: "search_vector_wikipedia",
  title: "Vector Wikipedia",
  description:
    "Semantic search over Wikipedia pages; use instead of search_wikipedia for conceptual or conversational queries. Returns summaries, Wikidata IDs, categories, and similarity scores. No withPageviews filter here; use pageviewsFrom/To.",
  parameters: wikipediaVectorArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchVectorWikipedia(perigon),
} satisfies ToolDefinition<typeof wikipediaVectorArgs>;
