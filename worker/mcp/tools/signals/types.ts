import { z } from "zod";
import { InsightsApiClient } from "../../../lib/insights-api-client";
import { PokeyInsightsClient } from "../../../lib/pokey-insights-client";
import { ToolCallback } from "../types";

export interface SignalToolDefinition<T extends z.ZodObject<any>> {
  name: string;
  description: string;
  parameters: T;
  _meta?: Record<string, unknown>;
  createHandler: (
    insightsApi: InsightsApiClient,
    pokeyClient: PokeyInsightsClient,
  ) => ToolCallback<T>;
}
