import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Scopes } from "../types/types";
import { TOOL_DEFINITIONS, ToolName } from "./tools";
import { Perigon } from "../lib/perigon";

export type Props = {
  apiKey: string;
  scopes: Scopes[];
};

// Map scopes to tool names
const SCOPE_TO_TOOLS: Partial<Record<Scopes, ToolName>> = {
  [Scopes.CLUSTERS]: "search_news_stories,get_top_headlines,get_location_news",
  [Scopes.JOURNALISTS]: "search_journalists",
  [Scopes.SOURCES]: "search_sources",
  [Scopes.PEOPLE]: "search_people,get_person_news",
  [Scopes.COMPANIES]: "search_companies,get_company_news",
  [Scopes.TOPICS]: "search_topics",
  [Scopes.WIKIPEDIA]: "search_wikipedia",
  [Scopes.VECTOR_SEARCH_WIKIPEDIA]: "search_vector_wikipedia",
};

export class PerigonMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({
    name: "Perigon News API",
    version: "1.0.0",
  });

  async init() {
    const perigon = new Perigon(this.props.apiKey);

    // Always include articles search
    const articlesDefinition = TOOL_DEFINITIONS.search_news_articles;
    this.server.tool(
      articlesDefinition.name,
      articlesDefinition.description,
      articlesDefinition.parameters.shape,
      articlesDefinition.createHandler(perigon)
    );

    // Add tools based on scopes
    for (const scope of this.props.scopes) {
      if (!scope) continue;

      const currentToolName = SCOPE_TO_TOOLS[scope];
      if (!currentToolName) continue;

      const toolsNames = currentToolName?.includes(",")
        ? currentToolName.split(",")
        : [currentToolName];

      if (toolsNames) {
        for (const toolName of toolsNames) {
          const definition = TOOL_DEFINITIONS[toolName as ToolName];
          this.server.tool(
            definition.name,
            definition.description,
            definition.parameters.shape,
            definition.createHandler(perigon)
          );
        }
      }
    }
  }
}
