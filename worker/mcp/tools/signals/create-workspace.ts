import { SignalToolDefinition } from "./types";
import { createWorkspaceSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";
import { shellTool } from "./shell";
import { exportEventsTool } from "./export-events";

export const createWorkspaceTool = {
  name: "signal_insights_create_workspace",
  description:
    "Create a Signal Insights workspace, ONCE per conversation that needs analysis. " +
    `Returns the workspace ID required by ${exportEventsTool.name}, ${executeCodeTool.name}, ${shellTool.name}, and the file tools. ` +
    "Never invent workspace IDs.",
  parameters: createWorkspaceSchema,
  annotations: {
    title: "Initialize Insights analysis",
    readOnlyHint: false,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler: (_insightsApi, pokeyClient) => async () =>
    pokeyClient.createWorkspace(),
} as const satisfies SignalToolDefinition<typeof createWorkspaceSchema>;
