import { WORKSPACE_DIR, DATA_DIR } from "../../constants";
import { SignalToolDefinition } from "./types";
import { shellSchema } from "./schemas";

export const shellTool = {
  name: "signal_insights_shell",
  description:
    "Run a bash command in the E2B sandbox environment. " +
    `Working directory is ${WORKSPACE_DIR}. ` +
    `Query data files are accessible at ${DATA_DIR}. No internet access except *.amazonaws.com.`,
  parameters: shellSchema,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("shell", args),
} as const satisfies SignalToolDefinition<typeof shellSchema>;
