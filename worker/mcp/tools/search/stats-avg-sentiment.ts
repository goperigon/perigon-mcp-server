import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, AvgSentimentStatDto, StatResult } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import {
  statsFilterArgs,
  statsFilters,
  splitByEnum,
  normalizeSplitBy,
} from "../schemas/stats";
import { toolResult, noResults, dateAttr } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const avgSentimentArgs = statsFilterArgs.extend({
  splitBy: splitByEnum.optional(),
});

export function getAvgSentiment(
  perigon: Perigon,
): ToolCallback<typeof avgSentimentArgs> {
  return async (
    args: z.infer<typeof avgSentimentArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result: StatResult<AvgSentimentStatDto> =
        await perigon.getAvgSentiment({
          ...statsFilters(args),
          splitBy: normalizeSplitBy(args.splitBy),
        });

      if (!result.results || result.results.length === 0) return noResults;

      const rows = result.results.map(
        (r) =>
          `<sentiment_bucket${dateAttr(r.date)} articles="${r.numResults}">` +
          `\nPositive: ${r.avgSentiment.positive.toFixed(4)}` +
          `\nNegative: ${r.avgSentiment.negative.toFixed(4)}` +
          `\nNeutral: ${r.avgSentiment.neutral.toFixed(4)}` +
          `\n</sentiment_bucket>`,
      );

      let output = `Got ${result.results.length} sentiment bucket(s) (splitBy=${args.splitBy ?? "DAY"})\n`;
      output += `<avg_sentiment_results>\n`;
      output += rows.join("\n\n");
      output += `\n</avg_sentiment_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_avg_sentiment:", error);
      return toolResult(
        `Error: Failed to retrieve average sentiment: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const avgSentimentTool = {
  name: "get_avg_sentiment",
  title: "Average sentiment",
  description:
    "Average positive, negative, and neutral sentiment over time for articles matching the filters: one record per splitBy bucket (NONE = one aggregate). Use for sentiment trends or shifts in tone; for one article's sentiment, use search_news_articles. Supports a curated subset of search_news_articles filters. Pair with get_article_counts on identical filters for a trend view.",
  parameters: avgSentimentArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getAvgSentiment(perigon),
} satisfies ToolDefinition<typeof avgSentimentArgs>;
