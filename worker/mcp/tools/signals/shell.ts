import { WORKSPACE_DIR, DATA_DIR } from "../../constants";
import { SignalToolDefinition } from "./types";
import { shellSchema } from "./schemas";

export const shellTool = {
  name: "signal_insights_shell",
  description:
    `Run a bash command in the sandbox. Working directory: ${WORKSPACE_DIR}; export files: ${DATA_DIR}. ` +
    "No internet except *.amazonaws.com.",
  parameters: shellSchema,
  annotations: {
    title: "Insights shell",
    readOnlyHint: false,
    openWorldHint: true,
    destructiveHint: true,
  },
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("shell", args),
} as const satisfies SignalToolDefinition<typeof shellSchema>;
