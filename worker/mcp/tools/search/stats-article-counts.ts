import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, CountStatDto, StatResult } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs, splitByEnum } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const articleCountsArgs = statsFilterArgs.extend({
  splitBy: splitByEnum.optional(),
});

export function getArticleCounts(perigon: Perigon): ToolCallback {
  return async (args: z.infer<typeof articleCountsArgs>): Promise<CallToolResult> => {
    try {
      const result: StatResult<CountStatDto> = await perigon.getArticleCounts({
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
        splitBy: args.splitBy,
      });

      if (!result.results || result.results.length === 0) return noResults;

      const totalArticles = result.results.reduce((sum, r) => sum + r.count, 0);

      const rows = result.results.map((r) =>
        `<count_bucket date="${r.pubDate ?? r.addDate}" count="${r.count}" />`
      );

      let output = `Got ${result.numResults} bucket(s), ${totalArticles} total articles (splitBy=${args.splitBy ?? "DAY"})\n`;
      output += `<article_count_results>\n`;
      output += rows.join("\n");
      output += `\n</article_count_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_article_counts:", error);
      return toolResult(
        `Error: Failed to retrieve article counts: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const articleCountsTool: ToolDefinition = {
  name: "get_article_counts",
  description:
    "Get article publication volume bucketed over time for articles matching the given filters. Use this when the user asks about coverage trends, how much a topic was covered over time, or wants a chart/table of article counts — NOT just for finding the total number of articles (use search_news_articles with showNumResults for a simple total count). Returns one count per time bucket. Use splitBy to control the interval (HOUR, DAY, WEEK, MONTH, or NONE for a single total across the whole date range). Supports the same article filters as search_news_articles.",
  parameters: articleCountsArgs,
  createHandler: (perigon: Perigon) => getArticleCounts(perigon),
};
