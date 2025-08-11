/**
 * Perigon MCP Server Tools - Legacy Export File
 * 
 * This file maintains backward compatibility by re-exporting all tools
 * from the new refactored structure. The actual tool implementations
 * have been moved to individual files in the tools/ directory.
 * 
 * @deprecated This file exists for backward compatibility.
 * Import directly from tools/index.ts for new code.
 */

// Re-export everything from the new tools structure
export * from "./tools/index";

// Maintain legacy export names for backward compatibility
export {
  newsArticlesArgs as articleArgs,
  newsStoriesArgs as searchStoriesArgs,
  journalistsArgs as journalistArgs,
  sourcesArgs as sourceArgs,
  peopleArgs,
  companiesArgs as companyArgs,
  topicsArgs as topicArgs,
  wikipediaArgs,
  wikipediaVectorArgs,
} from "./tools/index";
