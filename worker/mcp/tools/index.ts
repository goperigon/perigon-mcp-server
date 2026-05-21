/**
 * Perigon MCP Server Tools
 *
 * This module provides a comprehensive set of tools for searching and retrieving
 * information from the Perigon API through the Model Context Protocol (MCP).
 *
 * Available Tools:
 *
 * Search Tools:
 * - News Articles: Search individual news articles with advanced filtering
 * - News Stories: Search clustered news stories and headlines
 * - Journalists: Find journalists and reporters by various criteria
 * - Sources: Discover news publications and media outlets
 * - People: Search for public figures and newsworthy individuals
 * - Companies: Find corporations and businesses
 * - Topics: Search available topics in the Perigon taxonomy
 * - Wikipedia: Search Wikipedia pages with advanced filtering
 * - Wikipedia Vector: Semantic search of Wikipedia using vector embeddings
 *
 * Stats Tools (Aggregate metrics and trend analysis):
 * - Avg Sentiment: Average sentiment scores over time
 * - Article Counts: Article publication volume over time
 * - Top Entities: Most-mentioned topics, people, companies, cities, and sources
 * - Top People: People with the biggest coverage spikes
 * - Top Companies: Companies with the biggest coverage spikes
 *
 * Use-Case Tools (Simplified workflows for common tasks):
 * - Company News: Get recent news about a specific company
 * - Person News: Get recent news about a specific person
 *
 * Signal Insights Tools (AI signal data analysis):
 * These tools require MCP transport (/v1/mcp) and are registered dynamically
 * per session via PokeyInsightsClient / InsightsApiClient. They are listed
 * in TOOL_DEFINITIONS for schema discovery (inspector, ?tools= param) but
 * their createHandler stubs are intentionally not callable — execution routes
 * through the stateful MCP Durable Object.
 *
 * Each tool is designed to be:
 * - Well-documented with comprehensive JSDoc comments
 * - MCP-compliant with proper parameter schemas
 * - Error-resilient with standardized error handling
 * - Maintainable with clear separation of concerns
 */

// Export all tool definitions
export { newsArticlesTool } from "./search/news-articles";
export { newsStoriesTool } from "./search/news-stories";
export { storyHistoryTool } from "./search/story-history";
export { newsVectorTool } from "./search/news-vector";
export { summarizeTool } from "./search/summarize";
export { journalistsTool } from "./search/journalists";
export { sourcesTool } from "./search/sources";
export { peopleTool } from "./search/people";
export { companiesTool } from "./search/companies";
export { topicsTool } from "./search/topics";
export { wikipediaTool } from "./search/wikipedia";
export { wikipediaVectorTool } from "./search/wikipedia-vector";

// Export stats tool definitions
export { avgSentimentTool } from "./search/stats-avg-sentiment";
export { articleCountsTool } from "./search/stats-article-counts";
export { topEntitiesTool } from "./search/stats-top-entities";
export { topPeopleTool } from "./search/stats-top-people";
export { topCompaniesTool } from "./search/stats-top-companies";

// Export use-case tools
export { companyNewsTool } from "./use-cases/company-news";
export { personNewsTool } from "./use-cases/person-news";
export { locationNewsTool } from "./use-cases/location-news";

// Export individual tool functions for direct use
export { searchNewsArticles } from "./search/news-articles";
export { searchNewsStories } from "./search/news-stories";
export { searchStoryHistory } from "./search/story-history";
export { searchVectorNews } from "./search/news-vector";
export { summarizeNews } from "./search/summarize";
export { searchJournalists } from "./search/journalists";
export { searchSources } from "./search/sources";
export { searchPeople } from "./search/people";
export { searchCompanies } from "./search/companies";
export { searchTopics } from "./search/topics";
export { searchWikipedia } from "./search/wikipedia";
export { searchVectorWikipedia } from "./search/wikipedia-vector";

// Export stats tool functions
export { getAvgSentiment } from "./search/stats-avg-sentiment";
export { getArticleCounts } from "./search/stats-article-counts";
export { getTopEntities } from "./search/stats-top-entities";
export { getTopPeople } from "./search/stats-top-people";
export { getTopCompanies } from "./search/stats-top-companies";

// Export use-case tool functions
export { getCompanyNews } from "./use-cases/company-news";
export { getPersonNews } from "./use-cases/person-news";
export { getLocationNews } from "./use-cases/location-news";

// Export argument schemas for external use
export { newsArticlesArgs } from "./search/news-articles";
export { newsStoriesArgs } from "./search/news-stories";
export { storyHistoryArgs } from "./search/story-history";
export { newsVectorArgs } from "./search/news-vector";
export { summarizeArgs } from "./search/summarize";
export { journalistsArgs } from "./search/journalists";
export { sourcesArgs } from "./search/sources";
export { peopleArgs } from "./search/people";
export { companiesArgs } from "./search/companies";
export { topicsArgs } from "./search/topics";
export { wikipediaArgs } from "./search/wikipedia";
export { wikipediaVectorArgs } from "./search/wikipedia-vector";

// Export stats argument schemas
export { avgSentimentArgs } from "./search/stats-avg-sentiment";
export { articleCountsArgs } from "./search/stats-article-counts";
export { topEntitiesArgs } from "./search/stats-top-entities";
export { topPeopleArgs } from "./search/stats-top-people";
export { topCompaniesArgs } from "./search/stats-top-companies";

// Export use-case argument schemas
export { companyNewsArgs } from "./use-cases/company-news";
export { personNewsArgs } from "./use-cases/person-news";
export { locationNewsArgs } from "./use-cases/location-news";

// Export shared types and utilities
export type { ToolCallback, ToolDefinition } from "./types";
export { CONSTANTS } from "./types";

// Export utility functions
export {
  toolResult,
  noResults,
  createPaginationHeader,
} from "./utils/formatting";
export { createErrorMessage } from "./utils/error-handling";

// Export schema utilities
export { createSearchField, sortByEnum } from "./schemas/search";
export {
  locationArgs,
  paginationArgs,
  defaultArgs,
  categories,
  topics,
  createBaseSearchArgs,
} from "./schemas/base";

// Import all tool definitions
import { newsArticlesTool } from "./search/news-articles";
import { newsStoriesTool } from "./search/news-stories";
import { storyHistoryTool } from "./search/story-history";
import { newsVectorTool } from "./search/news-vector";
import { summarizeTool } from "./search/summarize";
import { journalistsTool } from "./search/journalists";
import { sourcesTool } from "./search/sources";
import { peopleTool } from "./search/people";
import { companiesTool } from "./search/companies";
import { topicsTool } from "./search/topics";
import { wikipediaTool } from "./search/wikipedia";
import { wikipediaVectorTool } from "./search/wikipedia-vector";
import { avgSentimentTool } from "./search/stats-avg-sentiment";
import { articleCountsTool } from "./search/stats-article-counts";
import { topEntitiesTool } from "./search/stats-top-entities";
import { topPeopleTool } from "./search/stats-top-people";
import { topCompaniesTool } from "./search/stats-top-companies";
import { companyNewsTool } from "./use-cases/company-news";
import { personNewsTool } from "./use-cases/person-news";
import { locationNewsTool } from "./use-cases/location-news";
import { ToolDefinition } from "./types";
import {
  createWorkspaceSchema,
  searchSignalsSchema,
  readSignalSchema,
  exportEventsSchema,
  executeCodeSchema,
  shellSchema,
  listFilesSchema,
  grepSchema,
  readFileSchema,
  writeFileSchema,
  strReplaceSchema,
} from "./signals/schemas";

const InsightsHandler = () => async () => ({
  content: [
    {
      type: "text" as const,
      text: "Signal Insights tools require MCP transport. Connect via /v1/mcp.",
    },
  ],
  isError: true,
});

/**
 * Complete registry of all available tools
 *
 * This object provides a centralized registry of all MCP tools available
 * in the Perigon server. Each tool is keyed by its name and contains
 * all necessary metadata for MCP registration.
 */
export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  // Search tools
  search_news_articles: newsArticlesTool,
  search_news_stories: newsStoriesTool,
  search_story_history: storyHistoryTool,
  search_vector_news: newsVectorTool,
  summarize_news: summarizeTool,
  search_journalists: journalistsTool,
  search_sources: sourcesTool,
  search_people: peopleTool,
  search_companies: companiesTool,
  search_topics: topicsTool,
  search_wikipedia: wikipediaTool,
  search_vector_wikipedia: wikipediaVectorTool,

  // Stats tools
  get_avg_sentiment: avgSentimentTool,
  get_article_counts: articleCountsTool,
  get_top_entities: topEntitiesTool,
  get_top_people: topPeopleTool,
  get_top_companies: topCompaniesTool,

  // Use-case tools
  get_company_news: companyNewsTool,
  get_person_news: personNewsTool,
  get_location_news: locationNewsTool,

  // Signal Insights tools — schemas listed for inspector/tool-selector discovery.
  // createHandler stubs return an error; actual execution requires MCP transport.
  signal_insights_create_workspace: {
    name: "signal_insights_create_workspace",
    description:
      "Create a new Signal Insights analysis workspace. Call this ONCE at the beginning of any conversation that needs data analysis. Returns a workspace handle required by all analysis tools. Do NOT invent workspace IDs — always use the one returned here.",
    parameters: createWorkspaceSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_search_signals: {
    name: "signal_insights_search_signals",
    description:
      "Search for signals by name or monitoring objective. Use this to find relevant signals before fetching data. If the search query is not present, this can be used to list all available signals.",
    parameters: searchSignalsSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_read_signal: {
    name: "signal_insights_read_signal",
    description:
      "Get full signal metadata including data schema, available event types, and event count. Use before signal_insights_export_events to understand the available fields for a signal.",
    parameters: readSignalSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_export_events: {
    name: "signal_insights_export_events",
    description:
      "Export signal events using a structured query API. No raw SQL — specify signals, fields, filters, aggregations, and ordering. Returns a preview of the first rows plus an S3 file path.",
    parameters: exportEventsSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_execute_code: {
    name: "signal_insights_execute_code",
    description:
      "Execute Python code inside a persistent sandboxed Jupyter kernel (IPython). State is fully preserved between calls. Pre-installed: pandas, numpy, matplotlib, and more.",
    parameters: executeCodeSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_shell: {
    name: "signal_insights_shell",
    description:
      "Run a bash command in the E2B sandbox environment. Working directory is /home/user/workspace.",
    parameters: shellSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_list_files: {
    name: "signal_insights_list_files",
    description:
      "List files in a directory of the sandbox workspace. Default directory is the workspace root (/home/user/workspace).",
    parameters: listFilesSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_grep: {
    name: "signal_insights_grep",
    description:
      "Search a file's contents for lines matching a regex pattern. Returns matching lines with line numbers.",
    parameters: grepSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_read_file: {
    name: "signal_insights_read_file",
    description:
      "Read a file from the sandbox workspace. Internally, this reads the full file into memory. Use on files up to a few MB.",
    parameters: readFileSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_write_file: {
    name: "signal_insights_write_file",
    description:
      "Write content to a file in the sandbox workspace. Creates directories as needed.",
    parameters: writeFileSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
  signal_insights_str_replace: {
    name: "signal_insights_str_replace",
    description:
      "Find and replace a string in a file in the sandbox workspace. Internally, this reads the full file into memory.",
    parameters: strReplaceSchema,
    createHandler: InsightsHandler,
  } satisfies ToolDefinition,
} as const;

/**
 * Type-safe tool name enumeration
 */
export type ToolName = keyof typeof TOOL_DEFINITIONS;
