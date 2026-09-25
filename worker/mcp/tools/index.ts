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
 * Monitor Tools (Continuous EVENT, MENTIONS, and TOPIC tracking):
 * - Create, inspect, update, activate, pause, and archive monitors
 * - Retrieve structured events, scheduled newsletters, and summary history
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

export { listMonitorsTool } from "./monitors/list-monitors";
export { getMonitorTool } from "./monitors/get-monitor";
export { getMonitorEventsTool } from "./monitors/get-monitor-events";
export { getMonitorNewslettersTool } from "./monitors/get-monitor-newsletters";
export { getMonitorSummariesTool } from "./monitors/get-monitor-summaries";
export { createMonitorTool } from "./monitors/create-monitor";
export { updateMonitorTool } from "./monitors/update-monitor";
export { setMonitorStatusTool } from "./monitors/set-monitor-status";

// Export entitlement/access tools
export { apiAccessTool } from "./access/api-access";

// Export platform (watchlists, source groups, contact points, article refresh) tools
export { sourceByIdTool } from "./platform/source-by-id";
export { topTopicsTool } from "./platform/top-topics";
export { storyStatsTool } from "./platform/story-stats";
export { watchlistsTool } from "./platform/watchlists";
export { createWatchlistTool } from "./platform/create-watchlist";
export { updateWatchlistTool } from "./platform/update-watchlist";
export { sourceGroupsTool } from "./platform/source-groups";
export { createSourceGroupTool } from "./platform/create-source-group";
export { updateSourceGroupTool } from "./platform/update-source-group";
export { contactPointsTool } from "./platform/contact-points";
export { articleRefreshTool } from "./platform/article-refresh";

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

export { listMonitors } from "./monitors/list-monitors";
export { getMonitor } from "./monitors/get-monitor";
export { getMonitorEvents } from "./monitors/get-monitor-events";
export { getMonitorNewsletters } from "./monitors/get-monitor-newsletters";
export { getMonitorSummaries } from "./monitors/get-monitor-summaries";
export { createMonitor } from "./monitors/create-monitor";
export { updateMonitor } from "./monitors/update-monitor";
export { setMonitorStatus } from "./monitors/set-monitor-status";

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

export { listMonitorsArgs } from "./monitors/list-monitors";
export { getMonitorArgs } from "./monitors/get-monitor";
export { getMonitorEventsArgs } from "./monitors/get-monitor-events";
export { getMonitorNewslettersArgs } from "./monitors/get-monitor-newsletters";
export { getMonitorSummariesArgs } from "./monitors/get-monitor-summaries";
export { createMonitorArgs } from "./monitors/create-monitor";
export { updateMonitorArgs } from "./monitors/update-monitor";
export { setMonitorStatusArgs } from "./monitors/set-monitor-status";

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
  parseDateParam,
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
import { listMonitorsTool } from "./monitors/list-monitors";
import { getMonitorTool } from "./monitors/get-monitor";
import { getMonitorEventsTool } from "./monitors/get-monitor-events";
import { getMonitorNewslettersTool } from "./monitors/get-monitor-newsletters";
import { getMonitorSummariesTool } from "./monitors/get-monitor-summaries";
import { createMonitorTool } from "./monitors/create-monitor";
import { updateMonitorTool } from "./monitors/update-monitor";
import { setMonitorStatusTool } from "./monitors/set-monitor-status";
import { apiAccessTool } from "./access/api-access";
import { sourceByIdTool } from "./platform/source-by-id";
import { topTopicsTool } from "./platform/top-topics";
import { storyStatsTool } from "./platform/story-stats";
import { watchlistsTool } from "./platform/watchlists";
import { createWatchlistTool } from "./platform/create-watchlist";
import { updateWatchlistTool } from "./platform/update-watchlist";
import { sourceGroupsTool } from "./platform/source-groups";
import { createSourceGroupTool } from "./platform/create-source-group";
import { updateSourceGroupTool } from "./platform/update-source-group";
import { contactPointsTool } from "./platform/contact-points";
import { articleRefreshTool } from "./platform/article-refresh";
import { ToolDefinition } from "./types";
import { createWorkspaceTool } from "./signals/create-workspace";
import { searchSignalsTool } from "./signals/search-signals";
import { readSignalTool } from "./signals/read-signal";
import { listNewslettersTool } from "./signals/list-newsletters";
import { readNewsletterTool } from "./signals/read-newsletter";
import { exportEventsTool } from "./signals/export-events";
import { executeCodeTool } from "./signals/execute-code";
import { previewChartTool } from "./signals/preview-chart";
import { shellTool } from "./signals/shell";
import { listFilesTool } from "./signals/list-files";
import { grepTool } from "./signals/grep";
import { readFileTool } from "./signals/read-file";
import { writeFileTool } from "./signals/write-file";
import { strReplaceTool } from "./signals/str-replace";

function signalStub(tool: {
  name: string;
  description: string;
  parameters: any;
}): ToolDefinition<any> {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    createHandler: () => async () => ({
      content: [
        {
          type: "text" as const,
          text: "Signal Insights tools require MCP transport. Connect via /v1/mcp.",
        },
      ],
      isError: true,
    }),
  };
}

/**
 * Complete registry of all available tools
 *
 * This object provides a centralized registry of all MCP tools available
 * in the Perigon server. Each tool is keyed by its name and contains
 * all necessary metadata for MCP registration.
 */
export const TOOL_DEFINITIONS: Record<string, ToolDefinition<any>> = {
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

  list_monitors: listMonitorsTool,
  get_monitor: getMonitorTool,
  get_monitor_events: getMonitorEventsTool,
  get_monitor_newsletters: getMonitorNewslettersTool,
  get_monitor_summaries: getMonitorSummariesTool,
  create_monitor: createMonitorTool,
  update_monitor: updateMonitorTool,
  set_monitor_status: setMonitorStatusTool,

  // Entitlement/access tools
  get_api_access: apiAccessTool,

  // Platform tools (watchlists, source groups, contact points, article refresh, extra stats/lookup)
  get_source_by_id: sourceByIdTool,
  get_top_topics: topTopicsTool,
  get_story_stats: storyStatsTool,
  watchlists: watchlistsTool,
  create_watchlist: createWatchlistTool,
  update_watchlist: updateWatchlistTool,
  source_groups: sourceGroupsTool,
  create_source_group: createSourceGroupTool,
  update_source_group: updateSourceGroupTool,
  contact_points: contactPointsTool,
  article_refresh: articleRefreshTool,

  // Signal Insights tools — schemas listed for inspector/tool-selector discovery.
  // createHandler stubs return an error; actual execution requires MCP transport.
  signal_insights_create_workspace: signalStub(createWorkspaceTool),
  signal_insights_search_signals: signalStub(searchSignalsTool),
  signal_insights_read_signal: signalStub(readSignalTool),
  signal_insights_list_newsletters: signalStub(listNewslettersTool),
  signal_insights_read_newsletter: signalStub(readNewsletterTool),
  signal_insights_export_events: signalStub(exportEventsTool),
  signal_insights_execute_code: signalStub(executeCodeTool),
  signal_insights_preview_chart: signalStub(previewChartTool),
  signal_insights_shell: signalStub(shellTool),
  signal_insights_list_files: signalStub(listFilesTool),
  signal_insights_grep: signalStub(grepTool),
  signal_insights_read_file: signalStub(readFileTool),
  signal_insights_write_file: signalStub(writeFileTool),
  signal_insights_str_replace: signalStub(strReplaceTool),
} as const;

/**
 * Type-safe tool name enumeration
 */
export type ToolName = keyof typeof TOOL_DEFINITIONS;
