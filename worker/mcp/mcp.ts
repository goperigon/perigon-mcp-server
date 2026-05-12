import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Scopes } from "../types/types";
import { TOOL_DEFINITIONS, type ToolName } from "./tools";
import { Perigon } from "../lib/perigon";
import { resolveActiveTools } from "./tools/selection";

export type Props = {
  apiKey: string;
  scopes: Scopes[];
  requestedTools: ToolName[] | null;
};

// Map scopes to tool names
const SCOPE_TO_TOOLS: Partial<Record<Scopes, ToolName[]>> = {
  [Scopes.CLUSTERS]: ["search_news_stories", "search_story_history"],
  [Scopes.SEARCH_SUMMARY]: ["summarize_news"],
  [Scopes.JOURNALISTS]: ["search_journalists"],
  [Scopes.SOURCES]: ["search_sources"],
  [Scopes.PEOPLE]: ["search_people", "get_person_news"],
  [Scopes.COMPANIES]: ["search_companies", "get_company_news"],
  [Scopes.TOPICS]: ["search_topics"],
  [Scopes.LOCATIONS]: ["get_location_news"],
  [Scopes.WIKIPEDIA]: ["search_wikipedia"],
  [Scopes.VECTOR_SEARCH_NEWS]: ["search_vector_news"],
  [Scopes.VECTOR_SEARCH_WIKIPEDIA]: ["search_vector_wikipedia"],
};

/**
 * Returns a deduplicated list of tool names permitted by the given API key
 * scopes. `search_news_articles` is always included regardless of scope.
 */
function getAllowedToolsForScopes(scopes: Scopes[]): ToolName[] {
  const seen = new Set<ToolName>(["search_news_articles"]);
  for (const scope of scopes) {
    if (!scope) continue;
    const toolNames = SCOPE_TO_TOOLS[scope];
    if (!toolNames) continue;
    for (const name of toolNames) {
      seen.add(name);
    }
  }
  return [...seen];
}

export class PerigonMCP extends McpAgent<Env, unknown, Props> {
  // Type assertion needed: agents bundles its own @modelcontextprotocol/sdk copy
  server = new McpServer({
    name: "Perigon News API",
    version: "1.0.0",
  }) as any;

  async init() {
    const perigon = new Perigon(this.props!.apiKey);
    const { scopes, requestedTools } = this.props!;

    const allowedTools = getAllowedToolsForScopes(scopes);
    const activeTools = resolveActiveTools(allowedTools, requestedTools);

    for (const toolName of activeTools) {
      const definition = TOOL_DEFINITIONS[toolName];
      this.server.tool(
        definition.name,
        definition.description,
        definition.parameters.shape,
        definition.createHandler(perigon)
      );
    }
  }
}
