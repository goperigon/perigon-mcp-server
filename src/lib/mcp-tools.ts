export type McpToolCategory = "search" | "stats" | "use-cases";

export interface McpToolMeta {
  name: string;
  label: string;
  description: string;
  category: McpToolCategory;
}

export const MCP_TOOLS: McpToolMeta[] = [
  // ── Search tools ──────────────────────────────────────────────────────────
  {
    name: "search_news_articles",
    label: "Search News Articles",
    description:
      "Search and filter individual news articles from 200k+ global sources by keyword, topic, source, location, sentiment, or time range. Supports Boolean query syntax.",
    category: "search",
  },
  {
    name: "search_news_stories",
    label: "Search News Stories",
    description:
      "Search clustered news stories that group related articles across multiple sources into a single narrative. Returns story summaries, sentiment analysis, and article counts.",
    category: "search",
  },
  {
    name: "search_story_history",
    label: "Search Story History",
    description:
      "Track how a news story has evolved over time with timestamped snapshots, summaries, key points, and changelogs.",
    category: "search",
  },
  {
    name: "search_vector_news",
    label: "Semantic News Search",
    description:
      "Semantic search over recent news using natural language and vector embeddings — ideal for conceptual or conversational queries instead of exact keywords.",
    category: "search",
  },
  {
    name: "summarize_news",
    label: "Summarize News",
    description:
      "Generate an AI-powered summary of news coverage matching your filters, with supporting article citations and configurable summarization controls.",
    category: "search",
  },
  {
    name: "search_journalists",
    label: "Search Journalists",
    description:
      "Search 230k+ journalist and reporter profiles by name, publication, topic, region, or posting activity.",
    category: "search",
  },
  {
    name: "search_sources",
    label: "Search Sources",
    description:
      "Search 200k+ news publications and media outlets by name, domain, location, audience size, or publishing volume.",
    category: "search",
  },
  {
    name: "search_people",
    label: "Search People",
    description:
      "Search 650k+ public figures, politicians, celebrities, and executives for biographical information by name or occupation.",
    category: "search",
  },
  {
    name: "search_companies",
    label: "Search Companies",
    description:
      "Search corporations and businesses by name, industry, stock ticker, or domain for company profiles and metadata.",
    category: "search",
  },
  {
    name: "search_topics",
    label: "Search Topics",
    description:
      "Browse and search the Perigon topic taxonomy to discover available topic filters for use in other search tools.",
    category: "search",
  },
  {
    name: "search_wikipedia",
    label: "Search Wikipedia",
    description:
      "Search Wikipedia pages with keyword queries for factual background, encyclopedia-style lookups, or structured Wikipedia data.",
    category: "search",
  },
  {
    name: "search_vector_wikipedia",
    label: "Semantic Wikipedia Search",
    description:
      "Semantic search over Wikipedia using natural language and vector embeddings — finds pages by meaning even without exact keyword matches.",
    category: "search",
  },

  // ── Stats tools ───────────────────────────────────────────────────────────
  {
    name: "get_avg_sentiment",
    label: "Average Sentiment",
    description:
      "Get average sentiment scores (positive, negative, neutral) bucketed over time for articles matching your filters.",
    category: "stats",
  },
  {
    name: "get_article_counts",
    label: "Article Counts",
    description:
      "Get article publication volume bucketed over time to analyze coverage trends by hour, day, week, or month.",
    category: "stats",
  },
  {
    name: "get_top_entities",
    label: "Top Entities",
    description:
      "Get the most frequently mentioned topics, people, companies, cities, or sources in articles matching your filters.",
    category: "stats",
  },
  {
    name: "get_top_people",
    label: "Top People (Trending)",
    description:
      "Identify people whose news coverage is spiking — mentioned significantly more in a recent window than a prior baseline period.",
    category: "stats",
  },
  {
    name: "get_top_companies",
    label: "Top Companies (Trending)",
    description:
      "Identify companies whose news coverage is spiking relative to a baseline period. Returns spike scores and mention counts.",
    category: "stats",
  },

  // ── Use-case tools ────────────────────────────────────────────────────────
  {
    name: "get_company_news",
    label: "Get Company News",
    description:
      "Quick shortcut to get recent news about a specific company by name. Looks up company details then finds recent articles automatically.",
    category: "use-cases",
  },
  {
    name: "get_person_news",
    label: "Get Person News",
    description:
      "Quick shortcut to get recent news about a specific person by name. Looks up the person's profile then finds recent articles automatically.",
    category: "use-cases",
  },
  {
    name: "get_location_news",
    label: "Get Location News",
    description:
      "Quick shortcut to get recent news for a geographic location — city, state, or country. Auto-detects location type and applies the right filters.",
    category: "use-cases",
  },
];

export const ALL_TOOL_NAMES: string[] = MCP_TOOLS.map((t) => t.name);

export const TOOL_COUNT = MCP_TOOLS.length;

export const CATEGORY_LABELS: Record<McpToolCategory, string> = {
  search: "Search Tools",
  stats: "Stats & Analytics Tools",
  "use-cases": "Use-case Tools",
};

export function getToolsByCategory(category: McpToolCategory): McpToolMeta[] {
  return MCP_TOOLS.filter((t) => t.category === category);
}
