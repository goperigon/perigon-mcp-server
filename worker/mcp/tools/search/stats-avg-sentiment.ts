import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, AvgSentimentStatDto, StatResult } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs, splitByEnum, normalizeSplitBy } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const avgSentimentArgs = statsFilterArgs.extend({
  splitBy: splitByEnum.optional(),
});

export function getAvgSentiment(perigon: Perigon): ToolCallback {
  return async (args: z.infer<typeof avgSentimentArgs>): Promise<CallToolResult> => {
    try {
      const result: StatResult<AvgSentimentStatDto> = await perigon.getAvgSentiment({
        q: args.q,
        from: args.from,
        to: args.to,
        source: args.source,
        sourceGroup: args.sourceGroup,
        category: args.category,
        topic: args.topic,
        language: args.language,
        country: args.country,
        personName: args.personName,
        companyDomain: args.companyDomain,
        companySymbol: args.companySymbol,
        splitBy: normalizeSplitBy(args.splitBy),
      });

      if (!result.results || result.results.length === 0) return noResults;

      const rows = result.results.map((r) =>
        `<sentiment_bucket date="${r.date}" articles="${r.numResults}">` +
        `\nPositive: ${r.avgSentiment.positive.toFixed(4)}` +
        `\nNegative: ${r.avgSentiment.negative.toFixed(4)}` +
        `\nNeutral: ${r.avgSentiment.neutral.toFixed(4)}` +
        `\n</sentiment_bucket>`
      );

      let output = `Got ${result.results.length} sentiment bucket(s) (splitBy=${args.splitBy ?? "DAY"})\n`;
      output += `<avg_sentiment_results>\n`;
      output += rows.join("\n\n");
      output += `\n</avg_sentiment_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_avg_sentiment:", error);
      return toolResult(
        `Error: Failed to retrieve average sentiment: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const avgSentimentTool: ToolDefinition = {
  name: "get_avg_sentiment",
  description:
    "Get average sentiment scores (positive, negative, neutral) bucketed over time for articles matching the given filters. Use this when the user asks about sentiment trends, how tone of coverage has shifted, or wants a chart/table of sentiment over a period — NOT for reading sentiment on individual articles (use search_news_articles for that). Returns one sentiment record per time bucket with averaged positive, negative, and neutral scores. Use splitBy to control the interval (HOUR, DAY, WEEK, MONTH, or NONE for a single aggregate across the whole date range). Supports the same article filters as search_news_articles.",
  parameters: avgSentimentArgs,
  createHandler: (perigon: Perigon) => getAvgSentiment(perigon),
};
