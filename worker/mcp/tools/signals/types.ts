import { z } from "zod";
import { InsightsApiClient } from "../../../lib/insights-api-client";
import { PokeyInsightsClient } from "../../../lib/pokey-insights-client";
import { ToolCallback } from "../types";

export interface SignalToolDefinition<T extends z.ZodObject<any>> {
  name: string;
  description: string;
  parameters: T;
  /**
   * Output schema for tools that return `structuredContent`. REQUIRED for MCP
   * Apps tools: hosts (Claude Desktop) only forward `structuredContent` to the
   * UI widget when the tool advertises an `outputSchema` — without it the host
   * drops it (`structured_content: null`) and the widget renders nothing.
   */
  outputSchema?: z.ZodObject<z.ZodRawShape>;
  _meta?: Record<string, unknown>;
  createHandler: (
    insightsApi: InsightsApiClient,
    pokeyClient: PokeyInsightsClient,
  ) => ToolCallback<T>;
}
