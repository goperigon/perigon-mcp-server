import { SignalToolDefinition } from "./types";
import { grepSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";

export const grepTool = {
  name: "signal_insights_grep",
  description:
    "Search a file's contents for lines matching a regex pattern. " +
    "Reads the file via the SDK (no shell injection risk). Returns matching lines with line numbers. " +
    `Use on files up to a few MB; for larger files, use ${executeCodeTool.name} directly instead.`,
  parameters: grepSchema,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("grep", args),
} as const satisfies SignalToolDefinition<typeof grepSchema>;
