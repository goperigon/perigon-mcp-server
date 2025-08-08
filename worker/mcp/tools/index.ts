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
 * Use-Case Tools (Simplified workflows for common tasks):
 * - Company News: Get recent news about a specific company
 * - Person News: Get recent news about a specific person
 * - Top Headlines: Get current top headlines and breaking news
 * - Location News: Get news by geographic location (city, state, country)
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
export { journalistsTool } from "./search/journalists";
export { sourcesTool } from "./search/sources";
export { peopleTool } from "./search/people";
export { companiesTool } from "./search/companies";
export { topicsTool } from "./search/topics";
export { wikipediaTool } from "./search/wikipedia";
export { wikipediaVectorTool } from "./search/wikipedia-vector";

// Export use-case tools
export { companyNewsTool } from "./use-cases/company-news";
export { personNewsTool } from "./use-cases/person-news";
export { topHeadlinesTool } from "./use-cases/top-headlines";
export { locationNewsTool } from "./use-cases/location-news";

// Export individual tool functions for direct use
export { searchNewsArticles } from "./search/news-articles";
export { searchNewsStories } from "./search/news-stories";
export { searchJournalists } from "./search/journalists";
export { searchSources } from "./search/sources";
export { searchPeople } from "./search/people";
export { searchCompanies } from "./search/companies";
export { searchTopics } from "./search/topics";
export { searchWikipedia } from "./search/wikipedia";
export { searchVectorWikipedia } from "./search/wikipedia-vector";

// Export use-case tool functions
export { getCompanyNews } from "./use-cases/company-news";
export { getPersonNews } from "./use-cases/person-news";
export { getTopHeadlines } from "./use-cases/top-headlines";
export { getLocationNews } from "./use-cases/location-news";

// Export argument schemas for external use
export { newsArticlesArgs } from "./search/news-articles";
export { newsStoriesArgs } from "./search/news-stories";
export { journalistsArgs } from "./search/journalists";
export { sourcesArgs } from "./search/sources";
export { peopleArgs } from "./search/people";
export { companiesArgs } from "./search/companies";
export { topicsArgs } from "./search/topics";
export { wikipediaArgs } from "./search/wikipedia";
export { wikipediaVectorArgs } from "./search/wikipedia-vector";

// Export use-case argument schemas
export { companyNewsArgs } from "./use-cases/company-news";
export { personNewsArgs } from "./use-cases/person-news";
export { topHeadlinesArgs } from "./use-cases/top-headlines";
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
import { journalistsTool } from "./search/journalists";
import { sourcesTool } from "./search/sources";
import { peopleTool } from "./search/people";
import { companiesTool } from "./search/companies";
import { topicsTool } from "./search/topics";
import { wikipediaTool } from "./search/wikipedia";
import { wikipediaVectorTool } from "./search/wikipedia-vector";
import { companyNewsTool } from "./use-cases/company-news";
import { personNewsTool } from "./use-cases/person-news";
import { topHeadlinesTool } from "./use-cases/top-headlines";
import { locationNewsTool } from "./use-cases/location-news";
import { ToolDefinition } from "./types";

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
  search_journalists: journalistsTool,
  search_sources: sourcesTool,
  search_people: peopleTool,
  search_companies: companiesTool,
  search_topics: topicsTool,
  search_wikipedia: wikipediaTool,
  search_vector_wikipedia: wikipediaVectorTool,

  // Use-case tools
  get_company_news: companyNewsTool,
  get_person_news: personNewsTool,
  get_top_headlines: topHeadlinesTool,
  get_location_news: locationNewsTool,
} as const;

/**
 * Type-safe tool name enumeration
 */
export type ToolName = keyof typeof TOOL_DEFINITIONS;
