import { tool } from "ai";
import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  articleArgs,
  searchNewsArticles,
  searchStoriesArgs,
  searchNewsStories,
  journalistArgs,
  searchJournalists,
  sourceArgs,
  searchSources,
  peopleArgs,
  searchPeople,
  companyArgs,
  searchCompanies,
} from "../mcp/tools.js";

function convertMCPResult(mcpResult: CallToolResult): string {
  if (mcpResult.content?.[0]?.type === "text") {
    return mcpResult.content[0].text;
  }
  return "No result";
}

export function createAISDKTools(apiKey: string) {
  const perigon = new V1Api(new Configuration({ apiKey }));

  return {
    search_news_articles: tool({
      description:
        "Search individual news articles with advanced filtering by keywords, location, time range, sources, and journalists. Returns full article content or summaries with metadata.",
      parameters: articleArgs,
      execute: async (params: z.infer<typeof articleArgs>): Promise<string> => {
        const mcpTool = searchNewsArticles(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    }),

    read_news_stories: tool({
      description:
        "Search clustered news stories and headlines. Returns story summaries, sentiment analysis, and metadata for understanding major news events and trends across multiple sources.",
      parameters: searchStoriesArgs,
      execute: async (
        params: z.infer<typeof searchStoriesArgs>,
      ): Promise<string> => {
        const mcpTool = searchNewsStories(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    }),

    search_journalists: tool({
      description:
        "Find journalists and reporters by name, publication, location, or coverage area. Returns journalist profiles with their top sources, locations, and monthly posting activity.",
      parameters: journalistArgs,
      execute: async (
        params: z.infer<typeof journalistArgs>,
      ): Promise<string> => {
        const mcpTool = searchJournalists(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    }),

    search_sources: tool({
      description:
        "Discover news publications and media outlets by name, domain, location, or audience size. Returns source details including monthly visits, top topics, and geographic focus.",
      parameters: sourceArgs,
      execute: async (params: z.infer<typeof sourceArgs>): Promise<string> => {
        const mcpTool = searchSources(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    }),

    search_people: tool({
      description:
        "Search for public figures, politicians, celebrities, and newsworthy individuals. Returns biographical information including occupation, position, and detailed descriptions.",
      parameters: peopleArgs,
      execute: async (params: z.infer<typeof peopleArgs>): Promise<string> => {
        const mcpTool = searchPeople(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    }),

    search_companies: tool({
      description:
        "Find corporations and businesses by name, domain, or industry. Returns company profiles with CEO information, employee count, industry classification, and business descriptions.",
      parameters: companyArgs,
      execute: async (params: z.infer<typeof companyArgs>): Promise<string> => {
        const mcpTool = searchCompanies(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    }),
  };
}
