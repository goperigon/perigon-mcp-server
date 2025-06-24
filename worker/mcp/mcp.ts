import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { Scopes } from "../types/types";
import { TOOL_DEFINITIONS, ToolName } from "./tools";

type Bindings = Env;

type Props = {
  apiKey: string;
  scopes: Scopes[];
};

type State = null;

// Map scopes to tool names
const SCOPE_TO_TOOLS: Partial<Record<Scopes, ToolName>> = {
  [Scopes.CLUSTERS]: "read_news_stories",
  [Scopes.JOURNALISTS]: "search_journalists",
  [Scopes.SOURCES]: "search_sources",
  [Scopes.PEOPLE]: "search_people",
  [Scopes.COMPANIES]: "search_companies",
};

export class PerigonMCP extends McpAgent<Bindings, State, Props> {
  server = new McpServer({
    name: "Perigon News API",
    version: "1.0.0",
  });

  async init() {
    const perigon = new V1Api(
      new Configuration({
        apiKey: this.props.apiKey,
      }),
    );

    // Always include articles search
    const articlesDefinition = TOOL_DEFINITIONS.search_news_articles;
    this.server.tool(
      articlesDefinition.name,
      articlesDefinition.description,
      articlesDefinition.parameters.shape,
      articlesDefinition.createHandler(perigon),
    );

    // Add tools based on scopes
    for (const scope of this.props.scopes) {
      const toolName = SCOPE_TO_TOOLS[scope];
      if (toolName) {
        const definition = TOOL_DEFINITIONS[toolName];
        this.server.tool(
          definition.name,
          definition.description,
          definition.parameters.shape,
          definition.createHandler(perigon),
        );
      }
    }
  }
}
