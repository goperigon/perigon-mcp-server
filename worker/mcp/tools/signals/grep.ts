import { SignalToolDefinition } from "./types";
import { grepSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";

export const grepTool = {
  name: "signal_insights_grep",
  description:
    "Return a file's lines matching a regex, with line numbers. " +
    `For files over a few MB use ${executeCodeTool.name}.`,
  parameters: grepSchema,
  annotations: {
    title: "Search Insights files",
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("grep", args),
} as const satisfies SignalToolDefinition<typeof grepSchema>;
