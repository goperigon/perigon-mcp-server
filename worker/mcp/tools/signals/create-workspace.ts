import { SignalToolDefinition } from "./types";
import { createWorkspaceSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";
import { shellTool } from "./shell";
import { exportEventsTool } from "./export-events";

export const createWorkspaceTool = {
  name: "signal_insights_create_workspace",
  description:
    "Create a new Signal Insights analysis workspace. " +
    "Call this ONCE at the beginning of any conversation that needs data analysis. " +
    `Returns a workspace handle required by all analysis tools (${executeCodeTool.name}, ${shellTool.name}, ${exportEventsTool.name}, file tools). ` +
    "Do NOT invent workspace IDs — always use the one returned here.",
  parameters: createWorkspaceSchema,
  createHandler: (_insightsApi, pokeyClient) => async () =>
    pokeyClient.createWorkspace(),
} as const satisfies SignalToolDefinition<typeof createWorkspaceSchema>;
