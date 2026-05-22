import { SignalToolDefinition } from "./types";
import { strReplaceSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";

export const strReplaceTool = {
  name: "signal_insights_str_replace",
  description:
    "Find and replace a string in a file in the sandbox workspace. " +
    "Internally, this reads the full file into memory. " +
    `Use on files up to a few MB; for larger files, use ${executeCodeTool.name} directly instead.`,
  parameters: strReplaceSchema,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("str_replace", args),
} as const satisfies SignalToolDefinition<typeof strReplaceSchema>;
