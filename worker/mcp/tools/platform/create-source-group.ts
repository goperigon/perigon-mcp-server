import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const createSourceGroupArgs = z.object({
  name: z.string().describe("Unique source group name within the organization."),
  displayName: z.string().optional(),
  description: z.string().optional(),
  domains: z
    .array(z.string())
    .min(1)
    .max(5000)
    .describe("Publisher domains to include (1-5000)."),
});

export function createSourceGroup(
  perigon: Perigon,
): ToolCallback<typeof createSourceGroupArgs> {
  return async (
    args: z.infer<typeof createSourceGroupArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result = await perigon.createSourceGroup(args);
      return toolResult(
        `Created source group ${result.data.id} ("${result.data.name}") with ${result.data.domains.length} domains.`,
      );
    } catch (error) {
      console.error("Error creating source group:", error);
      return toolResult(
        `Error: Failed to create source group: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const createSourceGroupTool = {
  name: "create_source_group",
  title: "Create source group",
  description:
    "Create a new custom source group (a curated bundle of publisher domains) usable via the sourceGroup filter. Only use this when the user explicitly asks to create one.",
  parameters: createSourceGroupArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => createSourceGroup(perigon),
} satisfies ToolDefinition<typeof createSourceGroupArgs>;
