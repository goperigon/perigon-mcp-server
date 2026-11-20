import { SignalToolDefinition } from "./types";
import { strReplaceSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";

export const strReplaceTool = {
  name: "signal_insights_str_replace",
  description:
    "Find and replace a string in a file in the sandbox workspace. " +
    `Loads the whole file; for files over a few MB use ${executeCodeTool.name}.`,
  parameters: strReplaceSchema,
  annotations: {
    title: "Edit Insights file",
    readOnlyHint: false,
    openWorldHint: false,
    destructiveHint: true,
  },
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("str_replace", args),
} as const satisfies SignalToolDefinition<typeof strReplaceSchema>;
