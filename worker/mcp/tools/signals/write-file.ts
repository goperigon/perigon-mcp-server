import { SignalToolDefinition } from "./types";
import { writeFileSchema } from "./schemas";

export const writeFileTool = {
  name: "signal_insights_write_file",
  description:
    "Write content to a file in the sandbox workspace. Creates directories as needed.",
  parameters: writeFileSchema,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("write", args),
} as const satisfies SignalToolDefinition<typeof writeFileSchema>;
