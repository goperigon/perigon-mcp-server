import { AllEndpointSortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import {
  createBaseSearchArgs,
  categories,
  topics,
  resolveCountries,
} from "../schemas/base";
import { createSearchField } from "../schemas/search";
import {
  toolResult,
  withDefaultCountryNote,
  describeDefaultCountry,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

// The API derives the page size from maxArticleCount, so `size` would be ignored.
export const summarizeArgs = createBaseSearchArgs().omit({ size: true }).extend({
  query: createSearchField("article content"),
  categories,
  topics,
  prompt: z
    .string()
    .optional()
    .describe(
      "How to write the summary (max 2048 chars), e.g. 'Summarize the key developments and their implications'.",
    ),
  maxArticleCount: z
    .number()
    .int()
    .optional()
    .describe("Maximum articles fed into the summary."),
  returnedArticleCount: z
    .number()
    .int()
    .optional()
    .describe(
      "Maximum supporting articles returned (can be less than maxArticleCount).",
    ),
  maxTokens: z
    .number()
    .int()
    .optional()
    .describe("Maximum summary tokens."),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe(
      "Sampling temperature, 0 (deterministic) to 2. Ignored by gpt-6-luna and gpt-6.1-sol.",
    ),
  topP: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Nucleus sampling. Ignored by gpt-6-luna and gpt-6.1-sol.",
    ),
  model: z
    .enum(["gpt-6-luna", "gpt-6.1-sol", "openai/gpt-oss-120b"])
    .optional()
    .describe(
      "gpt-6-luna (default, fast, cheap) or gpt-6.1-sol for higher-quality synthesis of complex topics.",
    ),
  method: z
    .enum(["ARTICLES", "CLUSTERS"])
    .optional()
    .describe(
      "ARTICLES uses all matches; CLUSTERS picks one per story for diversity.",
    ),
  summarizeFields: z
    .enum(["TITLE", "CONTENT", "SUMMARY"])
    .optional()
    .describe(
      "Article fields fed into the summary.",
    ),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      "Publisher domains; wildcards supported (e.g. *.cnn.com).",
    ),
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
  personName: z
    .array(z.string())
    .optional()
    .describe("Mentioned people, by name."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe("Mentioned companies, by domain."),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe("Mentioned companies, by ticker."),
  showReprints: z
    .boolean()
    .default(false)
    .describe(
      "Include wire-service reprints among the summarized articles.",
    ),
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
    .describe("Order of articles fed into the summary."),
});

export function summarizeNews(
  perigon: Perigon,
): ToolCallback<typeof summarizeArgs> {
  return async ({
    query,
    page,
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
    showReprints,
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

      const { country, defaultCountryApplied } = resolveCountries(
        countries,
        cities,
        states,
      );
      const result = await perigon.searchSummarizer({
        summaryBody,
        q: query,
        page,
        state: states,
        city: cities,
        country,
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
        showReprints,
      });

      if (!result.summary && result.numResults === 0) {
        return toolResult(
          withDefaultCountryNote("No results found", defaultCountryApplied),
        );
      }

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

      return toolResult(withDefaultCountryNote(output, defaultCountryApplied));
    } catch (error) {
      console.error("Error summarizing news:", error);
      return toolResult(
        `Error: Failed to summarize news: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const summarizeTool = {
  name: "summarize_news",
  title: "Search Summarizer",
  description:
    "AI-generated summary of news coverage matching the filters, with supporting article citations. Use when the user wants an overview or briefing rather than a list of articles." +
    " " +
    describeDefaultCountry(["countries", "cities", "states"]),
  parameters: summarizeArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => summarizeNews(perigon),
} satisfies ToolDefinition<typeof summarizeArgs>;
