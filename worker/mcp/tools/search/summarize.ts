import { AllEndpointSortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { createBaseSearchArgs, categories, topics } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const summarizeArgs = createBaseSearchArgs().extend({
  query: createSearchField("article content for summarization"),
  categories,
  topics,
  prompt: z
    .string()
    .optional()
    .describe(
      "Instructions guiding how the summary should be written. Maximum 2048 characters. Example: 'Summarize the key developments and their implications'"
    ),
  maxArticleCount: z
    .number()
    .int()
    .optional()
    .describe(
      "Maximum number of articles to factor into the summary generation."
    ),
  returnedArticleCount: z
    .number()
    .int()
    .optional()
    .describe(
      "Maximum number of supporting articles to include in the response (can be less than maxArticleCount)."
    ),
  maxTokens: z
    .number()
    .int()
    .optional()
    .describe("Maximum tokens to generate in the summary."),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe(
      "LLM sampling temperature: 0.0 = deterministic, up to 2.0 = very creative."
    ),
  topP: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Nucleus sampling (0.0-1.0)."),
  model: z
    .enum([
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "llama-3.3-70b-versatile",
      "deepseek-r1-distill-llama-70b",
    ])
    .optional()
    .describe("LLM model to use for summary generation."),
  method: z
    .enum(["ARTICLES", "CLUSTERS"])
    .optional()
    .describe(
      "Article selection method: ARTICLES includes all matches, CLUSTERS picks one per cluster for diversity."
    ),
  summarizeFields: z
    .enum(["TITLE", "CONTENT", "SUMMARY"])
    .optional()
    .describe(
      "Which article fields to include when generating: TITLE, CONTENT, or SUMMARY."
    ),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      "Filter articles by publisher domains. Supports wildcards (e.g., *.cnn.com)."
    ),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Filter using curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto."
    ),
  language: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by language using ISO-639 two-letter codes (e.g., en, es, fr)."
    ),
  personName: z
    .array(z.string())
    .optional()
    .describe("Filter for articles mentioning specific people."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe("Filter for articles mentioning companies by domain."),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe("Filter for articles mentioning companies by ticker symbol."),
  sortBy: z
    .enum([
      AllEndpointSortBy.Date,
      AllEndpointSortBy.ReverseDate,
      AllEndpointSortBy.Relevance,
      AllEndpointSortBy.PubDate,
      AllEndpointSortBy.RefreshDate,
      AllEndpointSortBy.AddDate,
      AllEndpointSortBy.ReverseAddDate,
    ])
    .default(AllEndpointSortBy.Date)
    .optional()
    .describe("Sort order for articles fed into the summarizer."),
});

export function summarizeNews(perigon: Perigon): ToolCallback {
  return async ({
    query,
    page,
    size,
    states,
    cities,
    countries,
    from,
    to,
    sortBy,
    prompt,
    maxArticleCount,
    returnedArticleCount,
    maxTokens,
    temperature,
    topP,
    model,
    method,
    summarizeFields,
    sources,
    sourceGroup,
    language,
    personName,
    companyDomain,
    companySymbol,
    categories,
    topics,
  }: z.infer<typeof summarizeArgs>): Promise<CallToolResult> => {
    try {
      const summaryBody: Record<string, any> = {};
      if (prompt) summaryBody.prompt = prompt;
      if (maxArticleCount) summaryBody.maxArticleCount = maxArticleCount;
      if (returnedArticleCount)
        summaryBody.returnedArticleCount = returnedArticleCount;
      if (maxTokens) summaryBody.maxTokens = maxTokens;
      if (temperature !== undefined) summaryBody.temperature = temperature;
      if (topP !== undefined) summaryBody.topP = topP;
      if (model) summaryBody.model = model;
      if (method) summaryBody.method = method;
      if (summarizeFields) summaryBody.summarizeFields = summarizeFields;

      const result = await perigon.searchSummarizer({
        summaryBody,
        q: query,
        page,
        size,
        state: states,
        city: cities,
        country: countries,
        from,
        to,
        sortBy,
        source: sources,
        sourceGroup,
        language,
        personName,
        companyDomain,
        companySymbol,
        category: categories,
        topic: topics,
        showReprints: false,
      });

      if (!result.summary && result.numResults === 0) return noResults;

      let output = `<summary>\n${result.summary}\n</summary>\n`;
      output += `\nBased on ${result.numResults} articles.\n`;

      if (result.results && result.results.length > 0) {
        const articles = result.results.map((article) => {
          return `<supporting_article id="${article.articleId}" title="${article.title}">
Source: ${article.source?.domain}
Pub Date: ${article.pubDate} (utc)
</supporting_article>`;
        });

        output += "\n<supporting_articles>\n";
        output += articles.join("\n");
        output += "\n</supporting_articles>";
      }

      return toolResult(output);
    } catch (error) {
      console.error("Error summarizing news:", error);
      return toolResult(
        `Error: Failed to summarize news: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const summarizeTool: ToolDefinition = {
  name: "summarize_news",
  description:
    "Generate an AI-powered summary of news coverage matching your filters. Use this when the user wants a synthesized overview or briefing on a topic rather than a list of individual articles. Combines article search with LLM summarization to produce concise, coherent summaries with supporting article citations. Accepts all standard article filters (keywords, categories, topics, sources, dates, locations) plus summarization controls (prompt, model, temperature).",
  parameters: summarizeArgs,
  createHandler: (perigon: Perigon) => summarizeNews(perigon),
};
