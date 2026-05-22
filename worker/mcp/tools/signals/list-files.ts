import { WORKSPACE_DIR } from "../../constants";
import { SignalToolDefinition } from "./types";
import { listFilesSchema } from "./schemas";

export const listFilesTool = {
  name: "signal_insights_list_files",
  description:
    "List files in a directory of the sandbox workspace. " +
    `Default directory is the workspace root (${WORKSPACE_DIR}).`,
  parameters: listFilesSchema,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("list", args),
} as const satisfies SignalToolDefinition<typeof listFilesSchema>;
