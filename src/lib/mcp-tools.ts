export type McpToolCategory =
  | "search"
  | "stats"
  | "use-cases"
  | "monitors"
  | "entitlements"
  | "platform"
  | "signal-insights";

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

  // ── Monitor tools ─────────────────────────────────────────────────────────
  {
    name: "list_monitors",
    label: "List Monitors",
    description:
      "List and search your Perigon monitors to discover UUIDs, statuses, or find monitors by name or classification.",
    category: "monitors",
  },
  {
    name: "get_monitor",
    label: "Get Monitor",
    description:
      "Retrieve the complete configuration for one monitor by UUID, including its query, schema, schedule, and delivery contact points.",
    category: "monitors",
  },
  {
    name: "get_monitor_events",
    label: "Get Monitor Events",
    description:
      "Retrieve structured matches emitted by an EVENT or MENTIONS monitor, with extracted schema data and matched entities.",
    category: "monitors",
  },
  {
    name: "get_monitor_newsletters",
    label: "Get Monitor Newsletters",
    description:
      "Retrieve scheduled briefings generated by a TOPIC monitor, with newsletter content and citations.",
    category: "monitors",
  },
  {
    name: "get_monitor_summaries",
    label: "Get Monitor Summaries",
    description:
      "Retrieve the rolling history of AI-generated summaries produced as a monitor processes matching content.",
    category: "monitors",
  },
  {
    name: "create_monitor",
    label: "Create Monitor",
    description:
      "Create a new monitor for continuously detecting events, mentions, or scheduled topic briefings.",
    category: "monitors",
  },
  {
    name: "update_monitor",
    label: "Update Monitor",
    description:
      "Partially update a monitor's query, schema, schedule, entity groups, or contact points.",
    category: "monitors",
  },
  {
    name: "set_monitor_status",
    label: "Set Monitor Status",
    description:
      "Activate, pause, or archive a monitor's lifecycle. Archiving cannot be reversed through the public API.",
    category: "monitors",
  },

  // ── Entitlements ──────────────────────────────────────────────────────────
  {
    name: "get_api_access",
    label: "Get API Access",
    description:
      "Report this API key's scopes, organization, usage quota, and the entitlement behavior those scopes imply.",
    category: "entitlements",
  },

  // ── Platform tools ────────────────────────────────────────────────────────
  {
    name: "get_source_by_id",
    label: "Get Source by ID",
    description:
      "Look up one news source by its exact ID or domain for full detail — paywall status, alt names, and location.",
    category: "platform",
  },
  {
    name: "get_top_topics",
    label: "Top Topics (Trending)",
    description:
      "Identify topics whose news coverage is spiking relative to a baseline period.",
    category: "platform",
  },
  {
    name: "get_story_stats",
    label: "Story Stats",
    description:
      "Get story-level (clustered headline) publication volume or velocity over time.",
    category: "platform",
  },
  {
    name: "watchlists",
    label: "Watchlists",
    description:
      "List, get by ID, or resolve by name your organization's watchlists of people and companies.",
    category: "platform",
  },
  {
    name: "create_watchlist",
    label: "Create Watchlist",
    description: "Create a new watchlist of people and/or companies.",
    category: "platform",
  },
  {
    name: "update_watchlist",
    label: "Update Watchlist",
    description: "Partially update an existing watchlist's name, description, people, or companies.",
    category: "platform",
  },
  {
    name: "source_groups",
    label: "Source Groups",
    description:
      "List, get by ID, or resolve by name your organization's custom source-group bundles.",
    category: "platform",
  },
  {
    name: "create_source_group",
    label: "Create Source Group",
    description: "Create a new custom source group — a curated bundle of publisher domains.",
    category: "platform",
  },
  {
    name: "update_source_group",
    label: "Update Source Group",
    description: "Partially update an existing source group's name, description, or domains.",
    category: "platform",
  },
  {
    name: "contact_points",
    label: "Contact Points",
    description:
      "List or get by UUID your organization's contact points — email or webhook delivery channels for monitor notifications.",
    category: "platform",
  },
  {
    name: "article_refresh",
    label: "Article Refresh Status",
    description:
      "Check the status of a background article-refresh job, or peek cached refresh data for up to 100 article IDs.",
    category: "platform",
  },

  // ── Signal Insights tools ─────────────────────────────────────────────────
  {
    name: "signal_insights_create_workspace",
    label: "Create Insights Workspace",
    description:
      "Create a new Signal Insights analysis workspace. Call this once at the start of a conversation before using any analysis tools.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_search_signals",
    label: "Search Signals",
    description:
      "Search for signals by name or monitoring objective. Use to find relevant signals before exporting or analyzing data.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_read_signal",
    label: "Read Signal",
    description:
      "Get full signal metadata including classificationType, schema (EVENT/MENTIONS), or newsletterCount (TOPIC).",
    category: "signal-insights",
  },
  {
    name: "signal_insights_list_newsletters",
    label: "List Newsletters",
    description:
      "List newsletters/briefings for a TOPIC signal with title and short excerpt. EVENT/MENTIONS signals will error.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_read_newsletter",
    label: "Read Newsletter",
    description:
      "Fetch a full newsletter by UUID as markdown (YAML frontmatter + body) for context or analysis.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_export_events",
    label: "Export Signal Events",
    description:
      "Export signal events using a structured query API with filters, aggregations, and ordering. EVENT/MENTIONS only.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_execute_code",
    label: "Execute Code",
    description:
      "Execute Python code in a persistent sandboxed IPython kernel. Pre-installed: pandas, numpy, matplotlib, scikit-learn, and more.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_preview_chart",
    label: "Preview Chart",
    description:
      "Render a chart to the user in the interactive chart viewer. Runs plotting code in the same kernel as Execute Code.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_shell",
    label: "Run Shell Command",
    description:
      "Run a bash command in the E2B sandbox. Working directory is /home/user/workspace.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_list_files",
    label: "List Workspace Files",
    description:
      "List files in a directory of the sandbox workspace. Defaults to the workspace root.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_read_file",
    label: "Read Workspace File",
    description:
      "Read a file from the sandbox workspace. Supports offset and limit for large files.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_write_file",
    label: "Write Workspace File",
    description:
      "Write content to a file in the sandbox workspace. Creates directories as needed.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_grep",
    label: "Grep Workspace File",
    description:
      "Search a file's contents for lines matching a regex pattern. Returns matching lines with line numbers.",
    category: "signal-insights",
  },
  {
    name: "signal_insights_str_replace",
    label: "String Replace in File",
    description:
      "Find and replace a string in a file in the sandbox workspace.",
    category: "signal-insights",
  },
];

export const ALL_TOOL_NAMES: string[] = MCP_TOOLS.map((t) => t.name);

export const TOOL_COUNT = MCP_TOOLS.length;

export const CATEGORY_LABELS: Record<McpToolCategory, string> = {
  search: "Search Tools",
  stats: "Stats & Analytics Tools",
  "use-cases": "Use-case Tools",
  monitors: "Monitor Tools",
  entitlements: "Entitlement Tools",
  platform: "Platform Tools",
  "signal-insights": "Signal Insights Tools",
};

export function getToolsByCategory(category: McpToolCategory): McpToolMeta[] {
  return MCP_TOOLS.filter((t) => t.category === category);
}
