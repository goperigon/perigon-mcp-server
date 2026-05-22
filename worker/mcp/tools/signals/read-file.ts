import { SignalToolDefinition } from "./types";
import { readFileSchema } from "./schemas";
import { executeCodeTool } from "./execute-code";

export const readFileTool = {
  name: "signal_insights_read_file",
  description:
    "Read a file from the sandbox workspace. " +
    "Internally, this reads the full file into memory. " +
    `Use on files up to a few MB; for larger files, use ${executeCodeTool.name} directly instead.`,
  parameters: readFileSchema,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("read", args),
} as const satisfies SignalToolDefinition<typeof readFileSchema>;
