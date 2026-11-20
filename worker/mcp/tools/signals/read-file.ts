import { SignalToolDefinition } from "./types";
import { readFileSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";

export const readFileTool = {
  name: "signal_insights_read_file",
  description:
    "Read a file from the sandbox workspace. " +
    `Loads the whole file; for files over a few MB use ${executeCodeTool.name}.`,
  parameters: readFileSchema,
  annotations: {
    title: "Read Insights file",
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("read", args),
} as const satisfies SignalToolDefinition<typeof readFileSchema>;
