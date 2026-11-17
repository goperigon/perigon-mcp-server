import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, CountStatDto, StatResult } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import {
  statsFilterArgs,
  statsFilters,
  splitByEnum,
  normalizeSplitBy,
} from "../schemas/stats";
import { toolResult, noResults, dateAttr } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const articleCountsArgs = statsFilterArgs.extend({
  splitBy: splitByEnum.optional(),
});

export function getArticleCounts(
  perigon: Perigon,
): ToolCallback<typeof articleCountsArgs> {
  return async (
    args: z.infer<typeof articleCountsArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result: StatResult<CountStatDto> = await perigon.getArticleCounts({
        ...statsFilters(args),
        splitBy: normalizeSplitBy(args.splitBy),
      });

      if (!result.results || result.results.length === 0) return noResults;

      const totalArticles = result.results.reduce(
        (sum, r) => sum + r.numResults,
        0,
      );

      const rows = result.results.map(
        (r) => `<count_bucket${dateAttr(r.date)} count="${r.numResults}" />`,
      );

      let output = `Got ${result.results.length} bucket(s), ${totalArticles} total articles (splitBy=${args.splitBy ?? "DAY"})\n`;
      output += `<article_count_results>\n`;
      output += rows.join("\n");
      output += `\n</article_count_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_article_counts:", error);
      return toolResult(
        `Error: Failed to retrieve article counts: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const articleCountsTool = {
  name: "get_article_counts",
  title: "Article volume",
  description:
    "Article volume over time for articles matching the filters: one count per splitBy bucket (NONE = one total). Use for coverage trends or charts of counts; for a simple total, search_news_articles reports numResults. Supports a curated subset of search_news_articles filters. Reprints are excluded by default, matching search_news_articles totals.",
  parameters: articleCountsArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getArticleCounts(perigon),
} satisfies ToolDefinition<typeof articleCountsArgs>;
